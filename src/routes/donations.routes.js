const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const { authenticateToken, requireRole, optionalAuth, requirePermission } = require('../middleware/auth');
const { donationRules } = require('../middleware/validate');
const { Donation } = require('../models');
const { sendNotification } = require('../utils/notify');
const { PERMISSIONS } = require('../config/permissions');

function generateReceiptNumber() {
  return `RCT-${Date.now().toString(36).toUpperCase()}-${uuidv4().slice(0, 4).toUpperCase()}`;
}

// ── M-Pesa (Safaricom Daraja API) ────────────────────────────────────────────
// Requires MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE,
// MPESA_PASSKEY, MPESA_CALLBACK_URL in .env / Render environment variables.
// Set MPESA_ENV=production once you have live (not sandbox) Daraja credentials.
function mpesaBaseUrl() {
  return process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';
}

function mpesaTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// Normalizes Kenyan numbers (07XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX) to 2547XXXXXXXX / 2541XXXXXXXX
function normalizeMpesaPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.startsWith('254')) return digits;
  if (digits.startsWith('0')) return `254${digits.slice(1)}`;
  if (digits.startsWith('7') || digits.startsWith('1')) return `254${digits}`;
  return digits;
}

async function getMpesaAccessToken() {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error('M-Pesa is not configured (missing MPESA_CONSUMER_KEY/SECRET)');

  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const r = await fetch(`${mpesaBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  const data = await r.json();
  if (!data.access_token) throw new Error('Could not authenticate with M-Pesa (check your Daraja credentials)');
  return data.access_token;
}

/** Sends the STK push that pops up the "Enter M-Pesa PIN" prompt on the donor's phone. */
async function initiateStkPush({ phone, amount, reference, description }) {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const callbackUrl = process.env.MPESA_CALLBACK_URL;
  if (!shortcode || !passkey || !callbackUrl) {
    throw new Error('M-Pesa is not configured (missing MPESA_SHORTCODE/PASSKEY/CALLBACK_URL)');
  }

  const accessToken = await getMpesaAccessToken();
  const timestamp = mpesaTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');
  const msisdn = normalizeMpesaPhone(phone);

  const r = await fetch(`${mpesaBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(Number(amount)),
      PartyA: msisdn,
      PartyB: shortcode,
      PhoneNumber: msisdn,
      CallBackURL: callbackUrl,
      AccountReference: reference,
      TransactionDesc: description || 'Donation',
    }),
  });
  const data = await r.json();
  if (data.ResponseCode !== '0') {
    throw new Error(data.errorMessage || data.CustomerMessage || 'M-Pesa could not send the payment prompt. Please try again.');
  }
  return data; // includes CheckoutRequestID, MerchantRequestID
}

// POST /api/donations - create donation intent
router.post('/', optionalAuth, donationRules, async (req, res, next) => {
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

    // If M-Pesa, actually send the STK push now so the donor's phone prompts them to pay.
    if (method === 'mpesa') {
      if (!donorPhone) {
        await donation.destroy();
        return res.status(400).json({ success: false, message: 'A phone number is required for M-Pesa payments' });
      }
      try {
        const mpesaResult = await initiateStkPush({
          phone: donorPhone,
          amount,
          reference: donation.id,
          description: `${type || 'Donation'} - Gwikonge PEFA Church`,
        });
        donation.transactionRef = mpesaResult.CheckoutRequestID;
        await donation.save();
      } catch (mpesaErr) {
        donation.status = 'failed';
        await donation.save();
        return res.status(502).json({ success: false, message: mpesaErr.message });
      }
    }

    res.status(201).json({
      success: true,
      data: donation,
      message: isCash
        ? 'Donation recorded. Receipt number: ' + receiptNumber
        : method === 'mpesa'
          ? 'Check your phone and enter your M-Pesa PIN to complete the payment.'
          : 'Donation initiated. Complete your payment to receive a receipt.',
    });
  } catch (err) { next(err); }
});

// POST /api/donations/mpesa-callback - Safaricom calls this automatically once the
// donor enters (or cancels) their M-Pesa PIN. Must stay public/unauthenticated —
// Safaricom's servers call it directly, not the browser.
router.post('/mpesa-callback', async (req, res) => {
  try {
    const stk = req.body?.Body?.stkCallback;
    if (!stk) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    const donation = await Donation.findOne({ where: { transactionRef: stk.CheckoutRequestID } });
    if (!donation) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    if (stk.ResultCode === 0) {
      const items = stk.CallbackMetadata?.Item || [];
      const get = (name) => items.find((i) => i.Name === name)?.Value;
      donation.status = 'completed';
      donation.transactionRef = get('MpesaReceiptNumber') || donation.transactionRef;
      donation.receiptNumber = donation.receiptNumber || generateReceiptNumber();
      await donation.save();

      if (donation.userId) {
        await sendNotification({
          userId: donation.userId,
          title: 'Payment Confirmed – Thank You!',
          message: `Your ${donation.type} of KES ${Number(donation.amount).toLocaleString()} has been confirmed. Receipt: ${donation.receiptNumber}`,
          type: 'donation_receipt',
          link: '/dashboard.html#giving',
        });
      }
    } else {
      donation.status = 'failed';
      await donation.save();
    }
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('M-Pesa callback error:', err.message);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); // always ack so Safaricom doesn't retry endlessly
  }
});

// GET /api/donations/:id/mpesa-status - frontend polls this after showing
// "check your phone" so it can tell the donor once payment clears.
router.get('/:id/mpesa-status', async (req, res, next) => {
  try {
    const donation = await Donation.findByPk(req.params.id);
    if (!donation) return res.status(404).json({ success: false, message: 'Donation not found' });
    res.json({ success: true, status: donation.status, receiptNumber: donation.receiptNumber });
  } catch (err) { next(err); }
});

// POST /api/donations/:id/confirm - admin confirms manual payment (bank transfer / cash reconciliation)
router.post('/:id/confirm', authenticateToken, requireRole('admin', 'super_admin'), requirePermission(PERMISSIONS.CONFIRM_DONATIONS), async (req, res, next) => {
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
router.get('/', authenticateToken, requireRole('admin', 'super_admin'), requirePermission(PERMISSIONS.VIEW_DONATIONS), async (req, res, next) => {
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
