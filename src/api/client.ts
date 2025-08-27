const BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || "";
const BEARER = import.meta.env.VITE_API_BEARER || ""; // 可選；若 Workers 有設 API_BEARER 建議前端也設
const V = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> || {}),
  };

  const url = new URL(path, BASE);
  url.searchParams.set("v", V);

  if (BEARER) headers.Authorization = `Bearer ${BEARER}`;
  const res = await fetch(url.toString(), {
    ...init,
    headers: {
      "Content-Type":"application/json",
      ...(init?.headers || {})
    }
  });
  
  // const res = await fetch(`${BASE}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // 健康檢查
  health: () => fetchJson<{ ok: boolean; time: string }>(`/api/health`),

  // 抓題：只要傳 querystring，如 "?n=4&random=1"
  getItems: (qs = "") => fetchJson<{ page: number; count: number; items: any[] }>(`/api/items${qs}`),

  // 批次上傳作答
  postAttemptsBulk: (payload: { attempts: any[] }) =>
    fetchJson<{ inserted: number; updated: number; duplicates: number }>(`/api/attempts/bulk`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // 計算過程評估
  postEval: (payload: { stem: string; solution?: string; steps: any; policy?: any }) =>
    fetchJson<{ model: string; result: any }>(`/api/process/eval`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
};
