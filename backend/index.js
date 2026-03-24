// npm install express cors dotenv jsonwebtoken bcrypt pg zod axios
const express = require('express');
const app = express();
const cors = require('cors');
const authjs = require('./routes/auth.js')
const refreshtokenjs = require('./routes/refresh-token.js')
const pwbyjs = require('./routes/pw-by.js')
const apijs = require('./routes/api.js')

const dotenv = require('dotenv')
dotenv.config()

const PORT = process.env.PORT
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000'

// allowing reqs from frontend origin (configured via CORS_ORIGIN env var)
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true, // if using cookies or auth headers
  allowedHeaders: ['Authorization', 'Content-Type'],
}));
// allowing all origins during development
// app.use(cors());

// Middleware to parse JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// POST /api/auth -> auth.js (user auth login)
app.use('/api/auth', authjs)
// POST /api/refresh-token -> refresh-token.js
app.use('/api/refresh-token', refreshtokenjs)


// POST /api/pw/by/rinex -> pw-by.js
// POST /api/pw/by/features -> pw-by.js
// POST /api/pw/by/interpolation -> pw-by.js
app.use('/api/pw/by', pwbyjs)
app.use('/api', apijs)





app.listen(PORT, ()=>{console.log(`backend server running at http://localhost:${PORT}`)})
