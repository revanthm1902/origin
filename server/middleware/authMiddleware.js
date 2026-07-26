const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  // Now we specifically look for the accessToken
  const token = req.cookies.accessToken;
  
  if (!token) return res.status(401).json({ message: 'Access Denied: No token provided' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = verified.userId; 
    next(); 
  } catch (err) {
    // We will send a 403 Forbidden to signal to the frontend that the token EXPIRED, not just missing
    res.status(403).json({ message: 'Invalid or expired token' });
  }
};

module.exports = verifyToken;