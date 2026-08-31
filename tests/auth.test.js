const test = require('node:test');
const assert = require('node:assert/strict');

test('dynamic auth function handles login, session and logout', async () => {
  const previous = {
    ADMIN_USERNAME: process.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    JWT_SECRET: process.env.JWT_SECRET,
    VERCEL_ENV: process.env.VERCEL_ENV
  };
  process.env.ADMIN_USERNAME = 'admin-test';
  process.env.ADMIN_PASSWORD = 'password-test';
  process.env.JWT_SECRET = 'test-secret-with-more-than-sixteen-characters';
  process.env.VERCEL_ENV = 'development';

  try {
    const handler = require('../api/auth/[action]');
    const login = response();
    await handler({
      method: 'POST',
      query: { action: 'login' },
      headers: {},
      body: { username: 'admin-test', password: 'password-test' }
    }, login);
    assert.equal(login.statusCode, 200);
    assert.match(login.headers['Set-Cookie'], /^privacy_admin_session=/);

    const cookie = login.headers['Set-Cookie'].split(';')[0];
    const me = response();
    await handler({
      method: 'GET',
      query: { action: 'me' },
      headers: { cookie }
    }, me);
    assert.equal(me.statusCode, 200);
    assert.deepEqual(me.body, { authenticated: true, username: 'admin-test' });

    const logout = response();
    await handler({
      method: 'POST',
      query: { action: 'logout' },
      headers: { cookie }
    }, logout);
    assert.equal(logout.statusCode, 200);
    assert.match(logout.headers['Set-Cookie'], /Max-Age=0/);
  } finally {
    restore('ADMIN_USERNAME', previous.ADMIN_USERNAME);
    restore('ADMIN_PASSWORD', previous.ADMIN_PASSWORD);
    restore('JWT_SECRET', previous.JWT_SECRET);
    restore('VERCEL_ENV', previous.VERCEL_ENV);
  }
});

function response() {
  return {
    statusCode: 200,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; }
  };
}

function restore(name, value) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}
