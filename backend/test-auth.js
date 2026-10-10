const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('./src/models/User');
const authRoutes = require('./src/routes/auth.routes');
const logger = require('./src/utils/logger');
const config = require('./src/config');
const { authLimiter } = require('./src/middleware/rateLimiter');
const { authenticate } = require('./src/middleware/auth');
const { errorHandler } = require('./src/middleware/errorHandler');
const emailService = require('./src/services/email.service');

const originalCreate = User.create;
const originalFindOne = User.findOne;
const originalFindOneAndUpdate = User.findOneAndUpdate;
const originalInfo = logger.info;
const originalError = logger.error;
const originalSendEmail = emailService.sendEmail;
let users;
let sentEmails = [];

function matchesQuery(user, query) {
  return Object.entries(query).every(([key, value]) => {
    if (value && typeof value === 'object' && '$gt' in value) {
      return user[key] > value.$gt;
    }
    return user[key] === value;
  });
}

function mockUserModel() {
  users = [];
  sentEmails = [];
  emailService.sendEmail = async (message) => {
    sentEmails.push(message);
    return { messageId: `test-message-${sentEmails.length}` };
  };
  User.create = async (attributes) => {
    const duplicate = users.some((user) =>
      (attributes.email && user.email === attributes.email)
      || (attributes.phone && user.phone === attributes.phone)
    );
    if (duplicate) {
      const error = new Error('Duplicate test user');
      error.code = 11000;
      error.keyPattern = attributes.email ? { email: 1 } : { phone: 1 };
      throw error;
    }
    const user = {
      _id: `test-user-${users.length + 1}`,
      ...attributes,
      save: async function save() { return this; },
    };
    users.push(user);
    return user;
  };
  User.findOne = (query) => ({ select: async () => users.find((user) => matchesQuery(user, query)) || null });
  User.findOneAndUpdate = async (query, update) => {
    const user = users.find((candidate) => matchesQuery(candidate, query));
    if (!user) return null;
    Object.assign(user, update.$set || {});
    for (const key of Object.keys(update.$unset || {})) delete user[key];
    return user;
  };
}

function tokenFromEmail(message) {
  const match = message.text.match(/[?&]token=([a-f0-9]{64})/i);
  assert.ok(match, 'email body should contain a 64-character token');
  return match[1];
}

async function withServer(run) {
  authLimiter.resetKey('127.0.0.1');
  authLimiter.resetKey('::ffff:127.0.0.1');
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.get('/protected', authenticate, (req, res) => {
    res.json({ userId: req.user.userId });
  });
  app.use(errorHandler);

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function post(baseUrl, path, body) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}

test('MongoDB email auth routes use hashed credentials and the existing JWT middleware', async (t) => {
  mockUserModel();
  logger.info = () => {};
  logger.error = () => {};

  await t.test('signup normalizes email and hashes the password without authenticating the user', async () => {
    await withServer(async (baseUrl) => {
      const result = await post(baseUrl, '/api/auth/register', {
        name: 'Éva Noor',
        email: '  PATIENT@example.com ',
        password: 'Correct-Horse-22!',
      });

      assert.equal(result.status, 201);
      assert.equal(result.data.email, 'patient@example.com');
      assert.equal(result.data.password, undefined);
      assert.equal(result.data.password_hash, undefined);
      assert.equal(result.data.accessToken, undefined);
      assert.equal(result.data.refreshToken, undefined);
      assert.equal(users[0].email, 'patient@example.com');
      assert.equal(users[0].name, 'Éva Noor');
      assert.notEqual(users[0].password_hash, 'Correct-Horse-22!');
      assert.equal(await bcrypt.compare('Correct-Horse-22!', users[0].password_hash), true);
      assert.equal(result.data.verificationEmailSent, true);
      assert.equal(users[0].email_verified, false);
      assert.notEqual(users[0].email_verification_token_hash, tokenFromEmail(sentEmails[0]));
      assert.ok(users[0].email_verification_expires_at > new Date());

      const unauthorizedResponse = await fetch(`${baseUrl}/protected`);
      assert.equal(unauthorizedResponse.status, 401);

      const loginResult = await post(baseUrl, '/api/auth/login', {
        email: result.data.email,
        password: 'Correct-Horse-22!',
      });
      assert.equal(loginResult.status, 200);
      assert.ok(loginResult.data.accessToken);

      const protectedResponse = await fetch(`${baseUrl}/protected`, {
        headers: { Authorization: `Bearer ${loginResult.data.accessToken}` },
      });
      assert.equal(protectedResponse.status, 200);
      assert.equal((await protectedResponse.json()).userId, loginResult.data.userId);
    });
  });

  await t.test('verification and reset tokens expire, are single-use, and reset credentials safely', async () => {
    await withServer(async (baseUrl) => {
      const authPost = async (path, body) => {
        authLimiter.resetKey('127.0.0.1');
        authLimiter.resetKey('::ffff:127.0.0.1');
        return post(baseUrl, path, body);
      };
      const register = (email) => authPost('/api/auth/register', {
        name: 'Test Patient',
        email,
        password: 'Correct-Horse-22!',
      });

      assert.equal((await register('verify@example.com')).status, 201);
      const verificationToken = tokenFromEmail(sentEmails.at(-1));
      const verified = await authPost('/api/auth/verify-email', { token: verificationToken });
      assert.equal(verified.status, 200);
      const verifiedUser = users.find((user) => user.email === 'verify@example.com');
      assert.equal(verifiedUser.email_verified, true);
      assert.equal(verifiedUser.email_verification_token_hash, undefined);
      assert.equal((await authPost('/api/auth/verify-email', { token: verificationToken })).status, 400);

      await register('expired-verification@example.com');
      const expiredVerificationToken = tokenFromEmail(sentEmails.at(-1));
      const expiredVerificationUser = users.find((user) => user.email === 'expired-verification@example.com');
      expiredVerificationUser.email_verification_expires_at = new Date(Date.now() - 1000);
      assert.equal((await authPost('/api/auth/verify-email', { token: expiredVerificationToken })).status, 400);

      await register('resend@example.com');
      const oldVerificationToken = tokenFromEmail(sentEmails.at(-1));
      const resend = await authPost('/api/auth/resend-verification', { email: 'resend@example.com' });
      assert.equal(resend.status, 200);
      assert.match(resend.data.message, /if an account/i);
      const newVerificationToken = tokenFromEmail(sentEmails.at(-1));
      assert.notEqual(newVerificationToken, oldVerificationToken);
      assert.equal((await authPost('/api/auth/verify-email', { token: oldVerificationToken })).status, 400);
      assert.equal((await authPost('/api/auth/verify-email', { token: newVerificationToken })).status, 200);

      await register('reset@example.com');
      const resetRequest = await authPost('/api/auth/forgot-password', { email: 'reset@example.com' });
      assert.equal(resetRequest.status, 200);
      assert.match(resetRequest.data.message, /if an account with this email exists/i);
      const resetToken = tokenFromEmail(sentEmails.at(-1));
      const resetUser = users.find((user) => user.email === 'reset@example.com');
      assert.notEqual(resetUser.password_reset_token_hash, resetToken);

      const mailCountBeforeUnknownAddress = sentEmails.length;
      const unknownRequest = await authPost('/api/auth/forgot-password', { email: 'unknown@example.com' });
      assert.deepEqual(unknownRequest.data, resetRequest.data);
      assert.equal(sentEmails.length, mailCountBeforeUnknownAddress);

      const updatedPassword = 'New-Password-44!';
      const reset = await authPost('/api/auth/reset-password', { token: resetToken, password: updatedPassword });
      assert.equal(reset.status, 200);
      assert.equal(resetUser.password_reset_token_hash, undefined);
      assert.equal(await bcrypt.compare(updatedPassword, resetUser.password_hash), true);
      assert.equal((await authPost('/api/auth/reset-password', { token: resetToken, password: updatedPassword })).status, 400);
      assert.equal((await authPost('/api/auth/login', { email: 'reset@example.com', password: 'Correct-Horse-22!' })).status, 401);
      assert.equal((await authPost('/api/auth/login', { email: 'reset@example.com', password: updatedPassword })).status, 200);

      await register('expired-reset@example.com');
      const expiredResetRequest = await authPost('/api/auth/forgot-password', { email: 'expired-reset@example.com' });
      assert.equal(expiredResetRequest.status, 200);
      const expiredResetToken = tokenFromEmail(sentEmails.at(-1));
      const expiredResetUser = users.find((user) => user.email === 'expired-reset@example.com');
      expiredResetUser.password_reset_expires_at = new Date(Date.now() - 1000);
      assert.equal((await authPost('/api/auth/reset-password', {
        token: expiredResetToken,
        password: updatedPassword,
      })).status, 400);
    });
  });

  await t.test('login accepts a normalized email and the correct password', async () => {
    await withServer(async (baseUrl) => {
      const result = await post(baseUrl, '/api/auth/login', {
        email: ' PATIENT@example.com ',
        password: 'Correct-Horse-22!',
      });
      assert.equal(result.status, 200);
      assert.ok(result.data.accessToken);
      assert.equal(result.data.userId, users[0]._id);
    });
  });

  await t.test('login rejects an incorrect password without issuing a token', async () => {
    await withServer(async (baseUrl) => {
      const result = await post(baseUrl, '/api/auth/login', {
        email: 'patient@example.com',
        password: 'incorrect-password',
      });
      assert.equal(result.status, 401);
      assert.equal(result.data.accessToken, undefined);
      assert.equal(result.data.message, 'Email or password is incorrect.');
    });
  });

  await t.test('existing email accounts with previously accepted passwords can still log in', async () => {
    const password_hash = await bcrypt.hash('lowercase1', 12);
    users.push({
      _id: 'legacy-user',
      email: 'legacy@example.com',
      name: 'Legacy Patient',
      password_hash,
    });

    await withServer(async (baseUrl) => {
      const result = await post(baseUrl, '/api/auth/login', {
        email: 'legacy@example.com',
        password: 'lowercase1',
      });
      assert.equal(result.status, 200);
      assert.ok(result.data.accessToken);
      assert.equal(result.data.userId, 'legacy-user');
    });
  });

  await t.test('registration returns a conflict for duplicate email', async () => {
    await withServer(async (baseUrl) => {
      const result = await post(baseUrl, '/api/auth/register', {
        name: 'Another Patient',
        email: 'PATIENT@example.com',
        password: 'Different-Password1!',
      });
      assert.equal(result.status, 409);
      assert.match(result.data.message, /log in or use another email/i);
    });
  });

  await t.test('registration rejects invalid names, emails, and passwords sent directly to the backend', async () => {
    await withServer(async (baseUrl) => {
      const invalidRegistrations = [
        { name: 'Patient 2!', email: 'person1@example.com', password: 'Correct-Horse-22!' },
        { name: ' ', email: 'person2@example.com', password: 'Correct-Horse-22!' },
        { name: 'Test Patient', email: 'not-an-email', password: 'Correct-Horse-22!' },
        { name: 'Test Patient', email: ' ', password: 'Correct-Horse-22!' },
        { name: 'Test Patient', email: 'person3@example.com', password: '' },
        { name: 'Test Patient', email: 'person4@example.com', password: 'WEAKPASS1!' },
        { name: 'Test Patient', email: 'person5@example.com', password: 'StrongPass!' },
        { name: 'Test Patient', email: 'person6@example.com', password: 'StrongPass1' },
        { name: 'Test Patient', email: 'person7@example.com', password: 'Aa1!xyz' },
        { name: 'Test Patient', email: 'person8@example.com', password: 'weakpass1!' },
      ];
      const initialUserCount = users.length;

      for (const registration of invalidRegistrations) {
        const result = await post(baseUrl, '/api/auth/register', registration);
        assert.equal(result.status, 400, JSON.stringify(registration));
      }
      assert.equal(users.length, initialUserCount);
    });
  });

  await t.test('registration rejects passwords over bcrypt’s byte limit sent directly to the backend', async () => {
    await withServer(async (baseUrl) => {
      const initialUserCount = users.length;
      const result = await post(baseUrl, '/api/auth/register', {
        name: 'Test Patient',
        email: 'long-password@example.com',
        password: `Aa1!${'x'.repeat(70)}`,
      });
      assert.equal(result.status, 400);
      assert.equal(users.length, initialUserCount);
    });
  });

  await t.test('a retained refresh token remains valid because logout only clears frontend storage', async () => {
    await withServer(async (baseUrl) => {
      const login = await post(baseUrl, '/api/auth/login', {
        email: 'patient@example.com',
        password: 'Correct-Horse-22!',
      });
      assert.equal(login.status, 200);

      const refresh = await post(baseUrl, '/api/auth/refresh', {
        refreshToken: login.data.refreshToken,
      });
      assert.equal(refresh.status, 200);
      assert.ok(refresh.data.accessToken);
      assert.ok(refresh.data.refreshToken);
    });
  });

  await t.test('phone OTP still creates and authenticates a phone-only account', async () => {
    const previousMode = config.otp.mode;
    config.otp.mode = 'mock';
    try {
      const phone = '03001234567';
      await withServer(async (baseUrl) => {
        const sent = await post(baseUrl, '/api/auth/send-otp', { phone });
        assert.equal(sent.status, 200);
        const result = await post(baseUrl, '/api/auth/verify-otp', {
          phone,
          otp: sent.data.mockOtp,
        });
        assert.equal(result.status, 200);
        assert.ok(result.data.accessToken);
        const phoneUser = users.find((user) => user.phone === phone);
        assert.ok(phoneUser);
        assert.equal(phoneUser.email, undefined);
        assert.equal(phoneUser.password_hash, undefined);
      });
    } finally {
      config.otp.mode = previousMode;
    }
  });

  await t.test('guest sessions still issue the existing guest JWT flow', async () => {
    await withServer(async (baseUrl) => {
      const result = await post(baseUrl, '/api/auth/guest', {});
      assert.equal(result.status, 200);
      assert.ok(result.data.guestId);
      assert.ok(result.data.accessToken);
      assert.ok(result.data.refreshToken);

      const protectedResponse = await fetch(`${baseUrl}/protected`, {
        headers: { Authorization: `Bearer ${result.data.accessToken}` },
      });
      assert.equal(protectedResponse.status, 200);
      assert.equal((await protectedResponse.json()).userId, result.data.guestId);
    });
  });

  t.after(() => {
    User.create = originalCreate;
    User.findOne = originalFindOne;
    User.findOneAndUpdate = originalFindOneAndUpdate;
    logger.info = originalInfo;
    logger.error = originalError;
    emailService.sendEmail = originalSendEmail;
  });
});

test('User model has sparse unique email and phone indexes and an optional password hash', () => {
  const indexes = User.schema.indexes();
  assert.ok(indexes.some(([keys, options]) => keys.email === 1 && options.unique && options.sparse));
  assert.ok(indexes.some(([keys, options]) => keys.phone === 1 && options.unique && options.sparse));
  assert.notEqual(User.schema.path('password_hash').options.required, true);
  assert.equal(User.schema.path('email_verified').options.default, false);
  for (const field of [
    'email_verification_token_hash',
    'email_verification_expires_at',
    'password_reset_token_hash',
    'password_reset_expires_at',
  ]) {
    assert.equal(User.schema.path(field).options.select, false);
  }
});
