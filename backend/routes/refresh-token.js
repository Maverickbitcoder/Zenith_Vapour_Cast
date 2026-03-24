const express = require('express')
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/authenticateToken');

const router = express.Router()

router.post('/', authenticateToken, (req, res)=>{
    const user = req.user;
    const newToken = jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
    res.json({ token: newToken });
})


module.exports = router