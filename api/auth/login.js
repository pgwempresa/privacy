const { checkCredentials, issueToken, setSessionCookie } = require('../../lib/auth');

module.exports = async (req, res) => {
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
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

function safeParse(b) {
  try { return JSON.parse(b || '{}'); } catch { return {}; }
}
