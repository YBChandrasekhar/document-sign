const crypto = require('crypto');
const nodemailer = require('nodemailer');
const supabase = require('../config/db');

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

  if (signingToken.status === 'signed')
    return res.status(400).json({ message: 'Document already signed' });

  res.json({
    document: signingToken.documents,
    signer_email: signingToken.signer_email,
    token_id: signingToken.id,
  });
};

const signByToken = async (req, res) => {
  const { token } = req.params;
  const { signer_name } = req.body;

  const { data: signingToken, error } = await supabase
    .from('signing_tokens')
    .select('*, documents(*)')
    .eq('token', token)
    .single();

  if (error || !signingToken)
    return res.status(404).json({ message: 'Invalid or expired link' });

  if (new Date(signingToken.expires_at) < new Date())
    return res.status(400).json({ message: 'This signing link has expired' });

  if (signingToken.status === 'signed')
    return res.status(400).json({ message: 'Document already signed' });

  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  // Update token status
  await supabase
    .from('signing_tokens')
    .update({ status: 'signed' })
    .eq('token', token);

  // Update document status
  await supabase
    .from('documents')
    .update({ status: 'signed' })
    .eq('id', signingToken.document_id);

  // Log audit entry
  await supabase.from('audit_logs').insert({
    document_id: signingToken.document_id,
    action: 'signed',
    actor_email: signingToken.signer_email,
    actor_name: signer_name || signingToken.signer_email,
    ip_address: ip,
  });

  res.json({ message: 'Document signed successfully' });
};

module.exports = { generateSignLink, getDocByToken, signByToken };
