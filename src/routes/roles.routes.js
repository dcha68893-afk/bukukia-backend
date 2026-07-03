const router = require('express').Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { ROLE_TITLES, ROLE_LABELS, ROLE_TIER, ROLE_PERMISSIONS, PERMISSIONS } = require('../config/permissions');

// GET /api/roles - full role/permission matrix, for building the admin
// "assign role" dropdown and a permissions-matrix view. Staff-only: the
// matrix reveals what each role can do, which is itself sensitive.
router.get('/', authenticateToken, requireRole('admin', 'super_admin', 'pastor'), (req, res) => {
  const roles = ROLE_TITLES.map((title) => ({
    title,
    label: ROLE_LABELS[title],
    tier: ROLE_TIER[title],
    permissions: ROLE_PERMISSIONS[title],
  }));
  res.json({ success: true, data: { roles, permissions: PERMISSIONS } });
});

module.exports = router;
