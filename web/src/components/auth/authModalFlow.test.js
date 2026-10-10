import test from 'node:test';
import assert from 'node:assert/strict';
import { getAuthModalSubmitTransition } from './authModalFlow.js';

test('successful signup returns to login with the email retained, without authenticating', () => {
  assert.deepEqual(getAuthModalSubmitTransition('register', 'success', 'patient@example.com'), {
    mode: 'login',
    email: 'patient@example.com',
    shouldClose: false,
    shouldNotifySuccess: false,
    successMessageKey: 'auth_modal.registration_success',
    errorMessageKey: '',
  });
});

test('failed signup stays on signup and returns the localized error key', () => {
  assert.deepEqual(getAuthModalSubmitTransition('register', { status: 409 }), {
    mode: 'register',
    shouldClose: false,
    shouldNotifySuccess: false,
    successMessageKey: '',
    errorMessageKey: 'auth_modal.duplicate_email',
  });
});

test('bad login credentials stay on login and use the safe translated message', () => {
  assert.deepEqual(getAuthModalSubmitTransition('login', { status: 401 }), {
    mode: 'login',
    shouldClose: false,
    shouldNotifySuccess: false,
    successMessageKey: '',
    errorMessageKey: 'auth_modal.invalid_credentials',
  });
});

test('successful login closes the modal and invokes the existing success flow', () => {
  assert.deepEqual(getAuthModalSubmitTransition('login', 'success'), {
    mode: 'login',
    shouldClose: true,
    shouldNotifySuccess: true,
    successMessageKey: '',
    errorMessageKey: '',
  });
});
