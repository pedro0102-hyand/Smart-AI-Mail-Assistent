import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { api } from "../api";
import { useTheme } from "../App";

const CATEGORY_COLORS = {
  trabalho:   { bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE" },
  financeiro: { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
  pessoal:    { bg: "#D1FAE5", text: "#059669", border: "#A7F3D0" },
  marketing:  { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  spam:       { bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" },
  suporte:    { bg: "#EDE9FE", text: "#7C3AED", border: "#DDD6FE" },
  outro:      { bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" },
};

const CATEGORY_COLORS_DARK = {
  trabalho:   { bg: "#1E3A5F", text: "#60A5FA", border: "#1E40AF" },
  financeiro: { bg: "#4C1919", text: "#FCA5A5", border: "#7F1D1D" },
  pessoal:    { bg: "#064E3B", text: "#6EE7B7", border: "#065F46" },
  marketing:  { bg: "#451A03", text: "#FCD34D", border: "#78350F" },
  spam:       { bg: "#1F2937", text: "#9CA3AF", border: "#374151" },
  suporte:    { bg: "#2E1065", text: "#C4B5FD", border: "#4C1D95" },
  outro:      { bg: "#1F2937", text: "#9CA3AF", border: "#374151" },
};

const URGENCY_CONFIG = {
  alta:  { color: "#EF4444", bg: "#FEF2F2", bgDark: "#4C1919", label: "Alta urgência" },
  média: { color: "#F59E0B", bg: "#FFFBEB", bgDark: "#451A03", label: "Urgência média" },
  baixa: { color: "#10B981", bg: "#ECFDF5", bgDark: "#064E3B", label: "Baixa urgência" },
};

function formatDateFull(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function isHtml(str) {
  return /<[a-z][\s\S]*>/i.test(str);
}

const lightColors = {
  pageBg: "#F8F7F4",
  card:   "white",
  border: "transparent",
  shadow: "0 1px 3px rgba(0,0,0,0.05)",
  title:  "#1A1A2E",
  text:   "#374151",
  muted:  "#9CA3AF",
  inputBg: "#FAFAFA",
  replyToBg: "#F9FAFB",
};

const darkColors = {
  pageBg: "#0F0F14",
  card:   "#16161F",
  border: "#2A2A3A",
  shadow: "none",
  title:  "#E5E7EB",
  text:   "#D1D5DB",
  muted:  "#6B7280",
  inputBg: "#1E1E2E",
  replyToBg: "#1E1E2E",
};

export default function EmailDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { dark } = useTheme();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [message, setMessage] = useState(null);
  const [replyEdited, setReplyEdited] = useState(false);

  const c = dark ? darkColors : lightColors;
  const CATS = dark ? CATEGORY_COLORS_DARK : CATEGORY_COLORS;

  useEffect(() => { loadEmail(); }, [id]);

  async function loadEmail() {
    try {
      setLoading(true);
      const data = await api.getEmail(id);
      setEmail(data);
      if (data.analysis?.suggested_reply) {
        setReplyText(data.analysis.suggested_reply);
      }
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleAnalyze() {
    try {
      setAnalyzing(true);
      await api.analyzeEmail(id);
      await loadEmail();
      setMessage({ type: "success", text: "E-mail analisado com sucesso!" });
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setAnalyzing(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  async function handleSendReply() {
    if (!replyText.trim()) return;
    try {
      setSending(true);
      await api.replyEmail(id, replyText);
      setMessage({ type: "success", text: "Resposta enviada com sucesso!" });
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSending(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  if (loading) return (
    <div style={{ display: "flex", minHeight: "100vh", background: c.pageBg, transition: "background 0.3s" }}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <span style={{ fontSize: "14px", color: c.muted }}>Carregando e-mail...</span>
        </div>
      </main>
    </div>
  );

  if (!email) return (
    <div style={{ display: "flex", minHeight: "100vh", background: c.pageBg, transition: "background 0.3s" }}>
      <Sidebar />
      <main style={styles.main}>
        <div style={{ padding: "60px", textAlign: "center", color: c.muted }}>E-mail não encontrado.</div>
      </main>
    </div>
  );

  const cat = email.analysis?.category;
  const catStyle = cat ? (CATS[cat] || CATS.outro) : null;
  const urgency = email.analysis?.urgency;
  const urgConfig = urgency ? (URGENCY_CONFIG[urgency] || null) : null;
  const bodyIsHtml = email.body ? isHtml(email.body) : false;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: c.pageBg, fontFamily: "system-ui, sans-serif", transition: "background 0.3s" }}>
      <Sidebar />
      <main style={styles.main}>

        {/* Back button */}
        <button
          style={{ display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: c.muted, fontWeight: "500", marginBottom: "20px", padding: "0" }}
          onClick={() => navigate("/inbox")}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar
        </button>

        {/* Toast */}
        {message && (
          <div style={{
            padding: "12px 16px", borderRadius: "10px", fontSize: "14px", marginBottom: "16px", fontWeight: "500",
            background: message.type === "error" ? (dark ? "#4C1919" : "#FEE2E2") : (dark ? "#064E3B" : "#D1FAE5"),
            color: message.type === "error" ? (dark ? "#FCA5A5" : "#DC2626") : (dark ? "#6EE7B7" : "#059669"),
          }}>
            {message.text}
          </div>
        )}

        {/* Header card */}
        <div style={{ background: c.card, borderRadius: "16px", padding: "28px", marginBottom: "16px", boxShadow: c.shadow, border: `1px solid ${c.border}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "20px" }}>
            <h1 style={{ fontSize: "20px", fontWeight: "700", color: c.title, margin: 0, fontFamily: "Georgia, serif", lineHeight: "1.3", flex: 1 }}>
              {email.subject || "(sem assunto)"}
            </h1>
            {!email.analysis && (
              <button style={styles.analyzeBtn} onClick={handleAnalyze} disabled={analyzing}>
                {analyzing ? (
                  <><span style={styles.miniSpinner} /> Analisando...</>
                ) : (
                  <><span>✦</span> Analisar com IA</>
                )}
              </button>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: `hsl(${(email.sender?.charCodeAt(0) || 0) * 15}, 60%, 55%)`, color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: "700", flexShrink: 0 }}>
                {(email.sender || "?")[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: "14px", fontWeight: "600", color: c.title }}>{email.sender?.split("<")[0].trim() || "Desconhecido"}</div>
                <div style={{ fontSize: "12px", color: c.muted, marginTop: "2px" }}>{email.sender?.match(/<(.+)>/)?.[1] || email.sender}</div>
              </div>
            </div>
            <div style={{ fontSize: "12px", color: c.muted }}>{formatDateFull(email.date)}</div>
          </div>

          {/* Badges */}
          {email.analysis && (
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {cat && (
                <span style={{ fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "8px", background: catStyle.bg, color: catStyle.text, border: `1.5px solid ${catStyle.border}` }}>
                  {cat}
                </span>
              )}
              {urgConfig && (
                <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "8px", background: dark ? urgConfig.bgDark : urgConfig.bg, color: urgConfig.color }}>
                  <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: urgConfig.color, flexShrink: 0 }} />
                  {urgConfig.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* AI Analysis Panel */}
        {email.analysis && (
          <div style={{
            background: dark ? "linear-gradient(135deg, #1A1040, #0D1A2E)" : "linear-gradient(135deg, #F5F3FF, #EFF6FF)",
            border: `1.5px solid ${dark ? "#3B2A6E" : "#DDD6FE"}`,
            borderRadius: "16px", padding: "24px", marginBottom: "16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <div style={styles.aiIcon}>✦</div>
              <span style={{ fontSize: "14px", fontWeight: "700", color: dark ? "#C4B5FD" : "#4C1D95" }}>Análise da IA</span>
            </div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: dark ? "#A78BFA" : "#7C3AED", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
              Resumo
            </div>
            <p style={{ fontSize: "14px", color: dark ? "#D1D5DB" : "#374151", lineHeight: "1.7", margin: 0 }}>
              {email.analysis.summary}
            </p>
          </div>
        )}

        {/* Email body */}
        <div style={{ background: c.card, borderRadius: "16px", padding: "28px", marginBottom: "16px", boxShadow: c.shadow, border: `1px solid ${c.border}` }}>
          <div style={{ fontSize: "11px", fontWeight: "700", color: c.muted, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" }}>
            Conteúdo do e-mail
          </div>
          {email.body ? (
            bodyIsHtml ? (
              <div
                style={{ fontSize: "14px", color: c.text, lineHeight: "1.8", wordBreak: "break-word" }}
                dangerouslySetInnerHTML={{ __html: email.body }}
              />
            ) : (
              <div style={{ fontSize: "14px", color: c.text, lineHeight: "1.8", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {email.body.split("\n").map((line, i) => (
                  <React.Fragment key={i}>{line}<br /></React.Fragment>
                ))}
              </div>
            )
          ) : (
            <span style={{ color: c.muted, fontSize: "14px" }}>(sem conteúdo)</span>
          )}
        </div>

        {/* Reply section */}
        <div style={{ background: c.card, borderRadius: "16px", padding: "28px", boxShadow: c.shadow, border: `1px solid ${c.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
            </svg>
            <span style={{ fontSize: "14px", fontWeight: "700", color: c.title, flex: 1 }}>
              {email.analysis?.suggested_reply ? "Resposta sugerida pela IA" : "Escrever resposta"}
            </span>
            {email.analysis?.suggested_reply && !replyEdited && (
              <span style={styles.aiTag}>IA</span>
            )}
            {replyEdited && <span style={styles.editedTag}>editado</span>}
          </div>

          <div style={{ fontSize: "12px", color: c.text, marginBottom: "14px", padding: "8px 12px", background: c.replyToBg, borderRadius: "8px", border: `1px solid ${c.border}` }}>
            Para: <strong style={{ color: c.title }}>{email.sender?.split("<")[0].trim()}</strong>
            {" — "}<span style={{ color: c.muted }}>Re: {email.subject}</span>
          </div>

          <textarea
            style={{
              width: "100%", padding: "14px 16px", border: `1.5px solid ${c.border}`, borderRadius: "12px",
              fontSize: "14px", color: c.text, lineHeight: "1.7", resize: "vertical", outline: "none",
              fontFamily: "system-ui, sans-serif", background: c.inputBg,
              transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box",
            }}
            value={replyText}
            onChange={e => { setReplyText(e.target.value); setReplyEdited(true); }}
            placeholder={email.analysis?.suggested_reply ? "" : "Digite sua resposta aqui..."}
            rows={8}
          />

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" }}>
            <button
              style={{ padding: "9px 16px", border: `1.5px solid ${c.border}`, borderRadius: "10px", background: c.card, fontSize: "13px", fontWeight: "500", color: c.muted, cursor: "pointer" }}
              onClick={() => { setReplyText(email.analysis?.suggested_reply || ""); setReplyEdited(false); }}
            >
              Redefinir
            </button>
            <button
              style={{ ...styles.sendBtn, opacity: !replyText.trim() || sending ? 0.6 : 1 }}
              onClick={handleSendReply}
              disabled={!replyText.trim() || sending}
            >
              {sending ? (
                <><span style={styles.miniSpinnerWhite} /> Enviando...</>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                  Enviar resposta
                </>
              )}
            </button>
          </div>
        </div>

      </main>
    </div>
  );
}

const styles = {
  main: { flex: 1, padding: "32px 40px", maxWidth: "860px" },
  loadingContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", gap: "14px" },
  spinner: { width: "32px", height: "32px", border: "3px solid #E5E7EB", borderTop: "3px solid #6366F1", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  miniSpinner: { display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(99,102,241,0.3)", borderTop: "2px solid #6366F1", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: "6px" },
  miniSpinnerWhite: { display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: "6px" },
  analyzeBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", border: "none", borderRadius: "10px", color: "white", fontSize: "13px", fontWeight: "600", cursor: "pointer", flexShrink: 0 },
  aiIcon: { width: "28px", height: "28px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "14px" },
  aiTag: { fontSize: "10px", fontWeight: "700", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "white", padding: "2px 7px", borderRadius: "6px", letterSpacing: "0.5px" },
  editedTag: { fontSize: "10px", fontWeight: "600", background: "#FEF3C7", color: "#D97706", padding: "2px 7px", borderRadius: "6px" },
  sendBtn: { display: "flex", alignItems: "center", gap: "7px", padding: "9px 20px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", border: "none", borderRadius: "10px", color: "white", fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "opacity 0.2s" },
};