<<<<<<< HEAD
=======
// middlewares/AuthMiddleware.js

>>>>>>> 5dce6386bfcc0970d75381a4c4f67b2783b49f7a
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

<<<<<<< HEAD
dotenv.config();

if (!process.env.JWT_KEY) {
  console.error('FATAL: JWT_KEY is not set in environment variables.');
  process.exit(1);
}

export const verifyToken = (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    if (!token && req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
    }
    if (!token) {
      logAuthFailure(req, 'No authentication token provided');
      return res.status(401).json({ error: 'No authentication token provided' });
    }
    const payload = jwt.verify(token, process.env.JWT_KEY);
    req.userId = payload.userId;
    next();
  } catch (err) {
    logAuthFailure(req, err.message || 'Invalid or expired token');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

function logAuthFailure(req, reason) {
  const now = new Date().toISOString();
  const origin = req.headers.origin || req.headers.referer || req.ip;
  console.warn(`[${now}] Auth failure from ${origin}: ${reason}`);
}
=======
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).send('You are not authenticated!');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
    if (err) return res.status(403).send('Token is invalid!');
    req.userId = payload.userId;
    next();
  });
};
>>>>>>> 5dce6386bfcc0970d75381a4c4f67b2783b49f7a
