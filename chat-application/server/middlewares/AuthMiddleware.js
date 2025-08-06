// middlewares/AuthMiddleware.js

import jwt from 'jsonwebtoken';

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
