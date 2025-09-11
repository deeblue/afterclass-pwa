import type { Item } from "../../types";
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
    item, value, onChange
}: {
    item: Item;
    value: any;
    onChange: (v:any)=>void;
}) {
    const renderKind = resolveRenderKind(item);
    const uiValue = normalizeInboundValue(renderKind, value);
        
    // 若後端種子用不同名稱，這裡做映射
    const kind = ((): string => {
        const k = item.item_type;
        if (k === "tf" || k === "judge") return "truefalse";
        return k;
    })();

    // 將 truefalse 送交前轉 single（如果你想讓後端沿用 single 判分）
    const onChangeWrap = (v:any) => {
        const outbound = normalizeOutboundValue(renderKind, v);
        onChange(outbound);
    };

    return (
        
        <div className="rounded-2xl border p-4 shadow-sm bg-white">
            <div className="mb-3 whitespace-pre-wrap">{item.stem}</div>

            {renderKind === "single"     && (
                <SingleChoice
                choices={item.choices ?? []}
                value={uiValue}
                onChange={onChangeWrap}
                />
            )}            

            {renderKind === "multiple"   && (
                <MultipleChoice
                choices={item.choices ?? []}
                value={uiValue}
                onChange={onChangeWrap}
                />
            )}

            {renderKind === "numeric"    && (
                <NumericInput
                value={uiValue}
                onChange={onChangeWrap}
                />
            )}

            {renderKind === "text"       && (
                <TextInput
                value={uiValue}
                onChange={onChangeWrap}
                />
            )}

            {renderKind === "truefalse"  && (
                <TrueFalse
                value={uiValue}           // 這裡用 truefalse 的值顯示選中狀態
                onChange={onChangeWrap}   // 但 onChangeWrap 會轉回 single 再丟上層保存
                // labels 可自訂，不傳則預設 ["正確","錯誤"]
                />
            )}

            {renderKind === "cloze"      && (
                <ClozeInput
                value={uiValue}
                onChange={onChangeWrap}
                blanks={(item.answer as any)?.blanks?.length ?? 1}
                />
            )}

            {renderKind === "ordering"   && (
                <OrderingInput
                items={item.choices ?? []}
                value={uiValue}
                onChange={onChangeWrap}
                />
            )}

            {renderKind === "matching"   && (
                <MatchingInput
                left={(item.choices ?? []).slice(0, Math.ceil((item.choices?.length ?? 2) / 2))}
                right={(item.choices ?? []).slice(Math.ceil((item.choices?.length ?? 2) / 2))}
                value={uiValue}
                onChange={onChangeWrap}
                />
            )}

            {renderKind === "tablefill"  && (
                <TableFillInput
                shape={{
                    rows: (item.answer as any)?.cells?.length ?? 2,
                    cols: (item.answer as any)?.cells?.[0]?.length ?? 2
                }}
                value={uiValue}
                onChange={onChangeWrap}
                />
            )}
    
            {/* 手寫板（選用）：存到答案物件中 */}
            {/* <div className="mt-4"> */}
            <Workpad onExport={(json, png) => onChangeWrap({ ...(value||{}), work: { json, png } })} />
            
            {/* 這段是新增：把手寫筆跡與文字步驟送去評估 */}
            <ProcessEvaluate item={item} answerValue={uiValue} />
            {/* </div> */}

            {/* <div className="border rounded p-4 space-y-2"> */}
            <ReportIssuePanel item={item} />
            {/* </div> */}

        </div>
    );
}
