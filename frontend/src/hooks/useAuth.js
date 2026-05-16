import { useEffect, useState } from 'react';
import { buildMockUser } from '../lib/mockData';

const AUTH_EVENT = 'casepass-auth-change';

function readAuthState() {
  const token = window.localStorage.getItem('casepass-token');
  const rawUser = window.localStorage.getItem('casepass-user');

  return {
    token,
    user: rawUser ? JSON.parse(rawUser) : null,
  };
}

function writeAuthState(token, user) {
  window.localStorage.setItem('casepass-token', token);
  window.localStorage.setItem('casepass-user', JSON.stringify(user));
  window.dispatchEvent(new Event(AUTH_EVENT));
}

function clearAuthState() {
  window.localStorage.removeItem('casepass-token');
  window.localStorage.removeItem('casepass-user');
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function useAuth() {
  const [auth, setAuth] = useState(() => readAuthState());

  useEffect(() => {
    const sync = () => setAuth(readAuthState());
    window.addEventListener('storage', sync);
    window.addEventListener(AUTH_EVENT, sync);

    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(AUTH_EVENT, sync);
    };
  }, []);

  async function login(email, password) {
    const data = {
      token: 'casepass-local-token',
      user: buildMockUser(email || 'admin@casepass.local', {
        name: password ? 'Acceso Local Temporal' : 'Acceso Local',
      }),
    };

    writeAuthState(data.token, data.user);
    return data;
  }

  function logout() {
    clearAuthState();
  }

  return {
    token: auth.token,
    user: auth.user,
    isAuthenticated: Boolean(auth.token),
    login,
    logout,
  };
}
