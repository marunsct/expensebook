const express = require('express');
const validateApiKey = require('../middleware/apiKeyAuth');
const authenticateToken = require('../middleware/auth');
const loginController = require('../controllers/authentication');
const apiController = require('../controllers/apiController');
const apiKeyController = require('../controllers/apiKeyController');
const { deleteUserFromGroup } = require('../controllers/apiController');

const router = express.Router();

// Public routes (no API key required)
router.post('/register', loginController.registerUser);
router.post('/login', loginController.loginUser);
router.post('/generate-api-key', apiKeyController.generateApiKey);

// Protected routes (require API key and JWT authentication)
router.use(validateApiKey); // Apply API key validation middleware to all routes below

router.post('/groups', authenticateToken, apiController.createGroup);
router.post('/groups/:groupId/users', authenticateToken, apiController.addUserToGroup);
router.get('/users/:userId/details', authenticateToken, apiController.getUserDetails);
router.get('/users/:userId/balances', authenticateToken, apiController.getUserBalances);
router.post('/expenses', authenticateToken, apiController.createExpense);
router.get('/expenses', authenticateToken, apiController.getAllExpenses);
router.post('/groups/:groupId/images', authenticateToken, apiController.uploadGroupImage);
router.get('/groups/:groupId/images', authenticateToken, apiController.getGroupImages);
router.post('/expenses/settle-up', authenticateToken, apiController.settleUpExpenses);
router.delete('/groups/:groupId/users/:userId', authenticateToken, deleteUserFromGroup);

module.exports = router;