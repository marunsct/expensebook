const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../db');
const { User } = require('../models/Users');
const nodemailer = require('nodemailer');
const logger = require('../middleware/logger');

const SECRET_KEY = process.env.JWT_SECRET || 'your_secret_key'; // Use a secure key from .env

// User registration handler
const registerUser = async (req, res) => {
    logger.info('Registering user', { body: req.body });
    // Destructure the request body to get user details
    const { first_name, last_name, username, email, phone, password } = req.body;

    if (!email && !phone) {
        logger.warn(req.__('errors.email_or_phone_required'));
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
            logger.warn(req.__('errors.user_exists'));
            return res.status(409).json({ error: req.__('errors.user_exists') });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create the user using the User model
        const newUser = await User.create(pool, first_name, last_name, username, email, phone, hashedPassword);

        logger.info(`User registered: ${newUser.id}`);
        res.status(201).json({ userId: newUser.id });
    } catch (error) {
        logger.error(req.__('errors.registration_error'), { error });
        res.status(500).json({ error: req.__('errors.registration_error') });
    }
};

// User login handler
const loginUser = async (req, res) => {
    const { email, phone, password } = req.body;

    if (!email && !phone) {
        logger.warn(req.__('errors.email_or_phone_required'));
        return res.status(400).json({ error: req.__('errors.email_or_phone_required') });
    }

    try {
        const query = email
            ? 'SELECT * FROM users WHERE email = $1'
            : 'SELECT * FROM users WHERE phone = $1';
        const value = email || phone;

        const result = await pool.query(query, [value]);

        if (result.rows.length === 0) {
            logger.warn(req.__('errors.user_not_found'));
            return res.status(404).json({ error: req.__('errors.user_not_found') });
        }

        const user = result.rows[0];
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            logger.warn(req.__('errors.invalid_credentials'));
            return res.status(401).json({ error: req.__('errors.invalid_credentials') });
        }

        // Generate a JWT token
        const token = jwt.sign({ userId: user.id, email: user.email }, SECRET_KEY);

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

        logger.info(`User logged in: ${user.id}`);
        res.status(200).json({
            message: req.__('messages.login_success'),
            token,
            user: userInfo,
        });
    } catch (error) {
        logger.error(req.__('errors.login_error'), { error });
        res.status(500).json({ error: req.__('errors.login_error') });
    }
};

const changePassword = async (req, res) => {
    const { userId } = req.params;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        logger.warn(req.__('errors.missing_password_fields') || 'Current password and new password are required.');
        return res.status(400).json({ error: req.__('errors.missing_password_fields') || 'Current password and new password are required.' });
    }

    try {
        const result = await User.changePassword(pool, userId, currentPassword, newPassword);
        logger.info(`Password changed for userId=${userId}`);
        res.status(200).json(result);
    } catch (error) {
        logger.error(req.__('errors.change_password_error') || 'Error changing password', { error });
        res.status(500).json({ error: req.__('errors.change_password_error') || 'Error changing password.' });
    }
};

const inviteUserByEmail = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        logger.warn(req.__('errors.email_required') || 'Email is required.');
        return res.status(400).json({ error: req.__('errors.email_required') || 'Email is required.' });
    }

    try {
        // Generate a random 5-digit password
        const randomPassword = Math.floor(10000 + Math.random() * 90000).toString();

        // Hash the random password
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        // Check if the user already exists or create an invited user
        const invitedUser = await User.createInvitedUser(pool, email, hashedPassword);

        // Email server Configuration
        const smtpConfig = {
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        };
       
        // Send an email to the invited user
        const transporter = nodemailer.createTransport(smtpConfig);
        console.log('SMTP CONFiG', smtpConfig);
        const mailOptions = {
            from: process.env.SMTP_SENDER,
            to: email,
            subject: `You’ve been invited to ExpenseBook!`,
            text: `Your friends have invited you to use ExpenseBook for managing your expenses. Use the temporary password "${randomPassword}" to log in and set up your account.`,
        };

        await transporter.sendMail(mailOptions);

        logger.info(`Invitation sent to ${email}`);
        res.status(200).json({
            message: req.__('messages.invitation_sent_successfully') || 'Invitation sent successfully.',
            invitedUser,
        });
    } catch (error) {
        logger.error(req.__('errors.invite_user_error') || 'Error inviting user', { error });
        res.status(500).json({ error: req.__('errors.invite_user_error') || 'Error inviting user.' });
    }
};

/**
 * Closes a user's account after ensuring all open expenses are settled.
 * 
 * @param {Object} req - The request object, containing user parameters.
 * @param {Object} res - The response object for sending back the HTTP response.
 * 
 * @throws Will return a 400 error if the user has open expenses.
 * @throws Will return a 500 error if there is an issue closing the account.
 * 
 * @returns {Object} A success message and the closed account details if successful.
 */

const closeAccount = async (req, res) => {
    const { userId } = req.params;

    try {
        // Check if the user owes anyone
        const hasOpenExpenses = await User.hasOpenExpenses(pool, userId);
        if (hasOpenExpenses) {
            logger.warn(req.__('errors.must_settle_expenses') || 'You must settle all open expenses before closing your account.');
            return res.status(400).json({ error: req.__('errors.must_settle_expenses') || 'You must settle all open expenses before closing your account.' });
        }

        // Mark the user as deleted
        const closedAccount = await User.closeAccount(pool, userId);
        logger.info(`Account closed for userId=${userId}`);
        res.status(200).json({
            message: req.__('messages.account_closed_successfully') || 'Account closed successfully.',
            user: closedAccount,
        });
    } catch (error) {
        logger.error(req.__('errors.close_account_error') || 'Error closing account', { error });
        res.status(500).json({ error: req.__('errors.close_account_error') || 'Error closing account.' });
    }
};


module.exports = {
    registerUser,
    loginUser,
    changePassword,
    inviteUserByEmail,
    closeAccount,
};