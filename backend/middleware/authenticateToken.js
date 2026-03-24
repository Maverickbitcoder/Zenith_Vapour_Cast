const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const JWT_SECRET = process.env.JWT_SECRET;

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  // First, try JWT verification
  jwt.verify(token, JWT_SECRET, async (err, user) => {
    if (err) {
      // Fallback: treat token as Google OAuth token
      try {
        const googleRes = await axios.get(
          `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`
        );
        const googleUser = googleRes.data;

        // Check if user exists in DB by email
        const result = await pool.query('SELECT id, email FROM users WHERE email = $1', [googleUser.email]);
        let dbUser = result.rows[0];

        if (!dbUser) {
          // Create new user in DB
          const insertRes = await pool.query(
            'INSERT INTO users (username, email) VALUES ($1, $2) RETURNING id, email',
            [googleUser.email.split('@')[0], googleUser.email]
          );
          dbUser = insertRes.rows[0];
        }

        // Set req.user for downstream middleware/routes
        req.user = { id: dbUser.id, email: dbUser.email };
        return next(); // success, continue processing
      } catch (googleError) {
        // Google token invalid or DB error
        return res.status(403).json({ message: 'Invalid or expired token' });
      }
    } else {
      // JWT token valid, use payload
      req.user = user;
      next();
    }
  });
}

module.exports = authenticateToken;
