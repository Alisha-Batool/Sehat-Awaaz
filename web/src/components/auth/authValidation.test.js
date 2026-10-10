import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeAuthEmail, validateAuthEmail, validateAuthForm, validateNewPassword } from './authValidation.js';

const validRegistration = {
  mode: 'register',
  name: 'Éva Noor',
  email: ' Patient@Example.com ',
  password: 'StrongPass1!',
};

test('email is trimmed and lowercased, and Unicode names with spaces are accepted', () => {
  assert.equal(normalizeAuthEmail(validRegistration.email), 'patient@example.com');
  assert.equal(validateAuthForm(validRegistration), '');
});

test('signup rejects names containing digits or special characters', () => {
  assert.equal(validateAuthForm({ ...validRegistration, name: 'Patient 2' }), 'auth_modal.name_invalid');
  assert.equal(validateAuthForm({ ...validRegistration, name: 'Patient-Name' }), 'auth_modal.name_invalid');
  assert.equal(validateAuthForm({ ...validRegistration, name: ' ' }), 'auth_modal.name_invalid');
});

test('signup requires an email and rejects invalid email formats', () => {
  assert.equal(validateAuthForm({ ...validRegistration, email: '  ' }), 'auth_modal.email_required');
  assert.equal(validateAuthForm({ ...validRegistration, email: 'not-an-email' }), 'auth_modal.email_invalid');
});

test('signup password requires uppercase, lowercase, number, special character, and eight characters', () => {
  for (const password of ['weakpass1!', 'WEAKPASS1!', 'StrongPass!', 'StrongPass1']) {
    assert.equal(validateAuthForm({ ...validRegistration, password }), 'auth_modal.password_policy');
  }
  assert.equal(validateAuthForm({ ...validRegistration, password: 'Aa1!xyz' }), 'auth_modal.password_minimum');
  assert.equal(validateAuthForm({ ...validRegistration, password: '' }), 'auth_modal.password_minimum');
});

test('password length limit matches bcrypt byte limit and login does not reject legacy complexity', () => {
  assert.equal(
    validateAuthForm({ ...validRegistration, password: `${'Aa1!'.repeat(19)}` }),
    'auth_modal.password_too_long'
  );
  assert.equal(validateAuthForm({ ...validRegistration, mode: 'login', password: 'lowercase1' }), '');
  assert.equal(
    validateAuthForm({ ...validRegistration, mode: 'login', password: 'short' }),
    'auth_modal.password_minimum'
  );
});

test('forgot-password email validation and reset password policy reuse registration rules', () => {
  assert.equal(validateAuthEmail('  '), 'auth_modal.email_required');
  assert.equal(validateAuthEmail('not-an-email'), 'auth_modal.email_invalid');
  assert.equal(validateAuthEmail(' PERSON@example.com '), '');
  assert.equal(validateNewPassword('StrongPass1!'), '');
  assert.equal(validateNewPassword('weakpass1!'), 'auth_modal.password_policy');
});

test('all auth validation messages exist in the four supported languages', () => {
  const keys = [
    'email_required',
    'email_invalid',
    'name_invalid',
    'password_minimum',
    'password_policy',
    'password_too_long',
    'duplicate_email',
    'invalid_credentials',
    'registration_verification_sent',
    'registration_verification_failed',
    'password_reset_request_sent',
    'forgot_password_link',
    'forgot_title',
    'forgot_description',
    'send_reset_link',
    'resend_verification_email',
    'verification_resend_result',
    'remember_password',
    'verify_title',
    'verify_description',
    'verify_loading',
    'verification_success',
    'verification_failed',
    'reset_title',
    'reset_description',
    'confirm_password',
    'passwords_mismatch',
    'reset_password_button',
    'password_reset_success',
    'password_reset_invalid',
    'return_to_sign_in',
  ];
  const locales = ['en', 'ur', 'ur-roman', 'ps'];

  for (const locale of locales) {
    const path = new URL(`../../i18n/locales/${locale}.json`, import.meta.url);
    const messages = JSON.parse(readFileSync(path, 'utf8')).auth_modal;
    for (const key of keys) assert.ok(messages[key]?.trim(), `${locale}: ${key}`);
  }
});
