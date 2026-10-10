export function getAuthModalSubmitTransition(mode, outcome, email = '') {
  if (outcome === 'success' && mode === 'register') {
    return {
      mode: 'login',
      email,
      shouldClose: false,
      shouldNotifySuccess: false,
      successMessageKey: 'auth_modal.registration_success',
      errorMessageKey: '',
    };
  }

  if (outcome === 'success') {
    return {
      mode,
      shouldClose: true,
      shouldNotifySuccess: true,
      successMessageKey: '',
      errorMessageKey: '',
    };
  }

  const status = typeof outcome === 'number' ? outcome : outcome?.status;
  const errorMessageKey = status === 409
      ? 'auth_modal.duplicate_email'
    : status === 401
      ? 'auth_modal.invalid_credentials'
      : 'auth_modal.request_failed';

  return {
    mode,
    shouldClose: false,
    shouldNotifySuccess: false,
    successMessageKey: '',
    errorMessageKey,
  };
}
