const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole, optionalAuth } = require('../middleware/auth');
const { Donation } = require('../models');

function generateReceiptNumber() {
  return `RCT-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`;
}

// Create a donation record (initiates payment). Actual gateway integration (M-Pesa STK push,
// card processor, etc.) should be wired in here - this records intent + confirms manually/via webhook.
router.post('/', optionalAuth, async (req, res, next) => {
  try {
    const { donorName, donorEmail, donorPhone, type, amount, method, isAnonymous, notes } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'A valid donation amount is required' });
    }

    const donation = await Donation.create({
      userId: req.user ? req.user.id : null,
      donorName: isAnonymous ? null : donorName,
      donorEmail: isAnonymous ? null : donorEmail,
      donorPhone,
      type, amount, method,
      isAnonymous: !!isAnonymous,
      notes,
      status: method === 'cash' ? 'completed' : 'pending',
      receiptNumber: method === 'cash' ? generateReceiptNumber() : null,
    });

    // TODO: integrate real gateway here:
    // - mpesa: trigger STK push using MPESA_* env vars, return checkoutRequestId to frontend for polling
    // - card: create PayPal/Stripe payment intent, return client secret/approval URL
    // - bank_transfer: just record reference, mark pending until reconciled

    res.status(201).json({ success: true, data: donation, message: 'Donation recorded. Awaiting payment confirmation.' });
  } catch (err) { next(err); }
});

// Webhook / admin: mark donation completed (e.g. after M-Pesa callback or manual reconciliation)
router.post('/:id/confirm', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const donation = await Donation.findByPk(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
    donation.status = 'completed';
    donation.transactionRef = req.body.transactionRef || donation.transactionRef;
    donation.receiptNumber = donation.receiptNumber || generateReceiptNumber();
    await donation.save();
    res.json({ success: true, data: donation });
  } catch (err) { next(err); }
});

// Logged-in member: own giving history
router.get('/my-history', authenticateToken, async (req, res, next) => {
  try {
    const donations = await Donation.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: donations });
  } catch (err) { next(err); }
});

// Download a receipt (returns JSON receipt data; frontend renders/prints as PDF)
router.get('/:id/receipt', authenticateToken, async (req, res, next) => {
  try {
    const donation = await Donation.findByPk(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Not found' });
    if (donation.userId !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this receipt' });
    }
    if (donation.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Receipt only available for completed donations' });
    }
    res.json({ success: true, data: donation });
  } catch (err) { next(err); }
});

// Admin: full donation reports
router.get('/', authenticateToken, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { status, type, from, to } = req.query;
    const { Op } = require('sequelize');
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (from || to) where.createdAt = {};
    if (from) where.createdAt[Op.gte] = new Date(from);
    if (to) where.createdAt[Op.lte] = new Date(to);

    const donations = await Donation.findAll({ where, order: [['createdAt', 'DESC']] });
    const totals = donations.reduce((sum, d) => sum + (d.status === 'completed' ? Number(d.amount) : 0), 0);
    res.json({ success: true, data: donations, totalCompleted: totals });
  } catch (err) { next(err); }
});

module.exports = router;
