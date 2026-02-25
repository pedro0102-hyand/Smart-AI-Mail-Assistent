import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { api } from "../api";
import { useTheme } from "../App";

const CATEGORY_COLORS = {
  trabalho:   { bg: "#DBEAFE", text: "#1D4ED8" },
  financeiro: { bg: "#FEE2E2", text: "#DC2626" },
  pessoal:    { bg: "#D1FAE5", text: "#059669" },
  marketing:  { bg: "#FEF3C7", text: "#D97706" },
  spam:       { bg: "#F3F4F6", text: "#6B7280" },
  suporte:    { bg: "#EDE9FE", text: "#7C3AED" },
  outro:      { bg: "#F3F4F6", text: "#6B7280" },
};

const CATEGORY_COLORS_DARK = {
  trabalho:   { bg: "#1E3A5F", text: "#60A5FA" },
  financeiro: { bg: "#4C1919", text: "#FCA5A5" },
  pessoal:    { bg: "#064E3B", text: "#6EE7B7" },
  marketing:  { bg: "#451A03", text: "#FCD34D" },
  spam:       { bg: "#1F2937", text: "#9CA3AF" },
  suporte:    { bg: "#2E1065", text: "#C4B5FD" },
  outro:      { bg: "#1F2937", text: "#9CA3AF" },
};

const URGENCY_DOT = {
  alta:  "#EF4444",
  média: "#F59E0B",
  baixa: "#10B981",
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000) return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return d.toLocaleDateString("pt-BR", { weekday: "short" });
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

export default function InboxPage() {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => { loadEmails(); }, []);

  async function loadEmails() {
    try {
      setLoading(true);
      const data = await api.getEmails();
      setEmails(data);
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleSync() {
    try {
      setSyncing(true);
      const res = await api.syncEmails();
      setMessage({ type: "success", text: `${res.novos_emails} novos e-mails sincronizados.` });
      await loadEmails();
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSyncing(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleAnalyzeAll() {
    try {
      setAnalyzing(true);
      const res = await api.analyzeAll();
      setMessage({ type: "success", text: `${res.processados} e-mails analisados pela IA.` });
      await loadEmails();
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setAnalyzing(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  const CATS = dark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: dark ? "#0F0F14" : "#F8F7F4", fontFamily: "system-ui, sans-serif", transition: "background 0.3s" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "36px 40px", maxWidth: "900px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "700", color: dark ? "#E5E7EB" : "#1A1A2E", margin: 0, fontFamily: "Georgia, serif" }}>Caixa de entrada</h1>
            <p style={{ fontSize: "13px", color: "#9CA3AF", margin: "4px 0 0" }}>{emails.length} e-mails carregados</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              style={{ padding: "9px 16px", border: `1.5px solid ${dark ? "#2A2A3A" : "#E5E7EB"}`, borderRadius: "10px", background: dark ? "#16161F" : "white", fontSize: "13px", fontWeight: "600", color: dark ? "#9CA3AF" : "#4B5563", cursor: "pointer" }}
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing ? "Sincronizando..." : "↻ Sincronizar"}
            </button>
            <button
              style={{ padding: "9px 16px", border: "none", borderRadius: "10px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", fontSize: "13px", fontWeight: "600", color: "white", cursor: "pointer" }}
              onClick={handleAnalyzeAll}
              disabled={analyzing}
            >
              {analyzing ? "Analisando..." : "✦ Analisar com IA"}
            </button>
          </div>
        </div>

        {message && (
          <div style={{ padding: "12px 16px", borderRadius: "10px", fontSize: "14px", marginBottom: "16px", fontWeight: "500", background: message.type === "error" ? "#FEE2E2" : "#D1FAE5", color: message.type === "error" ? "#DC2626" : "#059669" }}>
            {message.text}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ height: "80px", background: dark ? "#16161F" : "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)", borderRadius: "12px", marginBottom: "2px" }} />
            ))
          ) : emails.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "#9CA3AF", fontSize: "14px" }}>
              <p>Nenhum e-mail encontrado. Clique em "Sincronizar".</p>
            </div>
          ) : (
            emails.map((email) => {
              const cat = email.analysis?.category || null;
              const catStyle = cat ? (CATS[cat] || CATS.outro) : null;
              const urgency = email.analysis?.urgency || null;
              const rowBg = dark ? (email.is_read ? "#16161F" : "#1A1A2E") : (email.is_read ? "white" : "#FDFCFF");
              return (
                <div
                  key={email.id}
                  style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "16px 20px", background: rowBg, borderRadius: "12px", cursor: "pointer", transition: "background 0.15s", border: `1px solid ${dark ? "#1E1E2E" : "transparent"}` }}
                  onClick={() => navigate(`/email/${email.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = dark ? "#1E1E2E" : "#FAFAFA"}
                  onMouseLeave={e => e.currentTarget.style.background = rowBg}
                >
                  <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `hsl(${(email.sender?.charCodeAt(0) || 0) * 15}, 60%, 55%)`, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: "700", flexShrink: 0 }}>
                    {(email.sender || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                      <span style={{ fontSize: "14px", color: dark ? "#E5E7EB" : "#1A1A2E", fontWeight: email.is_read ? 500 : 700 }}>
                        {email.sender?.split("<")[0].trim() || "Desconhecido"}
                      </span>
                      <span style={{ fontSize: "12px", color: "#9CA3AF", flexShrink: 0 }}>{formatDate(email.date)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: "13px", color: dark ? "#9CA3AF" : "#374151", fontWeight: email.is_read ? 400 : 600, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {email.subject}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "10px" }}>
                        {urgency && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: URGENCY_DOT[urgency] || "#ccc", flexShrink: 0 }} title={urgency} />}
                        {cat && <span style={{ fontSize: "11px", fontWeight: "600", padding: "2px 7px", borderRadius: "6px", background: catStyle.bg, color: catStyle.text }}>{cat}</span>}
                      </div>
                    </div>
                    {email.analysis?.summary && (
                      <p style={{ fontSize: "12px", color: dark ? "#6B7280" : "#9CA3AF", margin: "4px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {email.analysis.summary}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}