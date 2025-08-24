const API_BASE = import.meta.env.VITE_API_BASE
const API_BEARER = import.meta.env.VITE_API_BEARER

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(API_BEARER ? { Authorization: `Bearer ${API_BEARER}` } : {}),
      ...(init?.headers || {})
    }
  })
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${txt}`)
  }
  return res.json()
}

export const api = {
  health: () => http<{ ok: boolean; time: string }>('/api/health'),
  getItems: (q: { n?: number; subject?: string; unit?: string; kc?: string; random?: 0|1; page?: number }) => {
    const sp = new URLSearchParams()
    if (q.n) sp.set('n', String(q.n))
    if (q.subject) sp.set('subject', q.subject)
    if (q.unit) sp.set('unit', q.unit)
    if (q.kc) sp.set('kc', q.kc)
    if (q.random) sp.set('random', String(q.random))
    if (q.page) sp.set('page', String(q.page))
    return http(`/api/items?${sp.toString()}`)
  },
  getItem: (id: string) => http(`/api/items/${encodeURIComponent(id)}`),
  submitAttempts: (attempts: any[]) => http(`/api/attempts/bulk`, { method: 'POST', body: JSON.stringify({ attempts }) }),
  evalProcess: (payload: { stem: string; solution?: string; steps: any; policy?: {strong?: boolean} }) =>
    http(`/api/process/eval`, { method: 'POST', body: JSON.stringify(payload) })
}