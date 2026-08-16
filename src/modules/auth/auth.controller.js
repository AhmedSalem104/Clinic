const { env } = require('../../config/env');
const service = require('./auth.service');
const { ok } = require('../../utils/response');

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.cookieSecure,
  sameSite: env.cookieSameSite,
  maxAge: env.cookieMaxAgeMs,
  path: '/'
});

const login = async (req, res) => {
  const result = await service.login(req.body);
  res.cookie('clinic_access', result.token, cookieOptions());
  return ok(res, { user: result.user });
};

const me = async (req, res) => ok(res, { user: await service.currentUser(req.user.id) });

const logout = async (req, res) => {
  await service.logout(req.user?.id);
  res.clearCookie('clinic_access', { httpOnly: true, secure: env.cookieSecure, sameSite: env.cookieSameSite, path: '/' });
  return ok(res, { loggedOut: true });
};

module.exports = { login, me, logout };
