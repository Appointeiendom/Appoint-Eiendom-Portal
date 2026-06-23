const express = require('express');
const router = express.Router();
const { register, login, getMe, updateEmail } = require('../controllers/authController');
const { protect, adminOnly } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/update-email', protect, updateEmail);

module.exports = router;
