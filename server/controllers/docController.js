const supabase = require('../config/db');
const fs = require('fs');

const uploadDoc = async (req, res) => {
  if (!req.file)
    return res.status(400).json({ message: 'No file uploaded' });

  const { originalname, filename, path: filePath, size } = req.file;

  const { data: doc, error } = await supabase
    .from('documents')
    .insert({
      user_id: req.user.id,
      name: filename,
      original_name: originalname,
      file_path: filePath.replace(/\\/g, '/'),
      size,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    fs.unlinkSync(req.file.path);
    return res.status(500).json({ message: error.message });
  }

  res.status(201).json(doc);
};

const getDocs = async (req, res) => {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('user_id', req.user.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ message: error.message });

  res.json(data);
};

const getDoc = async (req, res) => {
  const { data: doc, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !doc)
    return res.status(404).json({ message: 'Document not found' });

  res.json(doc);
};

const deleteDoc = async (req, res) => {
  const { data: doc, error } = await supabase
    .from('documents')
    .select('file_path')
    .eq('id', req.params.id)
    .eq('user_id', req.user.id)
    .single();

  if (error || !doc)
    return res.status(404).json({ message: 'Document not found' });

  try { fs.unlinkSync(doc.file_path); } catch (_) {}

  await supabase.from('documents').delete().eq('id', req.params.id);

  res.json({ message: 'Document deleted' });
};

module.exports = { uploadDoc, getDocs, getDoc, deleteDoc };
