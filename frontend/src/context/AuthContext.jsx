import { createContext, useCallback, useContext, useState } from "react";
import { api } from "../api/client.js";

const AuthContext = createContext(null);

function getStoredToken() {
  return localStorage.getItem("sf_token") || "";
}
function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("sf_user")) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(getStoredToken);
  const [user, setUser] = useState(getStoredUser);

  const saveSession = useCallback((tokenVal, userVal) => {
    localStorage.setItem("sf_token", tokenVal);
    localStorage.setItem("sf_user", JSON.stringify(userVal));
    setToken(tokenVal);
    setUser(userVal);
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    saveSession(data.token, data.user);
    return data;
  }, [saveSession]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    saveSession(data.token, data.user);
    return data;
  }, [saveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem("sf_token");
    localStorage.removeItem("sf_user");
    // Also clear legacy token key if any
    localStorage.removeItem("scoutflow_token");
    setToken("");
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated: !!token, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
