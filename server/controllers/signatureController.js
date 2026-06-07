const supabase = require('../config/db');

const createSignature = async (req, res) => {
  const { document_id, x, y, page, width, height } = req.body;

  if (!document_id || x === undefined || y === undefined)
    return res.status(400).json({ message: 'document_id, x and y are required' });

  // Verify document belongs to user
  const { data: doc, error: docError } = await supabase
    .from('documents')
    .select('id')
    .eq('id', document_id)
    .eq('user_id', req.user.id)
    .single();

  if (docError || !doc)
    return res.status(404).json({ message: 'Document not found' });

  const { data: signature, error } = await supabase
    .from('signatures')
    .insert({
      document_id,
      user_id: req.user.id,
      x,
      y,
      page: page || 1,
      width: width || 200,
      height: height || 60,
      status: 'pending',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });

  res.status(201).json(signature);
};

const getSignatures = async (req, res) => {
  const { data, error } = await supabase
    .from('signatures')
    .select('*')
    .eq('document_id', req.params.id)
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ message: error.message });

  res.json(data);
};

const updateSignature = async (req, res) => {
  const { x, y, page, width, height } = req.body;

  const { data, error } = await supabase
    .from('signatures')
    .update({ x, y, page, width, height })
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .select()
    .single();

  if (error || !data)
    return res.status(404).json({ message: 'Signature not found' });

  res.json(data);
};

const deleteSignature = async (req, res) => {
  const { error } = await supabase
    .from('signatures')
    .delete()
    .eq('id', req.params.id)
    .eq('user_id', req.user.id);

  if (error) return res.status(500).json({ message: error.message });

  res.json({ message: 'Signature removed' });
};

module.exports = { createSignature, getSignatures, updateSignature, deleteSignature };
