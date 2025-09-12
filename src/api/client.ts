import type { Item } from "../types";
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

  postItem: (payload: Partial<Item> & {
    item_type: string;
    stem: string;
    subject?: string;
    grade?: string;
    unit?: string;
    difficulty?: number;
    kcs?: string[] | string;
    tags?: string[] | string;
    choices?: any;
    answer?: any;
    solution?: string;
    status?: string; // "draft" | "published"
  }) =>
    fetchJson(`/api/items`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(BEARER ? { "Authorization": `Bearer ${BEARER}` } : {})
      },
      body: JSON.stringify(payload)
    }),

  // 新增：圖片 OCR 辨識
  postIngestVision: (body: {
    image_data_url: string;
    subject: string;
    grade: string;
    unit: string;
    strong?: boolean; // 新增
  }) => {
      const qs = body.strong ? "?strong=1" : "";
      const { strong, ...payload } = body; // strong 只進 query，不進 body
      return fetchJson(`/api/ingest/vision${qs}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
  },

  // 新增：WorkPad 影像 → 轉寫＋評估（strong 放 body.policy.strong）
  postEvalVision: (body: {
    item_id?: string;                     // 可選：題目 id，方便後端記錄
    stem: string;                         // 題幹（給轉寫/評估當上下文）
    solution?: string;                    // 參考解（可省略）
    workpad_image_data_url: string;       // data:image/jpeg;base64,...
    strong?: boolean;                     // 這支是放到 policy.strong
  }) => {
    const { strong, ...rest } = body;
    const payload = {
      ...rest,
      policy: { strong: !!strong }        // 後端 index.ts 讀 body.policy?.strong
    };
    return fetchJson(`/api/process/eval-vision`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ✅ 新增：問題回報 / 審核 / 修正
  postIssue: (payload: {
    item_id: string;
    issue_type: "answer" | "wording" | "choice" | "format" | "other";
    detail: string;
    severity?: "low" | "mid" | "high";
    proposed?: Partial<Pick<Item, "stem" | "choices" | "answer" | "solution">>;
  }) => fetchJson(`/api/items/${payload.item_id}/issues`, { method: "POST", body: JSON.stringify(payload) }),

  getIssues: (status: "open" | "resolved" | "dismissed" | "all" = "open") =>
    fetchJson<{ issues: any[] }>(`/api/admin/issues?status=${encodeURIComponent(status)}`),

  resolveIssue: (issueId: string, action: "resolve" | "dismiss", note?: string) =>
    fetchJson(`/api/admin/issues/${issueId}`, { method: "PATCH", body: JSON.stringify({ action, note }) }),

  patchItem: (id: string, patch: Partial<Item>) =>
    fetchJson(`/api/items/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),

  getRevisions: (itemId: string) =>
    fetchJson<{ revisions: any[] }>(`/api/items/${itemId}/revisions`),

  restoreRevision: (itemId: string, revisionId: string) =>
    fetchJson(`/api/items/${itemId}/revisions/${revisionId}/restore`, { method: "POST" }),

  // ✅ 新增：備份/清庫（+ 下載）
  postAdminBackup: (scope: "items" | "all" = "items") =>
    fetchJson(`/api/admin/backup`, { method: "POST", body: JSON.stringify({ scope }) }),
  getAdminBackupLatestBlob: () => fetchBlob(`/api/admin/backup/latest`),
  postAdminPurge: (confirm: string, scope: "items" | "all" = "items") =>
    fetchJson(`/api/admin/purge`, { method: "POST", body: JSON.stringify({ confirm, scope }) }),


  postGrade: (payload: { item_id: string; raw_answer: any }) =>
    fetchJson(`/api/grade`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // 新增：批次 upsert 題目
  postItemsUpsert: (body: { items: any[]; mode?: "upsert" | "insert" }) =>
    fetchJson(`/api/items/upsert`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  
  getBlob: async (path: string): Promise<Blob> => {
    const url = new URL(path, BASE);
    url.searchParams.set("v", V);

    const headers: Record<string, string> = {};
    if (BEARER) headers.Authorization = `Bearer ${BEARER}`;

    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`${res.status} ${res.statusText} ${text}`);
    }
    return res.blob();
  },

  // 1) 觸發備份到 KV（預設只備份 items；要全量就傳 "all"）
  adminBackup: (scope: "items" | "all" = "items") =>
    fetchJson(`/api/admin/backup`, {
      method: "POST",
      body: JSON.stringify({ scope }),
    }),

  // 2) 下載最新備份（KV 中的 backup:items:latest）
  adminBackupDownload: async () => {
    const url = new URL(`/api/admin/backup/latest`, BASE);
    url.searchParams.set("v", V);
    const res = await fetch(url.toString(), {
      headers: BEARER ? { Authorization: `Bearer ${BEARER}` } : {},
    });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return res.blob(); // 交給呼叫端觸發下載
  },

  // 3) 清庫（會自動再備份一次），需要 confirm 當天日期
  adminPurge: (confirm: string, scope: "items" | "all" = "items") =>
    fetchJson(`/api/admin/purge`, {
      method: "POST",
      body: JSON.stringify({ confirm, scope }),
    }),

};
