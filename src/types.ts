// 核心答案型別：與後端 grade() 對齊
export type Answer =
  | { kind: "single"; index: number }
  | { kind: "multiple"; indices: number[] }
  | { kind: "numeric"; value: string; tolerance?: string }
  | { kind: "text"; accept: string[] }
  | { kind: "cloze"; blanks: string[] }
  | { kind: "ordering"; order: number[] }
  | { kind: "matching"; pairs: [string, string][] }
  | { kind: "tablefill"; cells: string[][] }
  // 前端常見的判斷題；實際提交時可轉成 {kind:"single",index}
  | { kind: "truefalse"; index: 0 | 1 };

// 題目：欄位名稱與後端 /items 回傳一致
export type Item = {
  id: string;
  subject: string;    // "math"
  grade: string;      // "G7"
  unit: string;
  kcs: string[];      // 以 '|' 儲存於 DB，API 序列化為陣列
  item_type: Answer["kind"];              // ← 不再用 string，而是受控 union
  difficulty: number; // 1~5
  stem: string;
  // choices：給 single/multiple/ordering/matching 用；matching 輕量版左右由前端切分
  choices?: string[] | null;
  // answer：可能不下發（考試模式），因此給 nullable
  answer?: Answer | null;
  solution?: string | null;
  tags: string[];
  source?: string | null;
  status: "published" | "draft";
};

// 批次作答上傳（與後端 attempts/bulk 對齊）
export type AttemptUp = {
  attempt_id: string;
  user_id: string;
  item_id: string;
  ts: string;                 // ISO8601
  elapsed_sec: number;
  raw_answer: any;            // 元件會產生對應 Answer 形狀；此處保留寬鬆
  attempts?: number;
  work_url?: string | null;   // 目前暫不啟用 R2，可為 null
  process_json?: any | null;
  rubric_json?: any | null;
  eval_model?: string | null;
  device_id?: string | null;
  session_id?: string | null;
};

// 常用 API 回應型別
export type ItemsResp = { page: number; count: number; items: Item[] };
export type HealthResp = { ok: boolean; time: string };
export type AttemptsBulkResp = { inserted: number; updated: number; duplicates: number };
export type EvalResp = { model: string; result: any };
