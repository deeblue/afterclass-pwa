import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import type { Item, AttemptUp, ItemsResp } from "../types";
import QuestionCard from "../components/quiz/QuestionCard";
import { useSession } from "../store/useSession";
import { useQueue } from "../store/useQueue";

const QUIZ_DURATION_SEC = 10 * 60; // 10 分鐘
const AVG_PER_ITEM_SEC = 150; // 每題 2.5 分鐘（150 秒）

export default function Quiz() {
  const { userId, deviceId, sessionId, renewSession } = useSession();
  const queue = useQueue();

  // 抓題：預設 4 題，亂序
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["quizItems"],
    queryFn: () => api.getItems(`?n=4&random=1`),
    staleTime: 0,
  });

  const items: Item[] = (data as ItemsResp | undefined)?.items ?? [];

  // 作答狀態：answers[item.id] = 任意 Answer 形狀（各題型元件會產生）
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const onChange = (id: string, v: any) =>
    setAnswers((prev) => ({ ...prev, [id]: v ?? null })); // 確保不會是 undefined

  // 是否在提交前自動做「計算過程評估」
  const [autoEval, setAutoEval] = useState(false);

  // 倒數計時
  const [startTs] = useState<number>(() => Date.now());
  const [remain, setRemain] = useState<number>(QUIZ_DURATION_SEC);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    const tick = () => {
      const used = Math.floor((Date.now() - startTs) / 1000);
      setRemain(Math.max(0, QUIZ_DURATION_SEC - used));
    };
    tick();
    timerRef.current = window.setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTs]);

  // 題目平均作答秒數（粗估）
  const elapsedPerItem = useMemo(() => {
    const used = Math.floor((Date.now() - startTs) / 1000);
    const per =
      items.length > 0 ? Math.floor(used / items.length) : AVG_PER_ITEM_SEC;
    return Math.max(1, Math.min(AVG_PER_ITEM_SEC, per));
  }, [startTs, items.length]);

  // 工具：安全解析手寫板 JSON
  function parseProcessJson(raw: unknown): any | null {
    if (raw == null) return null;
    try {
      if (typeof raw === "string") return JSON.parse(raw);
      return raw as any; // 已是物件
    } catch {
      return null;
    }
  }

  // 送出評估（可選）：針對每題把手寫 JSON 與（可選）solution 帶去
  async function evaluateAllIfNeeded(
    items: Item[],
    ansMap: Record<string, any>
  ): Promise<Record<string, any>> {
    if (!autoEval) return {};
    const results: Record<string, any> = {};
    for (const it of items) {
      try {
        const a = ansMap[it.id] ?? {};
        const steps = {
          notes: Array.isArray(a?.notes) ? a.notes : [],
          sketch_paths: (() => {
            try {
              const raw = a?.work?.json;
              return raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : [];
            } catch {
              return [];
            }
          })(),
          meta: {
            item_type: it.item_type,
            has_work_png: !!a?.work?.png,
          },
        };
        const resp = await api.postEval({
          stem: it.stem,
          solution: it.solution ?? "",
          steps,
          policy: { strong: false },
        });
        results[it.id] = resp?.result ?? null;
      } catch {
        results[it.id] = null; // 評估失敗不中斷整張卷
      }
    }
    return results;
  }

  // 交卷
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string>("");

  async function handleSubmit() {
    if (!items.length) return;
    setSubmitting(true);
    setSubmitMsg("");

    try {
      // （可選）先做計算過程評估，拿 rubric_json
      const rubricMap = await evaluateAllIfNeeded(items, answers);

      // 準備 attempts（全部欄位 sanitize，避免 undefined）
      const attempts: AttemptUp[] = items.map((it) => {
        const ans = answers[it.id] ?? null;
        const rawWork = ans?.work?.json ?? null;
        const processJson = parseProcessJson(rawWork);
        const rubric = rubricMap[it.id] ?? null;
        const evalModel = rubric ? "gpt-4o-server" : null; // 或 "gpt-4o-mini-server"

        return {
          attempt_id: crypto.randomUUID(),
          user_id: userId || "anon",
          item_id: it.id,
          ts: new Date().toISOString(),
          elapsed_sec: Number(elapsedPerItem || 0),
          raw_answer: ans, // 物件或 null
          attempts: 1,
          work_url: null, // 目前不傳圖檔
          process_json: processJson, // 物件或 null
          rubric_json: rubric, // 物件或 null
          eval_model: evalModel, // 字串或 null
          device_id: deviceId || null,
          session_id: sessionId || null,
        } satisfies AttemptUp;
      });

      // 線上送出
      await api.postAttemptsBulk({ attempts });
      setSubmitMsg("提交成功！");
      // 換新 session，清空答案並重新抽題
      renewSession();
      setAnswers({});
      await refetch();
    } catch (e) {
      // 線上提交失敗 → 丟離線佇列，稍後自動補送（同樣 sanitize）
      const offlinePayload: AttemptUp[] = items.map((it) => {
        const ans = answers[it.id] ?? null;
        const rawWork = ans?.work?.json ?? null;
        const processJson = parseProcessJson(rawWork);
        return {
          attempt_id: crypto.randomUUID(),
          user_id: userId || "anon",
          item_id: it.id,
          ts: new Date().toISOString(),
          elapsed_sec: Number(elapsedPerItem || 0),
          raw_answer: ans,
          attempts: 1,
          work_url: null,
          process_json: processJson,
          rubric_json: null,
          eval_model: null,
          device_id: deviceId || null,
          session_id: sessionId || null,
        } satisfies AttemptUp;
      });

      await queue.enqueue("attempts", offlinePayload);
      setSubmitMsg("提交失敗，已離線儲存，稍後會自動上傳。");
    } finally {
      setSubmitting(false);
    }
  }

  // 回到線上時自動補送
  useEffect(() => {
    const run = () =>
      queue.flush(async (payload: AttemptUp[]) => {
        await api.postAttemptsBulk({ attempts: payload });
      });
    run();
    window.addEventListener("online", run);
    return () => window.removeEventListener("online", run);
  }, [queue]);

  // 時間到自動提交（不阻塞 UI）
  useEffect(() => {
    if (remain === 0 && !submitting) {
      // fire-and-forget，交由 handleSubmit 自己處理狀態
      void handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remain]);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div className="text-xl font-bold">10 分鐘測驗</div>
        <div className="text-sm">
          剩餘時間：
          <span className={`font-mono ${remain <= 30 ? "text-red-600" : ""}`}>
            {String(Math.floor(remain / 60)).padStart(2, "0")}:
            {String(remain % 60).padStart(2, "0")}
          </span>
        </div>
      </header>

      <div className="flex items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoEval}
            onChange={(e) => setAutoEval(e.target.checked)}
          />
          <span>提交前自動評估計算過程（可能較慢且有額外 API 成本）</span>
        </label>
        <button
          type="button"
          className="px-3 py-1 rounded border"
          onClick={() => refetch()}
        >
          重新抽題
        </button>
      </div>

      {isLoading && <div>載入題目中…</div>}
      {error && (
        <div className="text-red-600">
          取題失敗：{String((error as any)?.message || error)}
        </div>
      )}
      {!isLoading && !items.length && (
        <div className="text-slate-600">
          目前沒有可用題目；請確認後端資料（/api/items 需要有
          status='published' 的題目）。
        </div>
      )}

      <div className="grid gap-6">
        {items.map((it, idx) => (
          <div key={it.id} className="space-y-2">
            <div className="text-sm text-slate-500">第 {idx + 1} 題</div>
            <QuestionCard
              item={it}
              value={answers[it.id]}
              onChange={(v) => onChange(it.id, v)}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={submitting || items.length === 0}
          className="px-4 py-2 rounded-lg border bg-white hover:bg-slate-100 disabled:opacity-50"
          onClick={handleSubmit}
        >
          {submitting ? "提交中…" : "交卷"}
        </button>
        {submitMsg && <span className="text-sm">{submitMsg}</span>}
      </div>

      <div className="text-xs text-slate-500">
        使用者：{userId}　裝置：{deviceId}　場次：{sessionId}
      </div>
    </div>
  );
}
