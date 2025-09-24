import type { Item } from "../types";

const BASE = import.meta.env.VITE_API_BASE?.replace(/\/$/, "") || "";
const BEARER = import.meta.env.VITE_API_BEARER || ""; // 若 Workers 設了 API_BEARER，前端也設
const V = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";

/** ---- helpers ---- **/
async function fetchJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const url = new URL(path, BASE);
  url.searchParams.set("v", V);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (BEARER && !headers.Authorization) headers.Authorization = `Bearer ${BEARER}`;

  const res = await fetch(url.toString(), { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  return res.json() as Promise<T>;
}

async function fetchBlob(path: string, init: RequestInit = {}): Promise<Blob> {
  const url = new URL(path, BASE);
  url.searchParams.set("v", V);

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string> | undefined),
  };
  if (BEARER && !headers.Authorization) headers.Authorization = `Bearer ${BEARER}`;

  const res = await fetch(url.toString(), { ...init, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  return res.blob();
}

/** ---- local types for the new unified submit ---- **/
export type RawAnswer =
  | { kind: "single"; index: number }
  | { kind: "multiple"; indices: number[] }
  | { kind: "numeric"; value: string; tolerance?: string }
  | { kind: "text"; text: string; accept?: string[] }
  | { kind: "cloze"; blanks: string[] }
  | { kind: "ordering"; order: number[] }
  | { kind: "matching"; pairs: [string, string][] }
  | { kind: "tablefill"; cells: string[][] };

export type PostAttemptSubmitPayload = {
  item_id: string;
  user_id?: string;
  raw_answer: RawAnswer;
  // 可選（評估步驟）
  evaluate_steps?: boolean;
  process_json?: any;
  workpad_image_data_url?: string; // data:image/...
  stem?: string;
  solution?: string;
  policy?: { strong?: boolean };
  // 其他可選欄位
  elapsed_sec?: number;
  device_id?: string;
  session_id?: string;
};

export type PostAttemptSubmitResponse = {
  ok: boolean;
  attempt_id: string;
  item_id: string;
  correct: 0 | 1;
  steps_evaluated?: boolean;
  step_eval?: any; // 後端會回傳 /api/process/eval* 的結果
};

/** ---- API ---- **/
export const api = {
  // 健康檢查
  health: () => fetchJson<{ ok: boolean; time: string }>(`/api/health`),

  // 抓題（自行傳 querystring，如 "?n=4&random=1"）
  getItems: (qs = "") => fetchJson<{ page: number; count: number; items: any[] }>(`/api/items${qs}`),

  // ✅ 新增：統一提交（提交答案即判定；可選步驟評估）
  postAttemptSubmit: (payload: PostAttemptSubmitPayload) =>
    fetchJson<PostAttemptSubmitResponse>(`/api/attempts/submit`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // 批次上傳作答（保留給離線/批次匯入用）
  postAttemptsBulk: (payload: { attempts: any[] }) =>
    fetchJson<{ inserted: number; updated: number; duplicates: number; failures?: any[] }>(`/api/attempts/bulk`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // 計算過程（JSON steps）評估（可選）
  postEval: (payload: { stem: string; solution?: string; steps: any; policy?: any }) =>
    fetchJson<{ model: string; result: any }>(`/api/process/eval`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // 建立單題（管理端）
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
      body: JSON.stringify(payload),
    }),

  // 圖片 OCR 辨識（?strong=1 進 query；其餘進 body）
  postIngestVision: (body: {
    image_data_url: string;
    subject: string;
    grade: string;
    unit: string;
    strong?: boolean;
  }) => {
    const qs = body.strong ? "?strong=1" : "";
    const { strong, ...payload } = body;
    return fetchJson(`/api/ingest/vision${qs}`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // WorkPad 影像 → 轉寫＋評估（strong 放 body.policy.strong）
  postEvalVision: (body: {
    item_id?: string;
    stem: string;
    solution?: string;
    workpad_image_data_url: string; // data:image/...
    strong?: boolean;
  }) => {
    const { strong, ...rest } = body;
    const payload = { ...rest, policy: { strong: !!strong } };
    return fetchJson(`/api/process/eval-vision`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ✅ 對齊後端：回報問題（POST /api/items/issues）
  postItemIssue: (payload: {
    item_id: string;
    reason: string;            // "wrong_answer" | "typo" | "unclear" | "other" ...
    note?: string;
    raw_answer?: any;
    correct?: number | null;   // 0/1 或 null
    user_id?: string;
    session_id?: string;
  }) =>
    fetchJson(`/api/items/issues`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ✅ 對齊後端：查某題的 issue 列表（GET /api/admin/items/issues?item_id=...）
  getItemIssues: (item_id: string, since?: string, limit = 50) => {
    const qs = new URLSearchParams({
      item_id,
      since: since || "1970-01-01T00:00:00.000Z",
      limit: String(Math.max(1, Math.min(200, limit))),
    }).toString();
    return fetchJson<{ count: number; issues: any[] }>(`/api/admin/items/issues?${qs}`);
  },

  // ✅ 審核佇列（GET /api/admin/items/review-queue?limit=50）
  getReviewQueue: (limit = 50) =>
    fetchJson<{ count: number; items: Array<{ item: Item; stats: any; last_issues: any[] }> }>(
      `/api/admin/items/review-queue?limit=${Math.max(1, Math.min(200, limit))}`
    ),

  // ✅ 修訂題目（PUT /api/items/:id）— 後端會寫入 item_revisions
  putItem: (id: string, patch: Partial<Item> & { editor?: string }) =>
    fetchJson<{ ok: true; id: string; rev_id: string }>(`/api/items/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(patch),
    }),

  // 判題（不洩漏官方答案）— 若你全面改用 postAttemptSubmit，這支可逐步退場
  postGrade: (payload: { item_id: string; raw_answer: any }) =>
    fetchJson(`/api/grade`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // 批次 upsert 題目
  postItemsUpsert: (body: { items: any[]; mode?: "upsert" | "insert" }) =>
    fetchJson(`/api/items/upsert`, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // 備份 / 下載 / 清庫 —— 與後端一致
  adminBackup: (scope: "items" | "all" = "items") =>
    fetchJson(`/api/admin/backup`, { method: "POST", body: JSON.stringify({ scope }) }),

  adminBackupDownload: () => fetchBlob(`/api/admin/backup/latest`),

  adminPurge: (confirm: string, scope: "items" | "all" = "items") =>
    fetchJson(`/api/admin/purge`, {
      method: "POST",
      body: JSON.stringify({ confirm, scope }),
    }),
};
