import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar, { MobileHeader } from "../components/Sidebar";
import { api } from "../api";
import { useTheme } from "../App";

const PAGE_SIZE = 20;

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
    bolt: <><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></>,
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

  // Estados de dados e paginação
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Estados de ações
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState(null);
  const [spamFilter, setSpamFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Estados de jobs em background
  const [productivityJob, setProductivityJob] = useState(null);
  const [aiJob, setAiJob] = useState(null);

  const loadEmails = useCallback(async () => {
    try {
      setLoading(true);
      const isSpamParam = spamFilter === "all" ? null : spamFilter === "spam";
      const data = await api.getEmails(0, PAGE_SIZE, isSpamParam);
      setEmails(data);
      setHasMore(data.length >= PAGE_SIZE);
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoading(false);
    }
  }, [spamFilter]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  // Carregar mais mensagens (paginação)
  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const isSpamParam = spamFilter === "all" ? null : spamFilter === "spam";
      const nextBatch = await api.getEmails(emails.length, PAGE_SIZE, isSpamParam);
      if (nextBatch.length > 0) {
        setEmails((prev) => [...prev, ...nextBatch]);
      }
      setHasMore(nextBatch.length >= PAGE_SIZE);
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setLoadingMore(false);
    }
  }

  // Verifica ao montar se há jobs em andamento
  useEffect(() => {
    api.getProductivityStatus()
      .then((job) => {
        if (job && job.status === "running") setProductivityJob(job);
      })
      .catch(() => {});

    api.getAnalyzeStatus()
      .then((job) => {
        if (job && job.status === "running") setAiJob(job);
      })
      .catch(() => {});
  }, []);

  // Polling em tempo real enquanto jobs estiverem executando
  useEffect(() => {
    const isProdRunning = productivityJob?.status === "running";
    const isAiRunning = aiJob?.status === "running";

    if (!isProdRunning && !isAiRunning) return;

    const interval = setInterval(async () => {
      if (isProdRunning) {
        try {
          const res = await api.getProductivityStatus();
          setProductivityJob(res);
          if (res.status === "completed" || res.status === "failed") {
            loadEmails();
            setTimeout(() => setProductivityJob(null), 4000);
          }
        } catch {
          // ignora falhas transitórias de conexão no polling
        }
      }

      if (isAiRunning) {
        try {
          const res = await api.getAnalyzeStatus();
          setAiJob(res);
          if (res.status === "completed" || res.status === "failed") {
            loadEmails();
            setTimeout(() => setAiJob(null), 4000);
          }
        } catch {
          // ignora falhas transitórias de conexão no polling
        }
      }
    }, 1800);

    return () => clearInterval(interval);
  }, [productivityJob?.status, aiJob?.status, loadEmails]);

  async function handleSync() {
    try {
      setSyncing(true);
      const result = await api.syncEmails();
      setMessage({
        type: "success",
        text: `${result.novos_emails} novos e-mails sincronizados (${result.spams_detectados} spams detectados).`,
      });

      if (result.classificacao_produtividade && result.classificacao_produtividade.status === "running") {
        setProductivityJob(result.classificacao_produtividade);
      }

      await loadEmails();
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setSyncing(false);
      setTimeout(() => setMessage(null), 4000);
    }
  }

  async function handleAnalyzeAll() {
    try {
      setAnalyzing(true);
      const result = await api.analyzeAll();
      if (result.pendentes > 0) {
        setAiJob({
          status: "running",
          total: result.pendentes,
          done: 0,
          progress_pct: 0,
        });
        setMessage({ type: "success", text: "Análise iniciada em segundo plano." });
      } else {
        setMessage({ type: "success", text: result.message || "Todos os e-mails já estão analisados." });
      }
      await loadEmails();
    } catch (e) {
      setMessage({ type: "error", text: e.message });
    } finally {
      setAnalyzing(false);
      setTimeout(() => setMessage(null), 4000);
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

          {/* Card de Progresso: Produtividade (mDeBERTa) */}
          {productivityJob && productivityJob.status === "running" && (
            <div className="inbox-progress-card" role="status">
              <div className="inbox-progress-header">
                <span className="inbox-progress-title">
                  <MailIcon name="bolt" />
                  <span>Classificando produtividade em segundo plano (mDeBERTa)...</span>
                </span>
                <span>
                  {productivityJob.done || 0} de {productivityJob.total || 0} ({productivityJob.progress_pct || 0}%)
                </span>
              </div>
              <div className="inbox-progress-track">
                <div
                  className="inbox-progress-fill"
                  style={{ width: `${Math.min(100, productivityJob.progress_pct || 0)}%` }}
                />
              </div>
            </div>
          )}

          {/* Card de Progresso: Análise Geral (Gemini) */}
          {aiJob && aiJob.status === "running" && (
            <div className="inbox-progress-card" role="status">
              <div className="inbox-progress-header">
                <span className="inbox-progress-title">
                  <MailIcon name="sparkle" />
                  <span>Analisando e-mails com IA em segundo plano (Gemini)...</span>
                </span>
                <span>
                  {aiJob.done || 0} de {aiJob.total || 0} ({aiJob.progress_pct || 0}%)
                </span>
              </div>
              <div className="inbox-progress-track">
                <div
                  className="inbox-progress-fill"
                  style={{ width: `${Math.min(100, aiJob.progress_pct || 0)}%` }}
                />
              </div>
            </div>
          )}

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
              <span className="inbox-stat-note">página ativa</span>
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

            {/* Paginação e Rodapé da Lista */}
            {!loading && (
              <div className="inbox-list-footer">
                {hasMore ? (
                  <button
                    type="button"
                    className="inbox-load-more-btn"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? (
                      <>
                        <MailIcon name="refresh" />
                        <span>Carregando mais...</span>
                      </>
                    ) : (
                      <>
                        <span>Carregar mais e-mails</span>
                        <span style={{ opacity: 0.7, fontSize: "11px" }}>
                          (exibindo {emails.length})
                        </span>
                      </>
                    )}
                  </button>
                ) : emails.length > 0 ? (
                  <span>Todos os {emails.length} e-mails carregados.</span>
                ) : null}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
