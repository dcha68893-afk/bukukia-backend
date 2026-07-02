const { body, validationResult } = require('express-validator');

/** Runs express-validator checks and returns 400 with structured errors if any fail */
function validate(rules) {
  return [
    ...rules,
    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
      }
      next();
    },
  ];
}

/** Verify hCaptcha / reCAPTCHA token submitted from the frontend.
 *  Set CAPTCHA_SECRET and CAPTCHA_PROVIDER (hcaptcha | recaptcha) in .env.
 *  If not configured, skips verification (so you can develop without it). */
async function verifyCaptcha(req, res, next) {
  const secret = process.env.CAPTCHA_SECRET;
  const provider = (process.env.CAPTCHA_PROVIDER || 'hcaptcha').toLowerCase();
  if (!secret) return next(); // not configured – skip

  const token = req.body.captchaToken || req.body['h-captcha-response'] || req.body['g-recaptcha-response'];
  if (!token) {
    return res.status(400).json({ success: false, message: 'CAPTCHA verification required' });
  }

  try {
    const url = provider === 'recaptcha'
      ? `https://www.google.com/recaptcha/api/siteverify`
      : `https://hcaptcha.com/siteverify`;

    const params = new URLSearchParams({ secret, response: token });
    const r = await fetch(url, { method: 'POST', body: params });
    const data = await r.json();

    if (!data.success) {
      return res.status(400).json({ success: false, message: 'CAPTCHA verification failed. Please try again.' });
    }
    next();
  } catch (err) {
    console.error('CAPTCHA verify error:', err.message);
    next(); // fail open during outages so the site stays usable
  }
}

// ---- Reusable rule sets for common public forms ----
const contactRules = validate([
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('message').trim().isLength({ min: 10 }).withMessage('Message must be at least 10 characters'),
]);

const prayerRules = validate([
  body('request').trim().isLength({ min: 10 }).withMessage('Prayer request must be at least 10 characters'),
]);

const registerRules = validate([
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').trim().notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
]);

const donationRules = validate([
  body('amount').isFloat({ min: 1 }).withMessage('Donation amount must be greater than 0'),
  body('method').isIn(['mpesa','card','bank_transfer','cash']).withMessage('Invalid payment method'),
]);

module.exports = { validate, verifyCaptcha, contactRules, prayerRules, registerRules, donationRules };
