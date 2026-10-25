import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar, { MobileHeader } from "../components/Sidebar";
import { api } from "../api";
import { useTheme } from "../App";

const URGENCY_CLASS = {
  alta: "urgency-high",
  média: "urgency-medium",
  baixa: "urgency-low",
};

function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diff = now - date;
  if (diff < 86400000) return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  if (diff < 604800000) return date.toLocaleDateString("pt-BR", { weekday: "short" });
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth <= 640);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return isMobile;
}

function MailIcon({ name }) {
  const paths = {
    all: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
    inbox: <><path d="M4 4h16v16H4z" /><path d="M4 13h4l2 3h4l2-3h4" /></>,
    spam: <><path d="M12 3 2.8 19h18.4L12 3Z" /><path d="M12 9v4m0 3h.01" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" /></>,
    sparkle: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1.1 2.4L22 17l-1.9.7L19 20l-.9-2.3L16 17l2.1-.6L19 14Z" /></>,
  };

  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

export default function InboxPage() {
  const navigate = useNavigate();
  const { dark } = useTheme();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState(null);
  const [spamFilter, setSpamFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const loadEmails = useCallback(async () => {
    try {
      setLoading(true);
      const isSpamParam = spamFilter === "all" ? null : spamFilter === "spam";
      const data = await api.getEmails(0, 50, isSpamParam);
      setEmails(data);
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [spamFilter]);

  useEffect(() => { loadEmails(); }, [loadEmails]);

  async function handleSync() {
    try {
      setSyncing(true);
      const result = await api.syncEmails();
      setMessage({ type: "success", text: `${result.novos_emails} novos e-mails sincronizados.` });
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
      const result = await api.analyzeAll();
      setMessage({ type: "success", text: `${result.processados} e-mails analisados pela IA.` });
      await loadEmails();
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setAnalyzing(false);
      setTimeout(() => setMessage(null), 3000);
    }
  }

  const filteredEmails = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase("pt-BR");
    if (!query) return emails;
    return emails.filter((email) =>
      [email.sender, email.subject, email.snippet, email.analysis?.summary]
        .some((value) => value?.toLocaleLowerCase("pt-BR").includes(query)),
    );
  }, [emails, searchTerm]);

  const unreadCount = emails.filter((email) => !email.is_read).length;
  const spamCount = emails.filter((email) => email.is_spam).length;
  const tabs = [
    { id: "all", label: "Todos", icon: "all" },
    { id: "inbox", label: "Caixa limpa", icon: "inbox" },
    { id: "spam", label: "Spam", icon: "spam" },
  ];

  return (
    <div className={`app-shell ${dark ? "theme-dark" : "theme-light"}`}>
      {!isMobile && <Sidebar />}
      {isMobile && (
        <Sidebar
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
        />
      )}

      <div className="app-main-column">
        {isMobile && <MobileHeader onOpen={() => setSidebarOpen(true)} dark={dark} />}

        <main className="inbox-main">
          <header className="inbox-page-header">
            <div className="inbox-heading">
              <span className="inbox-eyebrow"><span className="inbox-eyebrow-dot" /> SEU ESPAÇO DE TRABALHO</span>
              <h1>Caixa de entrada</h1>
              <p>Seus e-mails, organizados com inteligência.</p>
            </div>
            <div className="inbox-header-actions">
              <button className="inbox-button inbox-button-secondary" onClick={handleSync} disabled={syncing} type="button">
                <MailIcon name="refresh" />
                <span>{syncing ? "Sincronizando..." : "Sincronizar"}</span>
              </button>
              <button className="inbox-button inbox-button-primary" onClick={handleAnalyzeAll} disabled={analyzing} type="button">
                <MailIcon name="sparkle" />
                <span>{analyzing ? "Analisando..." : "Analisar com IA"}</span>
              </button>
            </div>
          </header>

          {message && (
            <div className={`inbox-notice ${message.type}`} role={message.type === "error" ? "alert" : "status"}>
              <span className="inbox-notice-mark">{message.type === "error" ? "!" : "✓"}</span>
              <span>{message.text}</span>
              <button type="button" onClick={() => setMessage(null)} aria-label="Fechar aviso">×</button>
            </div>
          )}

          <section className="inbox-stat-grid" aria-label="Resumo dos e-mails carregados">
            <article className="inbox-stat-card">
              <span className="inbox-stat-icon stat-icon-indigo"><MailIcon name="all" /></span>
              <div><strong>{emails.length}</strong><span>E-mails carregados</span></div>
              <span className="inbox-stat-note">últimos 50</span>
            </article>
            <article className="inbox-stat-card">
              <span className="inbox-stat-icon stat-icon-blue"><MailIcon name="inbox" /></span>
              <div><strong>{unreadCount}</strong><span>Não lidos</span></div>
            </article>
            <article className="inbox-stat-card">
              <span className="inbox-stat-icon stat-icon-rose"><MailIcon name="spam" /></span>
              <div><strong>{spamCount}</strong><span>Spams identificados</span></div>
              <span className="inbox-stat-note">Naive Bayes</span>
            </article>
          </section>

          <section className="inbox-list-panel" aria-label="Lista de e-mails">
            <div className="inbox-list-heading">
              <div>
                <h2>Seus e-mails</h2>
                <p>Consulte, filtre e acompanhe suas mensagens.</p>
              </div>
              <span className="inbox-results-count">{filteredEmails.length} {filteredEmails.length === 1 ? "mensagem" : "mensagens"}</span>
            </div>

            <div className="inbox-toolbar">
              <div className="inbox-tabs" role="tablist" aria-label="Filtrar e-mails">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={spamFilter === tab.id}
                    className={`inbox-tab ${spamFilter === tab.id ? "active" : ""}`}
                    onClick={() => setSpamFilter(tab.id)}
                  >
                    <MailIcon name={tab.icon} />
                    <span>{tab.label}</span>
                    {tab.id === "spam" && spamCount > 0 && <span className="inbox-tab-count">{spamCount}</span>}
                  </button>
                ))}
              </div>

              <label className="inbox-search">
                <MailIcon name="search" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar e-mails..."
                  aria-label="Buscar e-mails"
                />
                {searchTerm && (
                  <button type="button" onClick={() => setSearchTerm("")} aria-label="Limpar busca">×</button>
                )}
              </label>
            </div>

            <div className="inbox-email-list" aria-live="polite">
              {loading ? (
                <div className="inbox-skeleton-list" aria-label="Carregando e-mails">
                  {Array.from({ length: 5 }).map((_, index) => <div key={index} className="inbox-skeleton" />)}
                </div>
              ) : filteredEmails.length === 0 ? (
                <div className="inbox-empty-state">
                  <span className="inbox-empty-icon"><MailIcon name={searchTerm ? "search" : spamFilter === "spam" ? "spam" : "inbox"} /></span>
                  <h3>{searchTerm ? "Nenhum resultado para sua busca" : spamFilter === "spam" ? "Nenhum spam encontrado" : "Sua caixa está vazia"}</h3>
                  <p>{searchTerm ? "Tente pesquisar por outro remetente, assunto ou conteúdo." : "Sincronize sua conta para carregar suas mensagens."}</p>
                  {!searchTerm && spamFilter !== "spam" && (
                    <button className="inbox-button inbox-button-secondary" onClick={handleSync} disabled={syncing} type="button">
                      <MailIcon name="refresh" />
                      <span>{syncing ? "Sincronizando..." : "Sincronizar e-mails"}</span>
                    </button>
                  )}
                </div>
              ) : (
                filteredEmails.map((email) => {
                  const category = email.analysis?.category;
                  const urgency = email.analysis?.urgency;
                  const productivity = email.is_spam ? null : email.productivity;
                  const sender = email.sender?.split("<")[0].trim() || "Desconhecido";
                  const initial = sender.charAt(0).toLocaleUpperCase("pt-BR");
                  const avatarHue = (sender.charCodeAt(0) || 0) * 15;

                  return (
                    <button
                      key={email.id}
                      className={`inbox-email-row ${email.is_read ? "" : "unread"} ${email.is_spam ? "is-spam" : ""}`}
                      type="button"
                      onClick={() => navigate(`/email/${email.id}`)}
                      aria-label={`Abrir e-mail de ${sender}: ${email.subject || "sem assunto"}`}
                    >
                      <span className="inbox-email-avatar" style={{ "--avatar-hue": avatarHue }}>{initial}</span>
                      <span className="inbox-email-content">
                        <span className="inbox-email-topline">
                          <span className="inbox-email-sender">{sender}</span>
                          <span className="inbox-email-date">{formatDate(email.date)}</span>
                        </span>
                        <span className="inbox-email-subject-line">
                          <span className="inbox-email-subject">{email.subject || "(sem assunto)"}</span>
                          <span className="inbox-email-badges">
                            {urgency && <span className={`inbox-urgency-dot ${URGENCY_CLASS[urgency] || ""}`} title={`Urgência ${urgency}`} />}
                            {category && <span className={`inbox-category category-${category}`}>{category}</span>}
                            {productivity && (
                              <span
                                className={`inbox-productivity-badge ${productivity.is_productive ? "is-productive" : "is-unproductive"}`}
                                title={`Classificação de produtividade: ${productivity.label}; score ${Math.round(productivity.productive_score * 100)}%`}
                              >
                                {productivity.is_productive ? "Produtivo" : "Não produtivo"}
                                {Number.isFinite(productivity.productive_score) && ` · ${Math.round(productivity.productive_score * 100)}%`}
                              </span>
                            )}
                            {email.is_spam && (
                              <span className="inbox-spam-badge">
                                <MailIcon name="spam" />
                                Spam{typeof email.spam_score === "number" ? ` · ${Math.round(email.spam_score * 100)}%` : ""}
                              </span>
                            )}
                          </span>
                        </span>
                        <span className="inbox-email-snippet">{email.analysis?.summary || email.snippet || "Abra para ver o conteúdo desta mensagem."}</span>
                      </span>
                      {!email.is_read && <span className="inbox-unread-indicator" aria-label="Não lido" />}
                    </button>
                  );
                })
              )}
            </div>
            {!loading && emails.length === 50 && (
              <div className="inbox-list-footer">Exibindo os 50 e-mails mais recentes.</div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
