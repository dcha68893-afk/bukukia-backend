const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function sanitize(user) {
  const u = user.toJSON();
  delete u.passwordHash;
  delete u.resetToken;
  delete u.resetTokenExpires;
  return u;
}

// POST /api/auth/register  (member self-registration / first-time visitor signup)
router.post(
  '/register',
  [
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const { firstName, lastName, email, password, phone } = req.body;
      const existing = await User.findOne({ where: { email } });
      if (existing) return res.status(409).json({ success: false, message: 'An account with this email already exists' });

      // Under soft-deletes (paranoid mode), a previously-removed member's row
      // still occupies the unique email index even though the check above
      // (which excludes soft-deleted rows) didn't find it. Catch that case
      // with a clear message rather than letting it surface as a raw DB
      // constraint error.
      const softDeleted = await User.findOne({ where: { email }, paranoid: false });
      if (softDeleted && softDeleted.deletedAt) {
        return res.status(409).json({
          success: false,
          message: 'This email was previously associated with a removed account. Please contact church staff to reactivate it rather than registering again.',
        });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ firstName, lastName, email, phone, passwordHash });

      const token = signToken(user);
      res.status(201).json({ success: true, token, user: sanitize(user) });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login  (member / leader / pastor / admin - role comes from user record)
router.post(
  '/login',
  [body('email').isEmail(), body('password').notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

      const { email, password } = req.body;
      const user = await User.findOne({ where: { email } });
      if (!user || !user.isActive) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ success: false, message: 'Invalid email or password' });

      user.lastLogin = new Date();
      await user.save();

      const token = signToken(user);
      res.json({ success: true, token, user: sanitize(user) });
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/auth/me
router.get('/me', authenticateToken, async (req, res) => {
  res.json({ success: true, user: sanitize(req.user) });
});

// PUT /api/auth/me  (update own profile)
router.put('/me', authenticateToken, async (req, res, next) => {
  try {
    const fields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'maritalStatus',
      'address', 'city', 'country', 'occupation', 'profileImage',
      'familyInfo', 'talents', 'spiritualGifts', 'emergencyContact', 'medicalNotes'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) req.user[f] = req.body[f];
    });
    await req.user.save();
    res.json({ success: true, user: sanitize(req.user) });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticateToken, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters' });
    }
    const valid = await bcrypt.compare(currentPassword || '', req.user.passwordHash);
    if (!valid) return res.status(401).json({ success: false, message: 'Current password is incorrect' });

    req.user.passwordHash = await bcrypt.hash(newPassword, 12);
    await req.user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
