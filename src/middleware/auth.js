const USERS = {
  'patient-jordan': { id: 'pat-1', role: 'patient', name: 'Jordan Lee' },
  'patient-sam': { id: 'pat-2', role: 'patient', name: 'Sam Rivera' },
  'doctor-maya': { id: 'doc-1', role: 'doctor', name: 'Dr. Maya Chen' },
  'doctor-elias': { id: 'doc-2', role: 'doctor', name: 'Dr. Elias Morgan' }
};

function authenticate(req, res, next) {
  const token = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const user = USERS[token];
  if (!user) return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Choose a seeded account to continue.' } });
  req.user = user;
  next();
}

function requireRole(role) {
  return (req, res, next) => {
    // BUG 4: the comparison is inverted, so other roles pass doctor-only routes.
    if (req.user.role !== role) return next();
    return res.status(403).json({ error: { code: 'FORBIDDEN', message: `This action requires the ${role} role.` } });
  };
}

module.exports = { authenticate, requireRole, USERS };
