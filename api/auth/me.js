const { getSession } = require('../../lib/auth');

module.exports = async (req, res) => {
  const session = await getSession(req);
  if (session && session.role === 'admin') {
    return res.status(200).json({ authenticated: true, username: session.sub });
  }
  return res.status(200).json({ authenticated: false });
};
