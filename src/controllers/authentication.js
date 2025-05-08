const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { User } = require('../models/Users');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key'; // Use a secure key from .env

// User registration handler
const registerUser = async (req, res) => {
    console.log('Registering user:', req.body);
    // Destructure the request body to get user details
    const { first_name, last_name, username, email, phone, password } = req.body;

    if (!email && !phone) {
        return res.status(400).json({ error: req.__('errors.email_or_phone_required') });
    }

    try {
        // Check if the user already exists
        const existingUserQuery = email
            ? 'SELECT * FROM users WHERE email = $1'
            : 'SELECT * FROM users WHERE phone = $1';
        const value = email || phone;
        console.log(await bcrypt.hash("password123", 10));
        const existingUser = await pool.query(existingUserQuery, [value]);

        if (existingUser.rows.length > 0) {
            return res.status(409).json({ error: req.__('errors.user_exists') });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user using the User model
        const newUser = await User.create(pool, first_name, last_name, username, email, phone, hashedPassword);

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

        // Generate a JWT token
        const token = jwt.sign({ userId: user.id, email: user.email }, SECRET_KEY, { expiresIn: '1h' });

        // Save the token in the tokens table
        await pool.query(
            'INSERT INTO tokens (user_id, token) VALUES ($1, $2)',
            [user.id, token]
        );

        // Return user information along with the token
        const userInfo = {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            username: user.username,
            email: user.email,
            phone: user.phone,
            gender: user.gender,
            date_of_birth: user.date_of_birth,
            country: user.country,
            profile_picture: user.profile_picture,
            created_at: user.created_at,
        };

        res.status(200).json({
            message: req.__('messages.login_success'),
            token,
            user: userInfo,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: req.__('errors.login_error') });
    }
};

module.exports = {
    registerUser,
    loginUser,
};