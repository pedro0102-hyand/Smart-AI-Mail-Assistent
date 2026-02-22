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
    window.location.href = "/";
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Erro na requisição");
  }

  return res.json();
}

export const api = {
  getEmails: (skip = 0, limit = 20) =>
    request(`/emails/?skip=${skip}&limit=${limit}`),
  getEmail: (id) => request(`/emails/${id}`),
  syncEmails: () => request("/emails/sync", { method: "POST" }),
  getStats: () => request("/emails/stats"),
  analyzeEmail: (id) => request(`/ai/analyze/${id}`, { method: "POST" }),
  analyzeAll: () => request("/ai/analyze-all", { method: "POST" }),
  replyEmail: (id, message) =>
    request(`/emails/${id}/reply`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};