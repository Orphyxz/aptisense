const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function request(path: string, options: RequestInit = {}, token?: string | null) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.message || 'Request failed')
  }
  return data
}

export const api = {
  register: (payload: unknown) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  login: (payload: unknown) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: (token: string) => request('/auth/me', {}, token),

  getTests: (token: string) => request('/tests', {}, token),

  getTestById: (id: string, token: string) => request(`/tests/${id}`, {}, token),

  submitTest: (id: string, payload: unknown, token: string) =>
    request(`/tests/${id}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }, token),

  getStudentAnalytics: (userId: string, token: string) =>
    request(`/analytics/student/${userId}`, {}, token),

  getStudentHistory: (userId: string, token: string) =>
    request(`/analytics/student/${userId}/history`, {}, token),

  getAdminStudentDetail: (userId: string, token: string) =>
    request(`/analytics/admin/student/${userId}`, {}, token),

  getBatchAnalytics: (token: string) => request('/analytics/batch', {}, token),

  getHeatmap: (token: string) => request('/analytics/heatmap', {}, token),

  getWeakTopics: (token: string) => request('/analytics/weak-topics', {}, token),

  predict: (token: string) =>
    request('/predict', {
      method: 'POST',
    }, token),

  getLatestPrediction: (token: string) => request('/predict/latest', {}, token),
}
