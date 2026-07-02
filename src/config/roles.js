/**
 * Central role hierarchy + permission matrix.
 * Roles, from least to most privileged:
 *   member < leader < pastor < admin < super_admin
 *
 * Use `requireMinRole('leader')` when "this role and anything above it" is fine.
 * Use `requireRole('admin', 'super_admin')` (in middleware/auth.js) when you need
 * an exact allow-list instead of a hierarchy cutoff (e.g. "pastor OR admin, but not leader").
 */
const ROLE_RANK = {
  member: 0,
  leader: 1,
  pastor: 2,
  admin: 3,
  super_admin: 4,
};

function rankOf(role) {
  return ROLE_RANK[role] ?? -1;
}

function isAtLeast(userRole, minRole) {
  return rankOf(userRole) >= rankOf(minRole);
}

module.exports = { ROLE_RANK, rankOf, isAtLeast };
