import React from "react";

function GoogleIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8000/auth/google";
  };

  return (
    <main className="login-page">
      <div className="login-backdrop login-backdrop-one" aria-hidden="true" />
      <div className="login-backdrop login-backdrop-two" aria-hidden="true" />

      <section className="login-shell" aria-label="Entrar no Smart AI Mail Assistent">
        <div className="login-showcase">
          <svg className="login-wave-art" viewBox="0 0 600 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="wave-base" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ffd85d" />
                <stop offset=".48" stopColor="#ff9c72" />
                <stop offset="1" stopColor="#db5ca8" />
              </linearGradient>
              <linearGradient id="wave-shape-one" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#fff07a" />
                <stop offset="1" stopColor="#ffbf67" />
              </linearGradient>
              <linearGradient id="wave-shape-two" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#ff7da8" />
                <stop offset="1" stopColor="#a855ce" />
              </linearGradient>
            </defs>
            <rect width="600" height="760" fill="url(#wave-base)" />
            <path d="M0 38C108 81 141 109 134 185c-7 70-113 93-102 184 13 105 169 79 210 182 26 65 5 149-41 209H0Z" fill="url(#wave-shape-one)" opacity=".76" />
            <path d="M600 45C516 94 467 127 482 204c13 67 91 81 78 158-17 99-157 89-194 172-32 72 13 153 60 226h174Z" fill="url(#wave-shape-two)" opacity=".72" />
            <path d="M-20 313c107-83 226-67 331 8 110 79 208 81 309 8v124c-98 82-206 77-315 3-106-71-220-85-325-3Z" fill="#fff2a3" opacity=".58" />
            <path d="M-20 520c110-59 203-37 310 19 111 58 201 49 330-31" fill="none" stroke="#fff1a7" strokeWidth="3" opacity=".72" />
            <path d="M-20 557c111-59 204-37 311 19 111 58 201 49 330-31" fill="none" stroke="#ca4fb0" strokeWidth="2" opacity=".65" />
            <circle cx="468" cy="104" r="5" fill="white" opacity=".72" />
            <circle cx="492" cy="126" r="3" fill="white" opacity=".62" />
            <circle cx="441" cy="137" r="3" fill="white" opacity=".52" />
          </svg>

          <div className="login-showcase-content">
            <a className="login-brand" href="/" aria-label="Smart AI Mail Assistent — início">
              <span className="login-brand-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 8 10.89 13.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>Smart AI Mail <span className="login-brand-light">Assistent</span></span>
            </a>

            <div className="login-showcase-copy">
              <span className="login-kicker"><span /> SUA CAIXA, SOB CONTROLE</span>
              <h1>Menos ruído.<br />Mais tempo para<br /><span>o que importa.</span></h1>
              <p>Uma forma mais inteligente de acompanhar seus e-mails, com a ajuda da IA.</p>
            </div>

            <div className="login-preview" aria-label="Prévia das ferramentas inteligentes">
              <div className="login-preview-top">
                <span className="login-preview-icon" aria-hidden="true">✦</span>
                <div>
                  <strong>Seu e-mail, em resumo</strong>
                  <span>Organizado pela IA</span>
                </div>
                <span className="login-preview-check" aria-hidden="true">✓</span>
              </div>
              <div className="login-preview-lines" aria-hidden="true">
                <span />
                <span />
                <span />
              </div>
              <div className="login-preview-tags">
                <span>Resumo rápido</span>
                <span>Caixa mais limpa</span>
              </div>
            </div>
          </div>

          <div className="login-showcase-footer">
            <span className="login-footer-mark" aria-hidden="true">✳</span>
            <span>Uma caixa de entrada que trabalha com você.</span>
          </div>
        </div>

        <div className="login-form-panel">
          <div className="login-form-content">
            <div className="login-mobile-brand">
              <span className="login-brand-icon" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M3 8 10.89 13.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>Smart AI Mail</span>
            </div>

            <div className="login-form-heading">
              <span className="login-form-eyebrow">BEM-VINDO</span>
              <h2>Seu e-mail, de um jeito mais inteligente.</h2>
              <p>Entre com sua conta Google para continuar.</p>
            </div>

            <button className="login-google-button" type="button" onClick={handleGoogleLogin}>
              <GoogleIcon />
              <span>Continuar com Google</span>
              <svg className="login-button-arrow" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14m-7-7 7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <div className="login-security-note">
              <span className="login-security-icon" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span><strong>Conexão segura</strong><br />Acesso ao Gmail somente para leitura.</span>
            </div>
          </div>

          <div className="login-panel-footer">
            <span>Protegemos sua privacidade em cada etapa.</span>
            <span className="login-footer-lock" aria-hidden="true">●</span>
          </div>
        </div>
      </section>

      <p className="login-page-caption">INTELIGÊNCIA PARA SUA ROTINA DIGITAL</p>
    </main>
  );
}
