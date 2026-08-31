const {
  checkCredentials,
  issueToken,
  setSessionCookie,
  clearSessionCookie,
  getSession
} = require('../../lib/auth');

// One dynamic Function serves /api/auth/login, /logout and /me. Keeping these
// tiny endpoints together avoids exceeding Vercel Hobby's Function limit.
module.exports = async (req, res) => {
  const action = String((req.query && req.query.action) || '').toLowerCase();

  if (action === 'login') return login(req, res);
  if (action === 'logout') return logout(req, res);
  if (action === 'me') return me(req, res);
  return res.status(404).json({ error: 'auth action not found' });
};

async function login(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { username, password } = (req.body && typeof req.body === 'object')
    ? req.body
    : safeParse(req.body);
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  try {
    if (!checkCredentials(username, password)) {
      return res.status(401).json({ error: 'invalid credentials' });
    }
    const token = await issueToken(username);
    setSessionCookie(res, token);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function logout(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }
  clearSessionCookie(res);
  return res.status(200).json({ ok: true });
}

async function me(req, res) {
  const session = await getSession(req);
  if (session && session.role === 'admin') {
    return res.status(200).json({ authenticated: true, username: session.sub });
  }
  return res.status(200).json({ authenticated: false });
}

function safeParse(value) {
  try { return JSON.parse(value || '{}'); } catch { return {}; }
}
