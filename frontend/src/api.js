const BASE_URL = "http://localhost:8000";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("token");
    if (!window.location.pathname.startsWith("/auth") && window.location.pathname !== "/") {
      window.location.href = "/?expired=1";
    }
    throw new Error("Sua sessão expirou. Redirecionando para login...");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro na requisição");
  }

  return res.json();
}

export const api = {
  getEmails: (skip = 0, limit = 20, isSpam = null) => {
    let url = `/emails/?skip=${skip}&limit=${limit}`;
    if (isSpam !== null) url += `&is_spam=${isSpam}`;
    return request(url);
  },
  getEmail: (id) => request(`/emails/${id}`),
  syncEmails: () => request("/emails/sync", { method: "POST" }),
  getStats: () => request("/emails/stats"),
  analyzeEmail: (id) => request(`/ai/analyze/${id}`, { method: "POST" }),
  analyzeAll: () => request("/ai/analyze-all", { method: "POST" }),
  getAnalyzeStatus: () => request("/ai/analyze-all/status"),
  classifyProductivityAll: () => request("/productivity/classify-all", { method: "POST" }),
  getProductivityStatus: () => request("/productivity/classify-all/status"),
  replyEmail: (id, message) =>
    request(`/emails/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};