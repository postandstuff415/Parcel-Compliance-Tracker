import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface InspectorSession {
  name: string;
  badge: string;
  email: string;
}

interface AuthContextValue {
  inspector: InspectorSession | null;
  login: (session: InspectorSession) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const SESSION_KEY = "ofd_inspector_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [inspector, setInspector] = useState<InspectorSession | null>(() => {
    try {
      const stored = sessionStorage.getItem(SESSION_KEY);
      return stored ? (JSON.parse(stored) as InspectorSession) : null;
    } catch {
      return null;
    }
  });

  const login = (session: InspectorSession) => {
    setInspector(session);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  };

  const logout = () => {
    setInspector(null);
    sessionStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{ inspector, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
