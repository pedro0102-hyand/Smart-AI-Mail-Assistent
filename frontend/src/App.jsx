import React, { createContext, useContext, useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import AuthSuccess from "./pages/AuthSuccess";
import InboxPage from "./pages/InboxPage";
import EmailDetailPage from "./pages/EmailDetailPage";
import DashboardPage from "./pages/DashboardPage";

// Dark mode context
export const ThemeContext = createContext({ dark: false, toggle: () => {} });
export function useTheme() { return useContext(ThemeContext); }

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/" replace />;
}

export default function App() {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem("theme") === "dark";
  });

  useEffect(() => {
    localStorage.setItem("theme", dark ? "dark" : "light");
    document.body.style.background = dark ? "#0F0F14" : "#F8F7F4";
    document.body.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

  const toggle = () => setDark(d => !d);

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/auth/success" element={<AuthSuccess />} />
          <Route path="/inbox" element={<PrivateRoute><InboxPage /></PrivateRoute>} />
          <Route path="/email/:id" element={<PrivateRoute><EmailDetailPage /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </ThemeContext.Provider>
  );
}
