const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fs = require('fs');
const path = require('path');
const supabase = require('../config/db');
const { addAuditLog } = require('./auditController');

const finalizeDoc = async (req, res) => {
  const { id } = req.params;

  // Get document
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (docError || !doc)
    return res.status(404).json({ message: 'Document not found' });

  // Get signatures
  const { data: signatures, error: sigError } = await supabase
    .from('signatures')
    .select('*')
    .eq('document_id', id)
    .eq('user_id', req.user.id);

  if (sigError)
    return res.status(500).json({ message: sigError.message });

  if (!signatures || signatures.length === 0)
    return res.status(400).json({ message: 'No signature fields found on this document' });

  try {
    // Load the original PDF
    const pdfBytes = fs.readFileSync(doc.file_path);
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    // Embed each signature onto the correct page
    for (const sig of signatures) {
      const pageIndex = (sig.page || 1) - 1;
      const page = pages[pageIndex];
      if (!page) continue;

      const { width, height } = page.getSize();

      // Convert percentage coordinates to PDF coordinates
      // PDF y-axis is from bottom, so we flip it
      const x = (sig.x / 100) * width;
      const y = height - (sig.y / 100) * height - (sig.height || 60);

      const boxWidth = sig.width || 200;
      const boxHeight = sig.height || 60;

      // Draw signature box border
      page.drawRectangle({
        x,
        y,
        width: boxWidth,
        height: boxHeight,
        borderColor: rgb(0.24, 0.32, 0.87),
        borderWidth: 1.5,
        color: rgb(0.94, 0.96, 1),
        opacity: 0.6,
      });

      // Draw signature name
      const safeName = req.user.name.replace(/[^\x00-\x7F]/g, '');
      page.drawText(`Signed by: ${safeName}`, {
        x: x + 8,
        y: y + boxHeight - 20,
        size: 11,
        font,
        color: rgb(0.24, 0.32, 0.87),
      });

      // Draw signed date
      const signedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      });

      page.drawText(`Signed: ${signedDate}`, {
        x: x + 8,
        y: y + 8,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    // Save signed PDF
    const signedBytes = await pdfDoc.save();
    const signedFilename = `signed-${Date.now()}-${path.basename(doc.name)}`;
    const signedPath = path.join('signed', signedFilename);
    fs.writeFileSync(signedPath, signedBytes);

    // Update document status and signed path in Supabase
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'signed',
        signed_path: signedPath.replace(/\\/g, '/'),
      })
      .eq('id', id);

    if (updateError)
      return res.status(500).json({ message: updateError.message });

    // Update all signatures status to signed
    await supabase
      .from('signatures')
      .update({ status: 'signed' })
      .eq('document_id', id);

    res.json({
      message: 'Document signed successfully',
      signed_path: signedPath.replace(/\\/g, '/'),
    });

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await addAuditLog(id, 'finalized', req.user.name, req.user.email, ip);

  } catch (err) {
    console.error('PDF finalize error:', err);
    res.status(500).json({ message: 'Failed to generate signed PDF' });
  }
};

const downloadSigned = async (req, res) => {
  const { id } = req.params;

  const { data: doc, error } = await supabase
    .from('documents')
    .select('signed_path, original_name, status')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !doc)
    return res.status(404).json({ message: 'Document not found' });

  if (doc.status !== 'signed' || !doc.signed_path)
    return res.status(400).json({ message: 'Document is not signed yet' });

  const filePath = path.resolve(doc.signed_path);

  if (!fs.existsSync(filePath))
    return res.status(404).json({ message: 'Signed file not found on server' });

  res.download(filePath, `signed-${doc.original_name}`);
};

module.exports = { finalizeDoc, downloadSigned };
