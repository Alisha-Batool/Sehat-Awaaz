import { createContext, useContext, useState, useCallback } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext(null);

function getStoredUser() {
  const storedDemoUser = localStorage.getItem('sehat_user');
  const storedBackendUser = localStorage.getItem('user');
  const stored = storedDemoUser || storedBackendUser;
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error('Could not read the saved Sehat Awaaz user profile', error);
    localStorage.removeItem(storedDemoUser ? 'sehat_user' : 'user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);

  const login = useCallback(async (phone) => {
    const { data } = await authApi.sendOTP(phone);
    return data;
  }, []);

  const verify = useCallback(async (phone, otp) => {
    const { data } = await authApi.verifyOTP(phone, otp);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.removeItem('sehat_user');
    const userData = { userId: data.userId, isGuest: false };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return data;
  }, []);

  const demoLogin = useCallback((name, email) => {
    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      isGuest: false,
      isDemo: true,
    };
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.setItem('sehat_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  }, []);

  const guestLogin = useCallback(async () => {
    const { data } = await authApi.guest();
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    const userData = { userId: data.guestId, isGuest: true };
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
    return data;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('sehat_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, verify, guestLogin, demoLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
