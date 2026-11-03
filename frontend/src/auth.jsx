import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, company: null });

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setState({ loading: false, user: null, company: null });
      return;
    }
    try {
      const r = await api.get('/auth/me');
      setState({ loading: false, user: r.user, company: r.company });
    } catch {
      tokenStore.set(null);
      setState({ loading: false, user: null, company: null });
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.set(null);
    setState({ loading: false, user: null, company: null });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    refresh();
  }, [refresh, logout]);

  const login = useCallback(async (email, password) => {
    const r = await api.post('/auth/login', { email, password });
    tokenStore.set(r.token);
    setState({ loading: false, user: r.user, company: r.company });
    return r;
  }, []);

  const acceptToken = useCallback(async (token) => {
    tokenStore.set(token);
    await refresh();
  }, [refresh]);

  const value = useMemo(() => {
    const role = state.user?.role;
    return {
      ...state,
      login,
      logout,
      refresh,
      acceptToken,
      isCompanyUser: role === 'company_admin' || role === 'company_member',
      isCompanyAdmin: role === 'company_admin',
      isPanelUser: role === 'technopark_admin' || role === 'super_admin',
      isSuperAdmin: role === 'super_admin',
      approved: state.company?.verification?.status === 'approved',
    };
  }, [state, login, logout, refresh, acceptToken]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
