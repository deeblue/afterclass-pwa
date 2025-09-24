import { useState } from "react";
import type { Item } from "../../types";
import { api, type RawAnswer } from "../../api/client";

import SingleChoice from "./QuestionRenderer/SingleChoice";
import MultipleChoice from "./QuestionRenderer/MultipleChoice";
import NumericInput from "./QuestionRenderer/NumericInput";
import TextInput from "./QuestionRenderer/TextInput";
import TrueFalse from "./QuestionRenderer/TrueFalse";
import ClozeInput from "./QuestionRenderer/ClozeInput";
import OrderingInput from "./QuestionRenderer/OrderingInput";
import MatchingInput from "./QuestionRenderer/MatchingInput";
import TableFillInput from "./QuestionRenderer/TableFillInput";
import Workpad from "./QuestionRenderer/Workpad";
import ProcessEvaluate from "./ProcessEvaluate";
import ReportIssuePanel from "./ReportIssuePanel";

/** 判斷 UI 要渲染的題型（將 true/false 視覺化為 'truefalse'） */
function resolveRenderKind(item: Item): Item["item_type"] | "truefalse" {
  const k = item.item_type;
  if (k === "truefalse") return "truefalse";
  // 若種子或舊資料把判斷題存成 single 且只有兩個選項，UI 也當 true/false 呈現
  if (k === "single" && (item.choices?.length === 2)) {
    const a = (item.choices?.[0] || "").trim();
    const b = (item.choices?.[1] || "").trim();
    const tfSet = new Set(["對", "錯", "是", "否", "正確", "錯誤", "True", "False"]);
    if (tfSet.has(a) && tfSet.has(b)) return "truefalse";
  }
  return k;
}

/** 將「外部儲存值」轉成「UI 顯示值」：single(2選) → truefalse */
function normalizeInboundValue(renderKind: string, rawValue: any) {
  if (renderKind === "truefalse" && rawValue?.kind === "single") {
    const idx = typeof rawValue.index === "number" ? rawValue.index : -1;
    return { kind: "truefalse", index: (idx === 0 || idx === 1 ? idx : undefined) as 0 | 1 | undefined };
  }
  return rawValue;
}

/** 將「UI 回傳值」轉成「上層/後端要的值」：truefalse → single */
function normalizeOutboundValue(renderKind: string, uiValue: any) {
  if (renderKind === "truefalse" && uiValue?.kind === "truefalse") {
    const idx = typeof uiValue.index === "number" ? uiValue.index : 0;
    return { kind: "single", index: idx };
  }
  return uiValue;
}

export default function QuestionCard({
  item, value, onChange, userId = "anon",
}: {
  item: Item;
  value: any;
  onChange: (v: any) => void;
  /** 可選：若上層有 userId 可傳下來做記錄 */
  userId?: string;
}) {
  const renderKind = resolveRenderKind(item);
  const uiValue = normalizeInboundValue(renderKind, value);

  // 將 truefalse 送交前轉 single（如果你想讓後端沿用 single 判分）
  const onChangeWrap = (v: any) => {
    const outbound = normalizeOutboundValue(renderKind, v);
    onChange(outbound);
  };

  // --- 這裡開始是「提交答案」的狀態與動作 ---
  const [submitting, setSubmitting] = useState(false);
  const [judge, setJudge] = useState<null | 0 | 1>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 由目前 value 取得要提交的 raw_answer（已做 truefalse → single 正規化）
  const rawAnswerForSubmit: RawAnswer | null = value
    ? (normalizeOutboundValue(renderKind, value) as RawAnswer)
    : null;

  async function onSubmitAnswer() {
    if (!rawAnswerForSubmit) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await api.postAttemptSubmit({
        item_id: item.id,
        user_id: userId || "anon",
        raw_answer: rawAnswerForSubmit,
      });
      setJudge(res?.correct === 1 ? 1 : 0);
    } catch (e: any) {
      setErrorMsg(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  }
  // --- 提交答案邏輯到此 ---

  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white space-y-3">
      <div className="mb-3 whitespace-pre-wrap">{item.stem}</div>

      {renderKind === "single" && (
        <SingleChoice
          choices={item.choices ?? []}
          value={uiValue}
          onChange={onChangeWrap}
        />
      )}

      {renderKind === "multiple" && (
        <MultipleChoice
          choices={item.choices ?? []}
          value={uiValue}
          onChange={onChangeWrap}
        />
      )}

      {renderKind === "numeric" && (
        <NumericInput
          value={uiValue}
          onChange={onChangeWrap}
        />
      )}

      {renderKind === "text" && (
        <TextInput
          value={uiValue}
          onChange={onChangeWrap}
        />
      )}

      {renderKind === "truefalse" && (
        <TrueFalse
          value={uiValue}          // UI 用 truefalse
          onChange={onChangeWrap}  // 送出時轉回 single
        />
      )}

      {renderKind === "cloze" && (
        <ClozeInput
          value={uiValue}
          onChange={onChangeWrap}
          blanks={(item.answer as any)?.blanks?.length ?? 1}
        />
      )}

      {renderKind === "ordering" && (
        <OrderingInput
          items={item.choices ?? []}
          value={uiValue}
          onChange={onChangeWrap}
        />
      )}

      {renderKind === "matching" && (
        <MatchingInput
          left={(item.choices ?? []).slice(0, Math.ceil((item.choices?.length ?? 2) / 2))}
          right={(item.choices ?? []).slice(Math.ceil((item.choices?.length ?? 2) / 2))}
          value={uiValue}
          onChange={onChangeWrap}
        />
      )}

      {renderKind === "tablefill" && (
        <TableFillInput
          shape={{
            rows: (item.answer as any)?.cells?.length ?? 2,
            cols: (item.answer as any)?.cells?.[0]?.length ?? 2
          }}
          value={uiValue}
          onChange={onChangeWrap}
        />
      )}

      {/* 手寫板（選用）：仍可存在，但與提交答案解耦 */}
      <Workpad onExport={(json, png) => onChangeWrap({ ...(value || {}), work: { json, png } })} />

      {/* ✅ 新增：每題都有「提交答案」按鈕（不需要跑步驟評估也能提交） */}
      <div className="flex items-center gap-3">
        <button
          className="px-3 py-2 rounded bg-black text-white disabled:opacity-50"
          onClick={onSubmitAnswer}
          disabled={!rawAnswerForSubmit || submitting}
          title={!rawAnswerForSubmit ? "請先輸入本題答案" : ""}
        >
          {submitting ? "提交中…" : "提交答案"}
        </button>
        {judge != null && (
          <span className="text-sm">{judge ? "✅ 答對" : "❌ 答錯"}</span>
        )}
        {errorMsg && <span className="text-xs text-red-600">{errorMsg}</span>}
      </div>

      {/* 計算過程評估：改為「可選」，不再 gate 提交答案 */}
      <ProcessEvaluate item={item} answerValue={uiValue} />

      <ReportIssuePanel item={item} />
    </div>
  );
}
