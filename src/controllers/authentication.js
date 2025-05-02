const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { User } = require('../models/Users');

// User registration handler
const registerUser = async (req, res) => {
    const { email, phone, password } = req.body;

    if (!email && !phone) {
        return res.status(400).json({ error: req.__('errors.email_or_phone_required') });
    }

    try {
        // Check if the user already exists
        const existingUserQuery = email
            ? 'SELECT * FROM users WHERE email = $1'
            : 'SELECT * FROM users WHERE phone = $1';
        const value = email || phone;

        const existingUser = await pool.query(existingUserQuery, [value]);

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: req.__('errors.user_exists') });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user using the User model
        const newUser = await User.create(pool, null, email, phone, hashedPassword);

        res.status(201).json({ userId: newUser.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: req.__('errors.registration_error') });
    }
};

// User login handler
const loginUser = async (req, res) => {
    const { email, phone, password } = req.body;

    if (!email && !phone) {
        return res.status(400).json({ error: req.__('errors.email_or_phone_required') });
    }

    try {
        const query = email
            ? 'SELECT * FROM users WHERE email = $1'
            : 'SELECT * FROM users WHERE phone = $1';
        const value = email || phone;

        const result = await pool.query(query, [value]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: req.__('errors.user_not_found') });
        }

        const user = result.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ error: req.__('errors.invalid_credentials') });
        }

        res.status(200).json({ message: 'Login successful.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: req.__('errors.login_error') });
    }
};

module.exports = {
    registerUser,
    loginUser,
};