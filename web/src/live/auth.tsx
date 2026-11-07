import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, setUnauthorizedHandler, tokenStore } from './api';
import type { SessionCompany, User } from './types';

/** Socket.IO istemcisini yalnızca uygulama içinde yüklemek için tembel kapatma. */
const closeSocket = () => void import('./socket').then((m) => m.closeSocket());

interface State {
  loading: boolean;
  user: User | null;
  company: SessionCompany | null;
}

function useAuthValue() {
  const [state, setState] = useState<State>({ loading: true, user: null, company: null });

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) return setState({ loading: false, user: null, company: null });
    try {
      const r = await api.get<{ user: User; company: SessionCompany | null }>('/auth/me');
      setState({ loading: false, user: r.user, company: r.company });
    } catch {
      tokenStore.set(null);
      setState({ loading: false, user: null, company: null });
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.set(null);
    closeSocket();
    setState({ loading: false, user: null, company: null });
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    void refresh();
  }, [refresh, logout]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post<{ token: string; user: User; company: SessionCompany | null }>('/auth/login', { email, password });
    tokenStore.set(r.token);
    closeSocket();
    setState({ loading: false, user: r.user, company: r.company });
    return r;
  }, []);

  const acceptToken = useCallback(
    async (token: string) => {
      tokenStore.set(token);
      closeSocket();
      await refresh();
    },
    [refresh],
  );

  return useMemo(() => {
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
}

type Auth = ReturnType<typeof useAuthValue>;
const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  return <Ctx.Provider value={useAuthValue()}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth, AuthProvider içinde kullanılmalı');
  return v;
}

/** Rol bazlı ana sayfa */
export const homeFor = (a: Pick<Auth, 'isPanelUser'>) => (a.isPanelUser ? '/app/panel' : '/app');
