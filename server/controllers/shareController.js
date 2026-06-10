const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const fontkit = require('@pdf-lib/fontkit');
const fs = require('fs');
const path = require('path');
const supabase = require('../config/db');
const { addAuditLog } = require('./auditController');

const generateSignLink = async (req, res) => {
  const { document_id, signer_email } = req.body;

  if (!document_id || !signer_email)
    return res.status(400).json({ message: 'document_id and signer_email are required' });

  // Verify document belongs to user
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id, original_name, status')
    .eq('id', document_id)
    .eq('user_id', req.user.id)
    .single();

  if (docError || !doc)
    return res.status(404).json({ message: 'Document not found' });

  if (doc.status === 'signed')
    return res.status(400).json({ message: 'Document is already signed' });

  // Generate unique token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const { data: signingToken, error } = await supabase
    .from('signing_tokens')
    .insert({
      document_id,
      owner_id: req.user.id,
      signer_email,
      token,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });

  const signingLink = `${process.env.CLIENT_URL}/sign/${token}`;

  // Send email
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"DocSign" <${process.env.EMAIL_USER}>`,
      to: signer_email,
      subject: `You have been requested to sign: ${doc.original_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4f46e5;">Document Signature Request</h2>
          <p>Hello,</p>
          <p><strong>${req.user.name}</strong> has requested your signature on:</p>
          <p style="font-size: 18px; font-weight: bold; color: #1f2937;">${doc.original_name}</p>
          <p>This link expires in <strong>7 days</strong>.</p>
          <a href="${signingLink}"
            style="display: inline-block; background: #4f46e5; color: white;
            padding: 12px 24px; border-radius: 8px; text-decoration: none;
            font-weight: bold; margin: 16px 0;">
            View & Sign Document
          </a>
          <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
            If you did not expect this, you can ignore this email.
          </p>
        </div>
      `,
    });
  } catch (emailErr) {
    console.error('Email send failed:', emailErr.message);
    // Don't fail the request if email fails — return link anyway
  }

  res.status(201).json({
    message: 'Signing link generated',
    signing_link: signingLink,
    expires_at: expiresAt,
  });

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  await addAuditLog(document_id, 'shared', req.user.name, req.user.email, ip);
};

const getDocByToken = async (req, res) => {
  const { token } = req.params;

  const { data: signingToken, error } = await supabase
    .from('signing_tokens')
    .select('*, documents(*)')
    .eq('token', token)
    .single();

  if (error || !signingToken)
    return res.status(404).json({ message: 'Invalid or expired link' });

  if (new Date(signingToken.expires_at) < new Date())
    return res.status(400).json({ message: 'This signing link has expired' });

  if (['signed', 'rejected'].includes(signingToken.status))
    return res.status(400).json({ message: `Document already ${signingToken.status}` });

  res.json({
    document: signingToken.documents,
    signer_email: signingToken.signer_email,
    token_id: signingToken.id,
  });
};

const signByToken = async (req, res) => {
  const { token } = req.params;
  const { signer_name, action, rejection_reason } = req.body;

  if (!action || !['signed', 'rejected'].includes(action))
    return res.status(400).json({ message: 'action must be "signed" or "rejected"' });

  const { data: signingToken, error } = await supabase
    .from('signing_tokens')
    .select('*, documents(*)')
    .eq('token', token)
    .single();

  if (error || !signingToken)
    return res.status(404).json({ message: 'Invalid or expired link' });

  if (new Date(signingToken.expires_at) < new Date())
    return res.status(400).json({ message: 'This signing link has expired' });

  if (['signed', 'rejected'].includes(signingToken.status))
    return res.status(400).json({ message: `Document already ${signingToken.status}` });

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Update token status
  await supabase
    .from('signing_tokens')
    .update({
      status: action,
      ...(action === 'rejected' && rejection_reason ? { rejection_reason } : {}),
    })
    .eq('token', token);

  // If signed, generate stamped PDF
  if (action === 'signed') {
    try {
      const doc = signingToken.documents;
      const { data: signatures } = await supabase
        .from('signatures')
        .select('*')
        .eq('document_id', signingToken.document_id);

      if (signatures && signatures.length > 0) {
        const pdfBytes = fs.readFileSync(doc.file_path);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        pdfDoc.registerFontkit(fontkit);

        const cursiveFontBytes = fs.readFileSync(path.join(__dirname, '../fonts/DancingScript-Bold.ttf'));
        const fontCursive = await pdfDoc.embedFont(cursiveFontBytes);
        const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const fontNormal = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();

        const safeName = (signer_name || signingToken.signer_email).replace(/[^\x00-\x7F]/g, '');
        const safeEmail = signingToken.signer_email.replace(/[^\x00-\x7F]/g, '');
        const signedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        const signedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

        const stampColor = rgb(0.10, 0.15, 0.55);
        const stampFill = rgb(0.97, 0.97, 1.00);
        const grayMeta = rgb(0.35, 0.35, 0.35);
        const white = rgb(1, 1, 1);
        const stampW = 220;
        const stampH = 110;

        for (const sig of signatures) {
          const page = pages[(sig.page || 1) - 1];
          if (!page) continue;
          const { width: pageWidth, height: pageHeight } = page.getSize();
          const x = (sig.x / 100) * pageWidth;
          const y = pageHeight - (sig.y / 100) * pageHeight - stampH;

          page.drawRectangle({ x: x - 3, y: y - 3, width: stampW + 6, height: stampH + 6, borderColor: rgb(0.10, 0.15, 0.55), borderWidth: 0.5, color: rgb(1,1,1), opacity: 0 });
          page.drawRectangle({ x, y, width: stampW, height: stampH, color: stampFill, borderColor: stampColor, borderWidth: 2 });
          page.drawRectangle({ x: x + 4, y: y + 4, width: stampW - 8, height: stampH - 8, borderColor: stampColor, borderWidth: 0.5, opacity: 0 });
          page.drawRectangle({ x, y: y + stampH - 22, width: stampW, height: 22, color: stampColor });
          page.drawText('SIGNED BY', { x: x + stampW / 2 - 28, y: y + stampH - 15, size: 9, font: fontBold, color: white });
          page.drawText(safeName, { x: x + 10, y: y + stampH - 50, size: 26, font: fontCursive, color: stampColor });
          page.drawLine({ start: { x: x + 8, y: y + stampH - 58 }, end: { x: x + stampW - 8, y: y + stampH - 58 }, thickness: 0.8, color: stampColor, opacity: 0.4 });
          page.drawText(`Date: ${signedDate}  ${signedTime}`, { x: x + 10, y: y + stampH - 74, size: 8, font: fontBold, color: grayMeta });
          page.drawText(safeEmail, { x: x + 10, y: y + stampH - 88, size: 7.5, font: fontNormal, color: grayMeta });
        }

        const signedBytes = await pdfDoc.save();
        const signedFilename = `signed-${Date.now()}-${path.basename(doc.name)}`;
        const signedPath = path.join('signed', signedFilename);
        fs.writeFileSync(signedPath, signedBytes);

        await supabase
          .from('documents')
          .update({ status: 'signed', signed_path: signedPath.replace(/\\/g, '/') })
          .eq('id', signingToken.document_id);

        await supabase.from('signatures').update({ status: 'signed' }).eq('document_id', signingToken.document_id);

        return res.json({ message: 'Document signed successfully' });
      }
    } catch (err) {
      console.error('PDF stamp error (public sign):', err);
    }
  }

  // Update document status
  await supabase
    .from('documents')
    .update({
      status: action,
      ...(action === 'rejected' && rejection_reason ? { rejection_reason } : {}),
    })
    .eq('id', signingToken.document_id);

  // Log audit entry
  await supabase.from('audit_logs').insert({
    document_id: signingToken.document_id,
    action,
    actor_email: signingToken.signer_email,
    actor_name: signer_name || signingToken.signer_email,
    ip_address: ip,
    ...(action === 'rejected' && rejection_reason ? { notes: rejection_reason } : {}),
  });

  res.json({ message: `Document ${action} successfully` });
};

module.exports = { generateSignLink, getDocByToken, signByToken };
