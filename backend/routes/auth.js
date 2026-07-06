const express = require('express');
const router = express.Router();
const { register, login, getMe, requestEmailChange, confirmEmailChange, requestPasswordChange, confirmPasswordChange } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/request-email-change', protect, requestEmailChange);
router.put('/confirm-email-change', protect, confirmEmailChange);
router.post('/request-password-change', protect, requestPasswordChange);
router.put('/confirm-password-change', protect, confirmPasswordChange);

module.exports = router;
