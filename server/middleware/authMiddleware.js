const jwt = require('jsonwebtoken');
const supabase = require('../config/db');

const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'Not authorized, no token' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const { data: user, error } = await supabase
      .from('users')
      .select('id, name, email')
      .eq('id', decoded.id)
      .single();

    if (error || !user)
      return res.status(401).json({ message: 'Not authorized, user not found' });

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = protect;
