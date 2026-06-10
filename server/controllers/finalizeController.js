const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const supabase = require('../config/db');
const { addAuditLog } = require('./auditController');

const finalizeDoc = async (req, res) => {
  const { id } = req.params;

  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('*')
    .eq('id', id)
    .eq('user_id', req.user.id)
    .single();

  if (docError || !doc)
    return res.status(404).json({ message: 'Document not found' });

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
    const pdfBytes = fs.readFileSync(doc.file_path);
    const pdfDoc   = await PDFDocument.load(pdfBytes);
    pdfDoc.registerFontkit(fontkit);

    // Embed custom cursive font + standard fonts
    const cursiveFontBytes = fs.readFileSync(path.join(__dirname, '../fonts/DancingScript-Bold.ttf'));
    const fontCursive = await pdfDoc.embedFont(cursiveFontBytes);
    const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontNormal  = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const pages = pdfDoc.getPages();

    const safeName   = req.user.name.replace(/[^\x00-\x7F]/g, '');
    const safeEmail  = req.user.email.replace(/[^\x00-\x7F]/g, '');
    const signedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
    const signedTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit',
    });

    // Stamp colors — deep navy/indigo
    const stampColor  = rgb(0.10, 0.15, 0.55);  // deep navy border & text
    const stampFill   = rgb(0.97, 0.97, 1.00);  // near-white fill
    const grayMeta    = rgb(0.35, 0.35, 0.35);  // date & email
    const white       = rgb(1, 1, 1);

    // Stamp dimensions
    const stampW  = 220;
    const stampH  = 110;
    const radius  = 6;
    const centerX = (sig) => (sig.x / 100);

    for (const sig of signatures) {
      const pageIndex = (sig.page || 1) - 1;
      const page = pages[pageIndex];
      if (!page) continue;

      const { width: pageWidth, height: pageHeight } = page.getSize();
      const x = (sig.x / 100) * pageWidth;
      const y = pageHeight - (sig.y / 100) * pageHeight - stampH;

      // ── STAMP OUTER BORDER (double ring effect) ──
      // Outer ring
      page.drawRectangle({
        x: x - 3, y: y - 3,
        width: stampW + 6, height: stampH + 6,
        borderColor: rgb(0.10, 0.15, 0.55),
        borderWidth: 0.5,
        color: rgb(1,1,1),
        opacity: 0,
      });
      // Main stamp box
      page.drawRectangle({
        x, y,
        width: stampW, height: stampH,
        color: stampFill,
        borderColor: stampColor,
        borderWidth: 2,
      });
      // Inner border line (double border effect)
      page.drawRectangle({
        x: x + 4, y: y + 4,
        width: stampW - 8, height: stampH - 8,
        borderColor: stampColor,
        borderWidth: 0.5,
        opacity: 0,
      });

      // ── TOP LABEL: "SIGNED BY" ──
      page.drawRectangle({
        x, y: y + stampH - 22,
        width: stampW, height: 22,
        color: stampColor,
      });
      page.drawText('SIGNED BY', {
        x: x + stampW / 2 - 28,
        y: y + stampH - 15,
        size: 9,
        font: fontBold,
        color: white,
        opacity: 1,
      });

      // ── CURSIVE SIGNATURE NAME ──
      page.drawText(safeName, {
        x: x + 10,
        y: y + stampH - 50,
        size: 26,
        font: fontCursive,
        color: stampColor,
      });

      // ── DIVIDER ──
      page.drawLine({
        start: { x: x + 8,          y: y + stampH - 58 },
        end:   { x: x + stampW - 8, y: y + stampH - 58 },
        thickness: 0.8,
        color: stampColor,
        opacity: 0.4,
      });

      // ── DATE STAMP ──
      page.drawText(`Date: ${signedDate}  ${signedTime}`, {
        x: x + 10,
        y: y + stampH - 74,
        size: 8,
        font: fontBold,
        color: grayMeta,
      });

      // ── EMAIL ──
      page.drawText(safeEmail, {
        x: x + 10,
        y: y + stampH - 88,
        size: 7.5,
        font: fontNormal,
        color: grayMeta,
      });
    }

    const signedBytes    = await pdfDoc.save();
    const signedFilename = `signed-${Date.now()}-${path.basename(doc.name)}`;
    const signedPath     = path.join('signed', signedFilename);
    fs.writeFileSync(signedPath, signedBytes);

    const { error: updateError } = await supabase
      .from('documents')
      .update({
        status: 'signed',
        signed_path: signedPath.replace(/\\/g, '/'),
      })
      .eq('id', id);

    if (updateError)
      return res.status(500).json({ message: updateError.message });

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
