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
    if (!user.isActive) return res.status(403).json({ message: 'Account deactivated' });

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
    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    const user = await User.findById(req.user._id);
    if (!(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Incorrect password' });
    }

    const taken = await User.findOne({ email, _id: { $ne: user._id } });
    if (taken) return res.status(400).json({ message: 'Email already in use' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(String(user._id), { otp, newEmail: email, expiresAt: Date.now() + 10 * 60 * 1000 });

    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
      from: process.env.EMAIL_FROM || 'Sameer.karki63@gmail.com',
      to: email,
      subject: 'Bekreft ny e-postadresse — Appoint Eiendom',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
          <div style="background:#10B981;padding:20px;border-radius:8px 8px 0 0;text-align:center;">
            <h1 style="color:white;margin:0;font-size:22px;">Bekreft e-postendring</h1>
          </div>
          <div style="background:white;padding:30px;border-radius:0 0 8px 8px;border:1px solid #E5E7EB;">
            <p style="color:#4B5563;">Din bekreftelseskode er:</p>
            <div style="text-align:center;margin:24px 0;">
              <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#1F2937;">${otp}</span>
            </div>
            <p style="color:#6B7280;font-size:13px;">Koden er gyldig i 10 minutter. Del den ikke med andre.</p>
          </div>
        </div>
      `,
    });

    res.json({ message: 'OTP sent' });
  } catch (error) {
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

module.exports = { register, login, getMe, requestEmailChange, confirmEmailChange };
