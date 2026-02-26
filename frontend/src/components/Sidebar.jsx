import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTheme } from "../App";

const NAV_ITEMS = [
  {
    path: "/inbox",
    label: "Caixa de entrada",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
  },
  {
    path: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { dark, toggle } = useTheme();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  const s = getStyles(dark);

  return (
    <aside style={s.sidebar}>
      <div style={s.brand}>
        <div style={s.logoIcon}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <span style={s.brandName}>Smart AI Mail Assistent</span>
      </div>

      <nav style={s.nav}>
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{ ...s.navItem, ...(active ? s.navItemActive : {}) }}
            >
              <span style={{ color: active ? "#6366F1" : dark ? "#6B7280" : "#9CA3AF" }}>{item.icon}</span>
              <span style={{ ...s.navLabel, color: active ? (dark ? "#E5E7EB" : "#1A1A2E") : dark ? "#9CA3AF" : "#6B7280" }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Dark mode toggle */}
      <button style={s.darkToggle} onClick={toggle} title={dark ? "Modo claro" : "Modo escuro"}>
        {dark ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
        <span style={s.darkToggleText}>{dark ? "Modo claro" : "Modo escuro"}</span>
      </button>

      <button style={s.logout} onClick={handleLogout}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={dark ? "#6B7280" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        <span style={s.logoutText}>Sair</span>
      </button>
    </aside>
  );
}

function getStyles(dark) {
  return {
    sidebar: { width: "220px", minHeight: "100vh", background: dark ? "#16161F" : "white", borderRight: `1px solid ${dark ? "#2A2A3A" : "#F3F4F6"}`, display: "flex", flexDirection: "column", padding: "24px 16px", flexShrink: 0, transition: "background 0.3s, border-color 0.3s" },
    brand: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "36px", paddingLeft: "8px" },
    logoIcon: { width: "32px", height: "32px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" },
    brandName: { fontSize: "17px", fontWeight: "700", color: dark ? "#E5E7EB" : "#1A1A2E", letterSpacing: "-0.3px", fontFamily: "Georgia, serif" },
    nav: { display: "flex", flexDirection: "column", gap: "4px", flex: 1 },
    navItem: { display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "10px", border: "none", background: "transparent", cursor: "pointer", transition: "background 0.15s", width: "100%", textAlign: "left" },
    navItemActive: { background: dark ? "#1E1E2E" : "#F5F3FF" },
    navLabel: { fontSize: "14px", fontWeight: "500", fontFamily: "system-ui, sans-serif" },
    darkToggle: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: `1px solid ${dark ? "#2A2A3A" : "#F3F4F6"}`, background: dark ? "#1E1E2E" : "#FAFAFA", cursor: "pointer", borderRadius: "10px", marginBottom: "8px", width: "100%" },
    darkToggleText: { fontSize: "13px", color: dark ? "#9CA3AF" : "#6B7280", fontFamily: "system-ui, sans-serif" },
    logout: { display: "flex", alignItems: "center", gap: "8px", padding: "10px 12px", border: "none", background: "transparent", cursor: "pointer", borderRadius: "10px" },
    logoutText: { fontSize: "14px", color: dark ? "#6B7280" : "#9CA3AF", fontFamily: "system-ui, sans-serif" },
  };
}