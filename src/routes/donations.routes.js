const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { donationRules, verifyCaptcha } = require('../middleware/validate');
const { Donation } = require('../models');
const { sendNotification } = require('../utils/notify');

function generateReceiptNumber() {
  return `RCT-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`;
}

// POST /api/donations - create donation intent
router.post('/', optionalAuth, verifyCaptcha, donationRules, async (req, res, next) => {
  try {
    const { donorName, donorEmail, donorPhone, type, amount, method, isAnonymous, notes } = req.body;
    if (!amount || Number(amount) <= 0)
      return res.status(400).json({ success: false, message: 'A valid donation amount is required' });

    const isCash = method === 'cash';
    const receiptNumber = isCash ? generateReceiptNumber() : null;

    const donation = await Donation.create({
      userId: req.user ? req.user.id : null,
      donorName: isAnonymous ? null : donorName,
      donorEmail: isAnonymous ? null : donorEmail,
      donorPhone,
      type, amount, method,
      isAnonymous: !!isAnonymous,
      notes,
      status: isCash ? 'completed' : 'pending',
      receiptNumber,
    });

    // If cash (admin records it), immediately notify the member
    if (isCash && req.user) {
      await sendNotification({
        userId: req.user.id,
        title: 'Donation Receipt',
        message: `Your ${type} of KES ${Number(amount).toLocaleString()} has been recorded. Receipt: ${receiptNumber}`,
        type: 'donation_receipt',
        link: '/dashboard.html#giving',
      });
    }

    // --- M-Pesa STK Push placeholder ---
    // Replace the block below with your Daraja API integration:
    // 1. Get access token: POST https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials
    // 2. STK push:        POST https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest
    // 3. Return checkoutRequestId to frontend so it can poll /api/donations/:id/mpesa-status
    // 4. Handle callback at /api/donations/mpesa-callback (add that route below)
    // const mpesaResult = await initiateStkPush({ phone: donorPhone, amount, reference: donation.id });

    res.status(201).json({
      success: true,
      data: donation,
      message: isCash
        ? 'Donation recorded. Receipt number: ' + receiptNumber
        : 'Donation initiated. Complete your payment to receive a receipt.',
    });
  } catch (err) { next(err); }
});

// POST /api/donations/:id/confirm - admin confirms manual payment (bank transfer / cash reconciliation)
router.post('/:id/confirm', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const donation = await Donation.findByPk(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
    if (donation.status === 'completed') return res.status(400).json({ success: false, message: 'Already confirmed' });

    donation.status = 'completed';
    donation.transactionRef = req.body.transactionRef || donation.transactionRef;
    donation.receiptNumber = donation.receiptNumber || generateReceiptNumber();
    await donation.save();

    // Notify the member
    if (donation.userId) {
      await sendNotification({
        userId: donation.userId,
        title: 'Payment Confirmed – Thank You!',
        message: `Your ${donation.type} of KES ${Number(donation.amount).toLocaleString()} has been confirmed. Receipt: ${donation.receiptNumber}`,
        type: 'donation_receipt',
        link: '/dashboard.html#giving',
      });
    }

    res.json({ success: true, data: donation });
  } catch (err) { next(err); }
});

// GET /api/donations/my-history - member's own giving history
router.get('/my-history', authenticateToken, async (req, res, next) => {
  try {
    const donations = await Donation.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: donations });
  } catch (err) { next(err); }
});

// GET /api/donations/:id/receipt - member downloads own receipt; admin can access any
router.get('/:id/receipt', authenticateToken, async (req, res, next) => {
  try {
    const donation = await Donation.findByPk(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Not found' });

    const isOwner = donation.userId === req.user.id;
    const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
    if (!isOwner && !isAdmin)
      return res.status(403).json({ success: false, message: 'You cannot view this receipt' });

    if (donation.status !== 'completed')
      return res.status(400).json({ success: false, message: 'Receipt only available for completed donations' });

    res.json({ success: true, data: donation });
  } catch (err) { next(err); }
});

// GET /api/donations - admin: full donation reports with filters
router.get('/', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { status, type, from, to } = req.query;
    const { Op } = require('sequelize');
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }
    const donations = await Donation.findAll({ where, order: [['createdAt', 'DESC']] });
    const totalCompleted = donations
      .filter((d) => d.status === 'completed')
      .reduce((sum, d) => sum + Number(d.amount), 0);
    res.json({ success: true, data: donations, totalCompleted });
  } catch (err) { next(err); }
});

module.exports = router;
