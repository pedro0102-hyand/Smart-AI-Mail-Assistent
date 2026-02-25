import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { api } from "../api";

const CATEGORY_COLORS = {
  trabalho:   { bg: "#DBEAFE", text: "#1D4ED8", border: "#BFDBFE" },
  financeiro: { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" },
  pessoal:    { bg: "#D1FAE5", text: "#059669", border: "#A7F3D0" },
  marketing:  { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" },
  spam:       { bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" },
  suporte:    { bg: "#EDE9FE", text: "#7C3AED", border: "#DDD6FE" },
  outro:      { bg: "#F3F4F6", text: "#6B7280", border: "#E5E7EB" },
};

const URGENCY_CONFIG = {
  alta:  { color: "#EF4444", bg: "#FEF2F2", label: "Alta urgência" },
  média: { color: "#F59E0B", bg: "#FFFBEB", label: "Urgência média" },
  baixa: { color: "#10B981", bg: "#ECFDF5", label: "Baixa urgência" },
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

export default function EmailDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [sending, setSending] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [message, setMessage] = useState(null);
  const [replyEdited, setReplyEdited] = useState(false);

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
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.loadingContainer}>
          <div style={styles.spinner} />
          <span style={styles.loadingText}>Carregando e-mail...</span>
        </div>
      </main>
    </div>
  );

  if (!email) return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        <div style={styles.empty}>E-mail não encontrado.</div>
      </main>
    </div>
  );

  const cat = email.analysis?.category;
  const catStyle = cat ? (CATEGORY_COLORS[cat] || CATEGORY_COLORS.outro) : null;
  const urgency = email.analysis?.urgency;
  const urgConfig = urgency ? (URGENCY_CONFIG[urgency] || null) : null;
  const bodyIsHtml = email.body ? isHtml(email.body) : false;

  return (
    <div style={styles.layout}>
      <Sidebar />
      <main style={styles.main}>
        {/* Back button */}
        <button style={styles.backBtn} onClick={() => navigate("/inbox")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Voltar
        </button>

        {message && (
          <div style={{ ...styles.toast, background: message.type === "error" ? "#FEE2E2" : "#D1FAE5", color: message.type === "error" ? "#DC2626" : "#059669" }}>
            {message.text}
          </div>
        )}

        {/* Email header card */}
        <div style={styles.headerCard}>
          <div style={styles.subjectRow}>
            <h1 style={styles.subject}>{email.subject || "(sem assunto)"}</h1>
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

          <div style={styles.metaRow}>
            <div style={styles.avatarMeta}>
              <div style={{ ...styles.avatar, background: `hsl(${(email.sender?.charCodeAt(0) || 0) * 15}, 60%, 55%)` }}>
                {(email.sender || "?")[0].toUpperCase()}
              </div>
              <div>
                <div style={styles.senderName}>{email.sender?.split("<")[0].trim() || "Desconhecido"}</div>
                <div style={styles.senderEmail}>{email.sender?.match(/<(.+)>/)?.[1] || email.sender}</div>
              </div>
            </div>
            <div style={styles.dateText}>{formatDateFull(email.date)}</div>
          </div>

          {/* Badges */}
          {email.analysis && (
            <div style={styles.badgesRow}>
              {cat && <span style={{ ...styles.categoryBadge, background: catStyle.bg, color: catStyle.text, border: `1.5px solid ${catStyle.border}` }}>{cat}</span>}
              {urgConfig && (
                <span style={{ ...styles.urgencyBadge, background: urgConfig.bg, color: urgConfig.color }}>
                  <span style={{ ...styles.urgencyDot, background: urgConfig.color }} />
                  {urgConfig.label}
                </span>
              )}
            </div>
          )}
        </div>

        {/* AI Analysis Panel */}
        {email.analysis && (
          <div style={styles.aiPanel}>
            <div style={styles.aiPanelHeader}>
              <div style={styles.aiIcon}>✦</div>
              <span style={styles.aiPanelTitle}>Análise da IA</span>
            </div>
            <div style={styles.summaryBox}>
              <div style={styles.summaryLabel}>Resumo</div>
              <p style={styles.summaryText}>{email.analysis.summary}</p>
            </div>
          </div>
        )}

        {/* Email body */}
        <div style={styles.bodyCard}>
          <div style={styles.bodyLabel}>Conteúdo do e-mail</div>
          {email.body ? (
            bodyIsHtml ? (
              <div
                style={styles.bodyHtml}
                dangerouslySetInnerHTML={{ __html: email.body }}
              />
            ) : (
              <div style={styles.bodyText}>
                {email.body.split("\n").map((line, i) => (
                  <React.Fragment key={i}>{line}<br /></React.Fragment>
                ))}
              </div>
            )
          ) : (
            <span style={{ color: "#9CA3AF", fontSize: "14px" }}>(sem conteúdo)</span>
          )}
        </div>

        {/* Reply section */}
        <div style={styles.replyCard}>
          <div style={styles.replyHeader}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
            </svg>
            <span style={styles.replyTitle}>
              {email.analysis?.suggested_reply ? "Resposta sugerida pela IA" : "Escrever resposta"}
            </span>
            {email.analysis?.suggested_reply && !replyEdited && (
              <span style={styles.aiTag}>IA</span>
            )}
            {replyEdited && <span style={styles.editedTag}>editado</span>}
          </div>

          <div style={styles.replyTo}>
            Para: <strong>{email.sender?.split("<")[0].trim()}</strong>
            {" — "}<span style={{ color: "#9CA3AF" }}>Re: {email.subject}</span>
          </div>

          <textarea
            style={styles.replyTextarea}
            value={replyText}
            onChange={e => { setReplyText(e.target.value); setReplyEdited(true); }}
            placeholder={email.analysis?.suggested_reply ? "" : "Digite sua resposta aqui..."}
            rows={8}
          />

          <div style={styles.replyActions}>
            <button
              style={styles.discardBtn}
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
  layout: { display: "flex", minHeight: "100vh", background: "#F8F7F4", fontFamily: "system-ui, sans-serif" },
  main: { flex: 1, padding: "32px 40px", maxWidth: "860px" },
  loadingContainer: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", gap: "14px" },
  spinner: { width: "32px", height: "32px", border: "3px solid #E5E7EB", borderTop: "3px solid #6366F1", borderRadius: "50%", animation: "spin 0.8s linear infinite" },
  miniSpinner: { display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(99,102,241,0.3)", borderTop: "2px solid #6366F1", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: "6px" },
  miniSpinnerWhite: { display: "inline-block", width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.4)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.7s linear infinite", marginRight: "6px" },
  loadingText: { fontSize: "14px", color: "#9CA3AF" },
  empty: { padding: "60px", textAlign: "center", color: "#9CA3AF" },
  backBtn: { display: "flex", alignItems: "center", gap: "6px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", color: "#6B7280", fontWeight: "500", marginBottom: "20px", padding: "0" },
  toast: { padding: "12px 16px", borderRadius: "10px", fontSize: "14px", marginBottom: "16px", fontWeight: "500" },

  headerCard: { background: "white", borderRadius: "16px", padding: "28px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  subjectRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", marginBottom: "20px" },
  subject: { fontSize: "20px", fontWeight: "700", color: "#1A1A2E", margin: 0, fontFamily: "Georgia, serif", lineHeight: "1.3", flex: 1 },
  analyzeBtn: { display: "flex", alignItems: "center", gap: "6px", padding: "9px 16px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", border: "none", borderRadius: "10px", color: "white", fontSize: "13px", fontWeight: "600", cursor: "pointer", flexShrink: 0 },

  metaRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  avatarMeta: { display: "flex", alignItems: "center", gap: "12px" },
  avatar: { width: "40px", height: "40px", borderRadius: "50%", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", fontWeight: "700", flexShrink: 0 },
  senderName: { fontSize: "14px", fontWeight: "600", color: "#1A1A2E" },
  senderEmail: { fontSize: "12px", color: "#9CA3AF", marginTop: "2px" },
  dateText: { fontSize: "12px", color: "#9CA3AF" },

  badgesRow: { display: "flex", gap: "8px", flexWrap: "wrap" },
  categoryBadge: { fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "8px" },
  urgencyBadge: { display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "8px" },
  urgencyDot: { width: "7px", height: "7px", borderRadius: "50%", flexShrink: 0 },

  aiPanel: { background: "linear-gradient(135deg, #F5F3FF, #EFF6FF)", border: "1.5px solid #DDD6FE", borderRadius: "16px", padding: "24px", marginBottom: "16px" },
  aiPanelHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" },
  aiIcon: { width: "28px", height: "28px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "14px" },
  aiPanelTitle: { fontSize: "14px", fontWeight: "700", color: "#4C1D95" },
  summaryBox: {},
  summaryLabel: { fontSize: "11px", fontWeight: "700", color: "#7C3AED", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" },
  summaryText: { fontSize: "14px", color: "#374151", lineHeight: "1.7", margin: 0 },

  bodyCard: { background: "white", borderRadius: "16px", padding: "28px", marginBottom: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  bodyLabel: { fontSize: "11px", fontWeight: "700", color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "16px" },
  bodyText: { fontSize: "14px", color: "#374151", lineHeight: "1.8", whiteSpace: "pre-wrap", wordBreak: "break-word" },
  bodyHtml: { fontSize: "14px", color: "#374151", lineHeight: "1.8", wordBreak: "break-word" },

  replyCard: { background: "white", borderRadius: "16px", padding: "28px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" },
  replyHeader: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" },
  replyTitle: { fontSize: "14px", fontWeight: "700", color: "#1A1A2E", flex: 1 },
  aiTag: { fontSize: "10px", fontWeight: "700", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", color: "white", padding: "2px 7px", borderRadius: "6px", letterSpacing: "0.5px" },
  editedTag: { fontSize: "10px", fontWeight: "600", background: "#FEF3C7", color: "#D97706", padding: "2px 7px", borderRadius: "6px" },
  replyTo: { fontSize: "12px", color: "#6B7280", marginBottom: "14px", padding: "8px 12px", background: "#F9FAFB", borderRadius: "8px" },
  replyTextarea: { width: "100%", padding: "14px 16px", border: "1.5px solid #E5E7EB", borderRadius: "12px", fontSize: "14px", color: "#374151", lineHeight: "1.7", resize: "vertical", outline: "none", fontFamily: "system-ui, sans-serif", background: "#FAFAFA", transition: "border-color 0.2s, box-shadow 0.2s", boxSizing: "border-box" },
  replyActions: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px" },
  discardBtn: { padding: "9px 16px", border: "1.5px solid #E5E7EB", borderRadius: "10px", background: "white", fontSize: "13px", fontWeight: "500", color: "#6B7280", cursor: "pointer" },
  sendBtn: { display: "flex", alignItems: "center", gap: "7px", padding: "9px 20px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", border: "none", borderRadius: "10px", color: "white", fontSize: "13px", fontWeight: "600", cursor: "pointer", transition: "opacity 0.2s" },
};