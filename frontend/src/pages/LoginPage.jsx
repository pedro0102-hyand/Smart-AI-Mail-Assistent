import React from "react";

export default function LoginPage() {
  const handleGoogleLogin = () => {
    window.location.href = "http://localhost:8000/auth/google";
  };

  return (
    <div style={styles.container}>
      <div style={styles.bgAccent1} />
      <div style={styles.bgAccent2} />

      <div style={styles.card}>
        <div style={styles.brand}>
          <div style={styles.logoIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M3 8L10.89 13.26C11.2187 13.4793 11.6049 13.5963 12 13.5963C12.3951 13.5963 12.7813 13.4793 13.11 13.26L21 8M5 19H19C19.5304 19 20.0391 18.7893 20.4142 18.4142C20.7893 18.0391 21 17.5304 21 17V7C21 6.46957 20.7893 5.96086 20.4142 5.58579C20.0391 5.21071 19.5304 5 19 5H5C4.46957 5 3.96086 5.21071 3.58579 5.58579C3.21071 5.96086 3 6.46957 3 7V17C3 17.5304 3.21071 18.0391 3.58579 18.4142C3.96086 18.7893 4.46957 19 5 19Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span style={styles.brandName}>Smart AI Mail Assistent</span>
        </div>

        <div style={styles.headline}>
          <h1 style={styles.title}>Sua caixa de entrada,<br />mais inteligente.</h1>
          <p style={styles.subtitle}>IA que resume, classifica e responde seus e-mails automaticamente.</p>
        </div>

        <div style={styles.features}>
          {[
            { icon: "⚡", text: "Resumos instantâneos com IA" },
            { icon: "🏷️", text: "Classificação automática" },
            { icon: "✍️", text: "Respostas sugeridas" },
          ].map((f, i) => (
            <div key={i} style={styles.featureItem}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <span style={styles.featureText}>{f.text}</span>
            </div>
          ))}
        </div>

        <div style={styles.divider} />

        <button
          style={styles.googleBtn}
          onClick={handleGoogleLogin}
          onMouseEnter={e => e.currentTarget.style.transform = "translateY(-1px)"}
          onMouseLeave={e => e.currentTarget.style.transform = "translateY(0)"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Entrar com Google
        </button>

        <p style={styles.disclaimer}>Seus dados ficam seguros. Apenas leitura do Gmail.</p>
      </div>
    </div>
  );
}

const styles = {
  container: { minHeight: "100vh", background: "#F8F7F4", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px", fontFamily: "'Georgia', serif", position: "relative", overflow: "hidden" },
  bgAccent1: { position: "absolute", top: "-200px", right: "-200px", width: "600px", height: "600px", borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", pointerEvents: "none" },
  bgAccent2: { position: "absolute", bottom: "-150px", left: "-150px", width: "500px", height: "500px", borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)", pointerEvents: "none" },
  card: { background: "white", borderRadius: "24px", padding: "48px", width: "100%", maxWidth: "420px", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 20px 60px rgba(0,0,0,0.08)", position: "relative", zIndex: 1 },
  brand: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "36px" },
  logoIcon: { width: "40px", height: "40px", background: "linear-gradient(135deg, #6366F1, #8B5CF6)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center" },
  brandName: { fontSize: "22px", fontWeight: "700", color: "#1A1A2E", letterSpacing: "-0.5px" },
  headline: { marginBottom: "28px" },
  title: { fontSize: "28px", fontWeight: "700", color: "#1A1A2E", lineHeight: "1.3", margin: "0 0 12px 0", letterSpacing: "-0.5px" },
  subtitle: { fontSize: "15px", color: "#6B7280", lineHeight: "1.6", margin: 0 },
  features: { display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" },
  featureItem: { display: "flex", alignItems: "center", gap: "10px" },
  featureIcon: { fontSize: "16px" },
  featureText: { fontSize: "14px", color: "#4B5563", fontFamily: "system-ui, sans-serif" },
  divider: { height: "1px", background: "#F3F4F6", marginBottom: "28px" },
  googleBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", padding: "14px", background: "white", border: "1.5px solid #E5E7EB", borderRadius: "12px", fontSize: "15px", fontWeight: "600", color: "#1A1A2E", cursor: "pointer", transition: "all 0.2s ease", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", fontFamily: "system-ui, sans-serif" },
  disclaimer: { textAlign: "center", fontSize: "12px", color: "#9CA3AF", marginTop: "14px", fontFamily: "system-ui, sans-serif" },
};