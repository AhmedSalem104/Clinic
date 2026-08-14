const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { env } = require('../../config/env');
const { AppError } = require('../../utils/errors');
const repository = require('./auth.repository');

const signUser = (user) => jwt.sign({
  id: user.Id,
  fullName: user.FullName,
  email: user.Email,
  role: user.Role,
  doctorId: user.DoctorId || null
}, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const login = async ({ email, password }) => {
  const user = await repository.findByEmail(email.toLowerCase());
  if (!user || !user.IsActive || !(await bcrypt.compare(password, user.PasswordHash))) {
    throw new AppError('بيانات الدخول غير صحيحة.', 401, 'INVALID_CREDENTIALS');
  }
  await repository.touchLastLogin(user.Id);
  return { token: signUser(user), user: { id: user.Id, fullName: user.FullName, email: user.Email, role: user.Role, doctorId: user.DoctorId } };
};

const currentUser = async (id) => {
  const user = await repository.findById(id);
  if (!user || !user.IsActive) throw new AppError('المستخدم غير متاح.', 401, 'INVALID_SESSION');
  return { id: user.Id, fullName: user.FullName, email: user.Email, role: user.Role, doctorId: user.DoctorId };
};

module.exports = { login, currentUser, signUser };
