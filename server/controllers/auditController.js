const supabase = require('../config/db');

const getAuditLogs = async (req, res) => {
  const { docId } = req.params;

  // Verify document belongs to user
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id')
    .eq('id', docId)
    .eq('user_id', req.user.id)
    .single();

  if (docError || !doc)
    return res.status(404).json({ message: 'Document not found' });

  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('document_id', docId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });

  res.json(data);
};

const addAuditLog = async (document_id, action, actor_name, actor_email, ip_address) => {
  await supabase.from('audit_logs').insert({
    document_id,
    action,
    actor_name,
    actor_email,
    ip_address: ip_address || 'unknown',
  });
};

module.exports = { getAuditLogs, addAuditLog };
