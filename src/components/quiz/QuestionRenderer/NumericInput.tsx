export default function NumericInput({
  value,
  onChange,
  placeholder = "請輸入數值（可分數如 3/4）",
}: {
  value?: { kind?: "numeric"; value?: string };
  onChange: (v: any) => void;
  placeholder?: string;
}) {
  const val = value?.value ?? "";
  const id = `num-${Math.random().toString(36).slice(2)}`;

  // iOS/iPadOS 偵測（含 iPadOS 假裝 Mac 的情況）
  const isIOS =
    (typeof navigator !== "undefined" &&
      /iPad|iPhone|iPod/.test(navigator.userAgent)) ||
    (typeof navigator !== "undefined" &&
      /Macintosh/.test(navigator.userAgent) &&
      typeof document !== "undefined" &&
      "ontouchend" in document);

  function normalizeDecimal(s: string) {
    // 有些鍵盤會用逗號當小數點
    return s.replace(/,/g, ".");
  }

  /** 僅保留 0-9 - . / 與空白，並處理多餘符號 */
  function sanitize(s: string) {
    s = normalizeDecimal(s);
    let v = s.replace(/[^\d\-./\s]/g, "");

    // 只允許開頭一個負號
    if (v.indexOf("-") > 0) v = v.replace(/-/g, "");

    // 多個小數點 -> 僅保留第一個
    const iDot = v.indexOf(".");
    if (iDot >= 0) v = v.slice(0, iDot + 1) + v.slice(iDot + 1).replace(/\./g, "");

    // 多個斜線 -> 僅保留第一個（支援單一分數）
    const iSlash = v.indexOf("/");
    if (iSlash >= 0)
      v = v.slice(0, iSlash + 1) + v.slice(iSlash + 1).replace(/\//g, "");

    return v;
  }

  function setVal(next: string) {
    onChange({ kind: "numeric", value: sanitize(next) });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setVal(e.target.value);
  }

  function handleBlur() {
    // 收尾清除孤立符號
    let v = (value?.value ?? "").trim();
    if (v === "-" || v === "." || v === "-." || v === "/") v = "";
    onChange({ kind: "numeric", value: v });
  }

  function insertAtCursor(el: HTMLInputElement, text: string) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const next = el.value.slice(0, start) + text + el.value.slice(end);
    const pos = start + text.length;
    return { next, pos };
  }

  function clickKey(k: string) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (!el) return setVal(val + k);
    const { next, pos } = insertAtCursor(el, k);
    const cleaned = sanitize(next);
    onChange({ kind: "numeric", value: cleaned });
    requestAnimationFrame(() => {
      const p = Math.min(pos, cleaned.length);
      el.setSelectionRange(p, p);
      el.focus();
    });
  }

  function backspace() {
    const el = document.getElementById(id) as HTMLInputElement | null;
    const cur = val;
    if (!el) {
      return setVal(cur.slice(0, -1));
    }
    const start = el.selectionStart ?? cur.length;
    const end = el.selectionEnd ?? cur.length;
    let next: string;
    let pos: number;
    if (start !== end) {
      next = cur.slice(0, start) + cur.slice(end);
      pos = start;
    } else {
      next = cur.slice(0, Math.max(0, start - 1)) + cur.slice(end);
      pos = Math.max(0, start - 1);
    }
    const cleaned = sanitize(next);
    onChange({ kind: "numeric", value: cleaned });
    requestAnimationFrame(() => {
      el.setSelectionRange(pos, pos);
      el.focus();
    });
  }

  function clearAll() {
    onChange({ kind: "numeric", value: "" });
  }

  function toggleSign() {
    const cur = (val || "").trim();
    if (!cur) return setVal("-");
    if (cur.startsWith("-")) setVal(cur.slice(1));
    else setVal("-" + cur);
  }

  // iPad 友善小鍵盤
  const row1 = ["−", ".", "/", "⌫"];
  const row2 = ["7", "8", "9"];
  const row3 = ["4", "5", "6"];
  const row4 = ["1", "2", "3"];
  const row5 = ["±", "0", "清除"];

  function handleKey(label: string) {
    if (label === "⌫") return backspace();
    if (label === "清除") return clearAll();
    if (label === "±") return toggleSign();
    if (label === "−") return clickKey("-");
    return clickKey(label);
  }

  return (
    <div className="space-y-2">
      {/* 用 text + inputMode=decimal，避免原本 numeric 無法輸入 - . / */}
      <input
        id={id}
        type="text"
        inputMode="decimal"
        className="w-full rounded-lg border px-3 py-2 font-mono"
        value={val}
        placeholder={placeholder}
        onChange={handleChange}
        onBlur={handleBlur}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
      />

      {/* iOS 顯示小鍵盤（若想所有平台都顯示，可移除 isIOS 判斷） */}
      {isIOS && (
        <div className="space-y-2 select-none">
          <div className="grid grid-cols-4 gap-2">
            {row1.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleKey(k)}
                className="border rounded py-2 bg-white active:scale-[0.98]"
              >
                {k}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[row2, row3, row4].flat().map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleKey(k)}
                className="border rounded py-3 text-lg bg-white active:scale-[0.98]"
              >
                {k}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {row5.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => handleKey(k)}
                className={`border rounded py-2 bg-white active:scale-[0.98] ${
                  k === "清除" ? "col-span-2" : ""
                }`}
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
