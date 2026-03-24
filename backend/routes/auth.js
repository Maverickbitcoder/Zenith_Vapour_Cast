const express = require('express')
const bcrypt = require('bcrypt');
const z = require('zod');
const jwt = require('jsonwebtoken');
const {Pool} = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const router = express.Router()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// ceating `users` table if it doesn't exist
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Users table ready.');
  }catch(error){console.error('Error creating users table:', error);}
})();

const loginFormSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  action: z.enum(['login', 'signup']),
  username: z.string().min(3).max(50).optional(), // Only required for signup
});

const JWT_SECRET = process.env.JWT_SECRET
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

router.post('/', express.urlencoded({ extended: true }), async (req,res)=>{
    try{
        const { email, password, action, username } = req.body;
        
        // validating with zod
        const parsed = loginFormSchema.safeParse({ email, password, action, username });
        if (!parsed.success) {
        return res.status(400).json({
            errors: parsed.error.flatten().fieldErrors,
            message: ['Validation failed'],
        });
        }

        if (action === 'signup') {
            // if email or username already exists
            const existingUser = await pool.query(
                `SELECT * FROM users WHERE email = $1 OR username = $2`,
                [email, username]
            );
            if (existingUser.rows.length > 0){return res.status(400).json({ message: ['Email or username already taken'] });}
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await pool.query(
                `INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, email, username`,
                [username, email, hashedPassword]
            );
            const user = result.rows[0];
            if(!user){return res.status(500).json({ message: ['Signup failed. Try again.'] });}
            const token = generateToken(user);
            return res.json({ message: ['Signup successful'], user, token });
        }
        if (action === 'login') {
            const result = await pool.query(`SELECT * FROM users WHERE email = $1`, [email]);
            const user = result.rows[0];
            if(!user){return res.status(400).json({ message: ['User not found'] });}
            const passwordMatch = await bcrypt.compare(password, user.password_hash);
            if(!passwordMatch){return res.status(400).json({ message: ['Invalid password'] });}
            const token = generateToken(user);
            return res.json({ message: ['Login successful'], user, token });
        }
        return res.status(400).json({ message: ['Invalid action'] });
    }catch(error){
        console.error(error);
        res.status(500).json({ message: ['Internal server error'] });
    }
});

module.exports = router;