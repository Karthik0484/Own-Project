import jwt from 'jsonwebtoken';

export const verifyToken = (request, response, next) => {
    let token;
    // Check Authorization header first
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
    } else if (request.cookies && request.cookies.jwt) {
        // Fallback to cookie if present
        token = request.cookies.jwt;
    }
    if (!token) return response.status(401).json({ message: 'Unauthorized: No token provided' });
    jwt.verify(token, process.env.JWT_KEY, (err, payload) => {
        if (err) return response.status(401).json({ message: 'Unauthorized: Invalid or expired token' });
        request.userId = payload.userId || payload.id; // support both userId and id
        request.user = payload;
        next();
    });
};
