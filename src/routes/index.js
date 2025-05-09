const express = require('express');
const validateApiKey = require('../middleware/apiKeyAuth');
const authenticateToken = require('../middleware/auth');
const loginController = require('../controllers/authentication');
const apiController = require('../controllers/apiController');
const apiKeyController = require('../controllers/apiKeyController');
const { deleteUserFromGroup } = require('../controllers/apiController');

// Import the Express.js framework
const express = require('express');

// Import middleware functions for API key validation and JWT authentication
const validateApiKey = require('../middleware/apiKeyAuth');
const authenticateToken = require('../middleware/auth');

// Import controller functions for handling requests
const loginController = require('../controllers/authentication');
const apiController = require('../controllers/apiController');
const apiKeyController = require('../controllers/apiKeyController');

// Import a specific function from the apiController
const { deleteUserFromGroup } = require('../controllers/apiController');

// Create a new Express router instance
const router = express.Router();

// Public routes (no API key required)
// Register a new user
router.post('/register', loginController.registerUser);

// Login an existing user
router.post('/login', loginController.loginUser);

// Generate a new API key
router.post('/generate-api-key', apiKeyController.generateApiKey);

// Update a user's password
router.put('/users/:userId/password', loginController.changePassword);

// Retrieve an API key by consumer name (requires JWT authentication)
router.post('/api-keys/retrieve', authenticateToken, apiKeyController.getApiKey);

// Protected routes (require API key and JWT authentication)
// Apply API key validation middleware to all routes below
router.use(validateApiKey);

// Invite a new user to join the platform
router.post('/users/invite', authenticateToken, loginController.inviteUserByEmail);

// Get a user's details
router.get('/users/:userId/details', authenticateToken, apiController.getUserDetails);

// Get a user's balances
router.get('/users/:userId/balances', authenticateToken, apiController.getUserBalances);

// Update a user's details
router.put('/users/:userId', authenticateToken, apiController.updateUserDetails);

// Close a user's account
router.delete('/users/:userId/close-account', authenticateToken, loginController.closeAccount);

// API For Groups
// Create a new group
router.post('/groups', authenticateToken, apiController.createGroup);

// Add a user to a group
router.post('/groups/:groupId/users', authenticateToken, apiController.addUserToGroup);

// Upload an image for a group
router.post('/groups/:groupId/images', authenticateToken, apiController.uploadGroupImage);

// Get images for a group
router.get('/groups/:groupId/images', authenticateToken, apiController.getGroupImages);

// Remove a user from a group
router.delete('/groups/:groupId/users/:userId', authenticateToken, deleteUserFromGroup);

// API For Expenses
// Create a new expense
router.post('/expenses', authenticateToken, apiController.createExpense);

// Get all expenses
router.get('/expenses', authenticateToken, apiController.getAllExpenses);

// Settle up expenses
router.post('/expenses/settle-up', authenticateToken, apiController.settleUpExpenses);

// Export the router instance
module.exports = router;