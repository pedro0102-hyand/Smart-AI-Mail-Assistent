import React, { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { api } from "../api";
import { useTheme } from "../App";

const CATEGORY_COLORS = {
  trabalho:   "#6366F1",
  financeiro: "#EF4444",
  pessoal:    "#10B981",
  marketing:  "#F59E0B",
  spam:       "#9CA3AF",
  suporte:    "#8B5CF6",
  outro:      "#6B7280",
};

const URGENCY_COLORS = {
  alta:  "#EF4444",
  média: "#F59E0B",
  baixa: "#10B981",
};

const URGENCY_LABELS = {
  alta: "Alta urgência",
  média: "Urgência média",
  baixa: "Baixa urgência",
};

function DonutChart({ data, dark }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return null;

  let cumulative = 0;
  const size = 160;
  const cx = size / 2;
  const cy = size / 2;
  const r = 60;
  const innerR = 36;

  const slices = data.map((d) => {
    const pct = d.value / total;
    const startAngle = cumulative * 2 * Math.PI - Math.PI / 2;
    cumulative += pct;
    const endAngle = cumulative * 2 * Math.PI - Math.PI / 2;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const ix1 = cx + innerR * Math.cos(endAngle);
    const iy1 = cy + innerR * Math.sin(endAngle);
    const ix2 = cx + innerR * Math.cos(startAngle);
    const iy2 = cy + innerR * Math.sin(startAngle);
    const largeArc = pct > 0.5 ? 1 : 0;

    const path = [
      `M ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix1} ${iy1}`,
      `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
      "Z",
    ].join(" ");

    return { ...d, path };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {slices.map((s, i) => (
        <path key={i} d={s.path} fill={s.color} stroke={dark ? "#16161F" : "white"} strokeWidth="2" />
      ))}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="20" fontWeight="800" fill={dark ? "#E5E7EB" : "#1A1A2E"} fontFamily="Georgia, serif">
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="system-ui">
        analisados
      </text>
    </svg>
  );
}

export default function DashboardPage() {
  const { dark } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getStats();
      setStats(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const categoryData = stats
    ? Object.entries(stats.by_category || {})
        .map(([name, value]) => ({ name, value, color: CATEGORY_COLORS[name] || "#6B7280" }))
        .sort((a, b) => b.value - a.value)
    : [];

  const urgencyData = stats
    ? Object.entries(stats.by_urgency || {})
        .map(([name, value]) => ({ name, value, color: URGENCY_COLORS[name] || "#9CA3AF" }))
    : [];

  const analyzed = categoryData.reduce((s, d) => s + d.value, 0);
  const unanalyzed = Math.max(0, (stats?.total_emails || 0) - analyzed);
  const coveragePercent = stats?.total_emails ? Math.round((analyzed / stats.total_emails) * 100) : 0;
  const maxCatValue = categoryData.length > 0 ? Math.max(...categoryData.map(d => d.value)) : 1;

  const c = dark ? darkColors : lightColors;

  const kpis = [
    { label: "Total de e-mails", value: stats?.total_emails ?? "—", icon: "📧", bg: dark ? "#1E1E2E" : "#EEF2FF" },
    { label: "Não lidos",         value: stats?.unread ?? "—",         icon: "🔴", bg: dark ? "#2A1515" : "#FEF2F2" },
    { label: "Analisados pela IA", value: analyzed,                    icon: "✦",  bg: dark ? "#0D2A1E" : "#ECFDF5" },
    { label: "Cobertura IA",       value: `${coveragePercent}%`,       icon: "📊", bg: dark ? "#2A1F0D" : "#FFFBEB" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: dark ? "#0F0F14" : "#F8F7F4", fontFamily: "system-ui, sans-serif", transition: "background 0.3s" }}>
      <Sidebar />
      <main style={{ flex: 1, padding: "36px 40px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "700", color: c.title, margin: 0, fontFamily: "Georgia, serif" }}>Dashboard</h1>
            <p style={{ fontSize: "13px", color: "#9CA3AF", margin: "4px 0 0" }}>Visão geral da sua caixa de entrada</p>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            style={{ display: "flex", alignItems: "center", gap: "7px", padding: "9px 16px", border: `1.5px solid ${c.border}`, borderRadius: "10px", background: c.card, fontSize: "13px", fontWeight: "500", color: c.text, cursor: "pointer" }}
          >
            ↻ Atualizar
          </button>
        </div>

        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "300px", gap: "14px" }}>
            <div style={{ width: "32px", height: "32px", border: "3px solid #E5E7EB", borderTop: "3px solid #6366F1", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
            <span style={{ fontSize: "14px", color: "#9CA3AF" }}>Carregando estatísticas...</span>
          </div>
        ) : error ? (
          <div style={{ padding: "16px", background: "#FEE2E2", color: "#DC2626", borderRadius: "10px", fontSize: "14px" }}>{error}</div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px", marginBottom: "24px" }}>
              {kpis.map((kpi, i) => (
                <div key={i} style={{ background: c.card, borderRadius: "16px", padding: "24px", boxShadow: c.shadow, border: `1px solid ${c.borderCard}` }}>
                  <div style={{ width: "40px", height: "40px", background: kpi.bg, borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", marginBottom: "16px" }}>
                    {kpi.icon}
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: c.title, marginBottom: "4px", fontFamily: "Georgia, serif" }}>{kpi.value}</div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF", fontWeight: "500" }}>{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Charts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>

              {/* Barras — Categorias */}
              <div style={{ background: c.card, borderRadius: "16px", padding: "24px", boxShadow: c.shadow, border: `1px solid ${c.borderCard}` }}>
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: c.title }}>E-mails por Categoria</div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "3px" }}>{categoryData.length} categorias detectadas</div>
                </div>
                {categoryData.length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "160px", color: "#9CA3AF", fontSize: "13px", textAlign: "center", lineHeight: "1.6" }}>
                    Nenhum e-mail analisado ainda.<br />Use "Analisar com IA" na caixa de entrada.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {categoryData.map((item) => {
                      const pct = Math.round((item.value / maxCatValue) * 100);
                      return (
                        <div key={item.name}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                            <span style={{ fontSize: "13px", color: c.text, fontWeight: "500", display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color, display: "inline-block", flexShrink: 0 }} />
                              {item.name}
                            </span>
                            <span style={{ fontSize: "13px", fontWeight: "700", color: c.title }}>{item.value}</span>
                          </div>
                          <div style={{ height: "8px", background: dark ? "#2A2A3A" : "#F3F4F6", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: "4px", transition: "width 0.6s ease" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Donut — Urgência */}
              <div style={{ background: c.card, borderRadius: "16px", padding: "24px", boxShadow: c.shadow, border: `1px solid ${c.borderCard}` }}>
                <div style={{ marginBottom: "20px" }}>
                  <div style={{ fontSize: "15px", fontWeight: "700", color: c.title }}>Distribuição por Urgência</div>
                  <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "3px" }}>{analyzed} analisados</div>
                </div>
                {urgencyData.length === 0 ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "160px", color: "#9CA3AF", fontSize: "13px" }}>
                    Nenhum e-mail analisado ainda.
                  </div>
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
                    <DonutChart data={urgencyData} dark={dark} />
                    <div style={{ display: "flex", flexDirection: "column", gap: "14px", flex: 1 }}>
                      {urgencyData.map((item) => {
                        const pct = analyzed > 0 ? Math.round((item.value / analyzed) * 100) : 0;
                        return (
                          <div key={item.name}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                              <span style={{ fontSize: "12px", color: c.text, display: "flex", alignItems: "center", gap: "6px" }}>
                                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: item.color, display: "inline-block" }} />
                                {URGENCY_LABELS[item.name] || item.name}
                              </span>
                              <span style={{ fontSize: "12px", fontWeight: "700", color: item.color }}>{pct}%</span>
                            </div>
                            <div style={{ height: "4px", background: dark ? "#2A2A3A" : "#F3F4F6", borderRadius: "2px", overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: item.color, borderRadius: "2px", transition: "width 0.6s ease" }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cobertura IA */}
            {stats?.total_emails > 0 && (
              <div style={{ background: c.card, borderRadius: "16px", padding: "24px", boxShadow: c.shadow, border: `1px solid ${c.borderCard}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div>
                    <div style={{ fontSize: "15px", fontWeight: "700", color: c.title }}>Cobertura da análise IA</div>
                    <div style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "3px" }}>{analyzed} de {stats.total_emails} e-mails analisados</div>
                  </div>
                  <div style={{ fontSize: "28px", fontWeight: "800", color: "#6366F1", fontFamily: "Georgia, serif" }}>{coveragePercent}%</div>
                </div>
                <div style={{ height: "10px", background: dark ? "#2A2A3A" : "#F3F4F6", borderRadius: "5px", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${coveragePercent}%`, background: "linear-gradient(90deg, #6366F1, #8B5CF6)", borderRadius: "5px", transition: "width 0.8s ease" }} />
                </div>
                {unanalyzed > 0 && (
                  <p style={{ fontSize: "12px", color: "#9CA3AF", marginTop: "10px" }}>
                    {unanalyzed} e-mail{unanalyzed !== 1 ? "s" : ""} ainda sem análise — vá à caixa de entrada e clique em "Analisar com IA".
                  </p>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const lightColors = {
  title: "#1A1A2E",
  text: "#374151",
  card: "white",
  border: "#E5E7EB",
  borderCard: "transparent",
  shadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const darkColors = {
  title: "#E5E7EB",
  text: "#9CA3AF",
  card: "#16161F",
  border: "#2A2A3A",
  borderCard: "#2A2A3A",
  shadow: "none",
};