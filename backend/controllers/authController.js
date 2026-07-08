const jwt = require('jsonwebtoken');
const User = require('../models/User');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '24h' });

// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, unit, building, phone } = req.body;

    if (!name || !email || !password || !unit) {
      return res.status(400).json({ message: 'Name, email, password and unit are required' });
    }

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role: 'tenant', unit, building, phone });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      unit: user.unit,
      building: user.building,
      token: generateToken(user._id),
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message });
  }
};

// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    if (!user.isActive) return res.status(403).json({ message: 'Your access has expired. Please contact your admin.' });

    if (!user.firstLoginAt && user.role === 'tenant') {
      user.firstLoginAt = new Date();
      await user.save();
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      unit: user.unit,
      building: user.building,
      phone: user.phone,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  res.json(req.user);
};

// In-memory OTP store: userId -> { otp, newEmail, expiresAt }
const otpStore = new Map();

// POST /api/auth/request-email-change — verify password, send OTP to new email
const requestEmailChange = async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('request-email-change:', { email, userId: req.user?._id });
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const taken = await User.findOne({ email, _id: { $ne: user._id } });
    if (taken) return res.status(400).json({ message: 'Email already in use' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(String(user._id), { otp, newEmail: email, expiresAt: Date.now() + 10 * 60 * 1000 });
    console.log('OTP generated for', email, ':', otp);

    const { sendOtpEmail } = require('../services/emailService');
    await sendOtpEmail(email, otp);

    res.json({ message: 'OTP sent' });
  } catch (error) {
    console.error('request-email-change error:', error.message, error.response?.body);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/auth/confirm-email-change — verify OTP and apply new email
const confirmEmailChange = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: 'OTP is required' });

    const entry = otpStore.get(String(req.user._id));
    if (!entry) return res.status(400).json({ message: 'No pending email change. Request a new code.' });
    if (Date.now() > entry.expiresAt) {
      otpStore.delete(String(req.user._id));
      return res.status(400).json({ message: 'Code expired. Request a new one.' });
    }
    if (entry.otp !== otp.trim()) return res.status(400).json({ message: 'Incorrect code' });

    const user = await User.findById(req.user._id);
    user.email = entry.newEmail;
    await user.save();
    otpStore.delete(String(req.user._id));

    res.json({ message: 'Email updated', email: user.email });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// In-memory OTP store for password change: userId -> { otp, newPassword, expiresAt }
const pwOtpStore = new Map();

// POST /api/auth/request-password-change — send OTP to user's email, store new password hash intent
const requestPasswordChange = async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ message: 'Password must be at least 6 characters' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    pwOtpStore.set(String(req.user._id), { otp, newPassword, expiresAt: Date.now() + 10 * 60 * 1000 });

    const { sendOtpEmail } = require('../services/emailService');
    await sendOtpEmail(req.user.email, otp);

    res.json({ message: 'OTP sent' });
  } catch (error) {
    console.error('request-password-change error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// PUT /api/auth/confirm-password-change — verify OTP and apply new password
const confirmPasswordChange = async (req, res) => {
  try {
    const { otp } = req.body;
    if (!otp) return res.status(400).json({ message: 'OTP is required' });

    const entry = pwOtpStore.get(String(req.user._id));
    if (!entry) return res.status(400).json({ message: 'No pending password change. Request a new code.' });
    if (Date.now() > entry.expiresAt) {
      pwOtpStore.delete(String(req.user._id));
      return res.status(400).json({ message: 'Code expired. Request a new one.' });
    }
    if (entry.otp !== otp.trim()) return res.status(400).json({ message: 'Incorrect code' });

    const user = await User.findById(req.user._id);
    user.password = entry.newPassword;
    await user.save();
    pwOtpStore.delete(String(req.user._id));

    res.json({ message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// In-memory OTP store for forgot-password: email -> { otp, expiresAt }
const forgotOtpStore = new Map();

// POST /auth/forgot-password — send OTP to email (no auth required)
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    // Always respond OK to avoid revealing whether email exists
    if (!user) return res.json({ message: 'If that email is registered, a code has been sent.' });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    forgotOtpStore.set(email.toLowerCase().trim(), { otp, userId: String(user._id), expiresAt: Date.now() + 10 * 60 * 1000 });
    const { sendOtpEmail } = require('../services/emailService');
    await sendOtpEmail(user.email, otp);
    res.json({ message: 'If that email is registered, a code has been sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST /auth/reset-password — verify OTP and set new password (no auth required)
const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) return res.status(400).json({ message: 'All fields are required' });
    if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
    const key = email.toLowerCase().trim();
    const entry = forgotOtpStore.get(key);
    if (!entry) return res.status(400).json({ message: 'No reset requested for this email. Please start again.' });
    if (Date.now() > entry.expiresAt) {
      forgotOtpStore.delete(key);
      return res.status(400).json({ message: 'Code expired. Please request a new one.' });
    }
    if (entry.otp !== otp.trim()) return res.status(400).json({ message: 'Incorrect code' });
    const user = await User.findById(entry.userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.password = newPassword;
    await user.save();
    forgotOtpStore.delete(key);
    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { register, login, getMe, requestEmailChange, confirmEmailChange, requestPasswordChange, confirmPasswordChange, forgotPassword, resetPassword };
