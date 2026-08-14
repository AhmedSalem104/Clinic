const { env } = require('../../config/env');
const service = require('./auth.service');
const { ok } = require('../../utils/response');

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: 'lax',
  maxAge: 8 * 60 * 60 * 1000,
  path: '/'
});

const login = async (req, res) => {
  const result = await service.login(req.body);
  res.cookie('clinic_access', result.token, cookieOptions());
  return ok(res, { user: result.user });
};

const me = async (req, res) => ok(res, { user: await service.currentUser(req.user.id) });

const logout = async (_req, res) => {
  res.clearCookie('clinic_access', { httpOnly: true, secure: env.cookieSecure, sameSite: 'lax', path: '/' });
  return ok(res, { loggedOut: true });
};

module.exports = { login, me, logout };
