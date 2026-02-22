import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { api } from "../api";

const CATEGORY_COLORS = {
  trabalho:   { bg: "#DBEAFE", text: "#1D4ED8" },
  financeiro: { bg: "#FEE2E2", text: "#DC2626" },
  pessoal:    { bg: "#D1FAE5", text: "#059669" },
  marketing:  { bg: "#FEF3C7", text: "#D97706" },
  spam:       { bg: "#F3F4F6", text: "#6B7280" },
  suporte:    { bg: "#EDE9FE", text: "#7C3AED" },
  outro:      { bg: "#F3F4F6", text: "#6B7280" },
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

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Caixa de entrada</h1>
            <p style={styles.subtitle}>{emails.length} e-mails carregados</p>
          </div>
          <div style={styles.actions}>
            <button style={styles.btnSecondary} onClick={handleSync} disabled={syncing}>
              {syncing ? "Sincronizando..." : "↻ Sincronizar"}
            </button>
            <button style={styles.btnPrimary} onClick={handleAnalyzeAll} disabled={analyzing}>
              {analyzing ? "Analisando..." : "✦ Analisar com IA"}
            </button>
          </div>
        </div>

        {message && (
          <div style={{ ...styles.toast, background: message.type === "error" ? "#FEE2E2" : "#D1FAE5", color: message.type === "error" ? "#DC2626" : "#059669" }}>
            {message.text}
          </div>
        )}

        <div style={styles.list}>
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <div key={i} style={styles.skeleton} />)
          ) : emails.length === 0 ? (
            <div style={styles.empty}><p>Nenhum e-mail encontrado. Clique em "Sincronizar".</p></div>
          ) : (
            emails.map((email) => {
              const cat = email.analysis?.category || null;
              const catStyle = cat ? CATEGORY_COLORS[cat] || CATEGORY_COLORS.outro : null;
              const urgency = email.analysis?.urgency || null;
              return (
                <div
                  key={email.id}
                  style={{ ...styles.emailRow, ...(email.is_read ? {} : styles.emailUnread) }}
                  onClick={() => navigate(`/email/${email.id}`)}
                  onMouseEnter={e => e.currentTarget.style.background = "#FAFAFA"}
                  onMouseLeave={e => e.currentTarget.style.background = email.is_read ? "white" : "#FDFCFF"}
                >
                  <div style={{ ...styles.avatar, background: `hsl(${(email.sender?.charCodeAt(0) || 0) * 15}, 60%, 55%)` }}>
                    {(email.sender || "?")[0].toUpperCase()}
                  </div>
                  <div style={styles.emailContent}>
                    <div style={styles.emailTop}>
                      <span style={{ ...styles.senderName, fontWeight: email.is_read ? 500 : 700 }}>
                        {email.sender?.split("<")[0].trim() || "Desconhecido"}
                      </span>
                      <span style={styles.emailDate}>{formatDate(email.date)}</span>
                    </div>
                    <div style={styles.emailBottom}>
                      <span style={{ ...styles.subject, fontWeight: email.is_read ? 400 : 600 }}>
                        {email.subject}
                      </span>
                      <div style={styles.tags}>
                        {urgency && <span style={{ ...styles.urgencyDot, background: URGENCY_DOT[urgency] || "#ccc" }} title={urgency} />}
                        {cat && <span style={{ ...styles.categoryTag, background: catStyle.bg, color: catStyle.text }}>{cat}</span>}
                      </div>
                    </div>
                    {email.analysis?.summary && <p style={styles.summary}>{email.analysis.summary}</p>}
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

const styles = {
  layout: { display: "flex", minHeight: "100vh", background: "#F8F7F4", fontFamily: "system-ui, sans-serif" },
  main: { flex: 1, padding: "36px 40px", maxWidth: "900px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" },
  title: { fontSize: "24px", fontWeight: "700", color: "#1A1A2E", margin: 0, fontFamily: "Georgia, serif" },
  subtitle: { fontSize: "13px", color: "#9CA3AF", margin: "4px 0 0" },
  actions: { display: "flex", gap: "10px" },
  btnSecondary: { padding: "9px 16px", border: "1.5px solid #E5E7EB", borderRadius: "10px", background: "white", fontSize: "13px", fontWeight: "600", color: "#4B5563", cursor: "pointer" },
  btnPrimary: { padding: "9px 16px", border: "none", borderRadius: "10px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", fontSize: "13px", fontWeight: "600", color: "white", cursor: "pointer" },
  toast: { padding: "12px 16px", borderRadius: "10px", fontSize: "14px", marginBottom: "16px", fontWeight: "500" },
  list: { display: "flex", flexDirection: "column", gap: "2px" },
  skeleton: { height: "80px", background: "linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)", borderRadius: "12px", marginBottom: "2px" },
  empty: { textAlign: "center", padding: "60px 0", color: "#9CA3AF", fontSize: "14px" },
  emailRow: { display: "flex", alignItems: "flex-start", gap: "14px", padding: "16px 20px", background: "white", borderRadius: "12px", cursor: "pointer", transition: "background 0.15s" },
  emailUnread: { background: "#FDFCFF" },
  avatar: { width: "40px", height: "40px", borderRadius: "50%", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: "700", flexShrink: 0 },
  emailContent: { flex: 1, minWidth: 0 },
  emailTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" },
  senderName: { fontSize: "14px", color: "#1A1A2E" },
  emailDate: { fontSize: "12px", color: "#9CA3AF", flexShrink: 0 },
  emailBottom: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  subject: { fontSize: "13px", color: "#374151", flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  tags: { display: "flex", alignItems: "center", gap: "6px", flexShrink: 0, marginLeft: "10px" },
  urgencyDot: { width: "8px", height: "8px", borderRadius: "50%", flexShrink: 0 },
  categoryTag: { fontSize: "11px", fontWeight: "600", padding: "2px 7px", borderRadius: "6px" },
  summary: { fontSize: "12px", color: "#9CA3AF", margin: "4px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
};