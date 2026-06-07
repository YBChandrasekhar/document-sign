const supabase = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ message: 'All fields are required' });

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing)
    return res.status(400).json({ message: 'Email already registered' });

  const hashedPassword = await bcrypt.hash(password, 10);

  const { data: user, error } = await supabase
    .from('users')
    .insert({ name, email, password: hashedPassword })
    .select('id, name, email')
    .single();

  if (error) return res.status(500).json({ message: error.message });

  res.status(201).json({ token: generateToken(user.id), user });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ message: 'All fields are required' });

  const { data: user, error } = await supabase
    .from('users')
    .select('id, name, email, password')
    .eq('email', email)
    .single();

  if (error || !user)
    return res.status(401).json({ message: 'Invalid credentials' });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch)
    return res.status(401).json({ message: 'Invalid credentials' });

  const { password: _, ...userWithoutPassword } = user;
  res.json({ token: generateToken(user.id), user: userWithoutPassword });
};

module.exports = { register, login };
