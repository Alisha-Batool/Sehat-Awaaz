const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const NAME_PATTERN = /^(?:\p{L}\p{M}*)+(?: +(?:\p{L}\p{M}*)+)*$/u;

export function normalizeAuthEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function validateAuthEmail(email) {
  const normalizedEmail = normalizeAuthEmail(email);
  if (!normalizedEmail) return 'auth_modal.email_required';
  if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
    return 'auth_modal.email_invalid';
  }
  return '';
}

export function validateNewPassword(password) {
  const normalizedPassword = String(password || '');
  if (normalizedPassword.length < 8) return 'auth_modal.password_minimum';
  if (new TextEncoder().encode(normalizedPassword).length > 72) {
    return 'auth_modal.password_too_long';
  }
  if (!/\p{Lu}/u.test(normalizedPassword)
    || !/\p{Ll}/u.test(normalizedPassword)
    || !/\p{N}/u.test(normalizedPassword)
    || !/[\p{P}\p{S}]/u.test(normalizedPassword)) {
    return 'auth_modal.password_policy';
  }
  return '';
}

export function validateAuthForm({ mode, name, email, password }) {
  if (mode === 'register') {
    const normalizedName = String(name || '').trim();
    if (normalizedName.length < 2 || normalizedName.length > 80 || !NAME_PATTERN.test(normalizedName)) {
      return 'auth_modal.name_invalid';
    }
  }

  const emailError = validateAuthEmail(email);
  if (emailError) return emailError;

  const normalizedPassword = String(password || '');
  if (normalizedPassword.length < 8) return 'auth_modal.password_minimum';
  if (new TextEncoder().encode(normalizedPassword).length > 72) {
    return 'auth_modal.password_too_long';
  }

  if (mode === 'register') {
    return validateNewPassword(normalizedPassword);
  }

  return '';
}
