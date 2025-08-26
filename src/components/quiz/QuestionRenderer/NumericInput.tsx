export default function NumericInput({
    value, onChange, placeholder = "請輸入數值（可分數如 3/4）"
}: {
    value?: { kind?: "numeric"; value?: string };
    onChange: (v: any) => void;
    placeholder?: string;
}) {
    return (
    <input
        inputMode="numeric"
        className="w-full rounded-lg border px-3 py-2"
        value={value?.value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange({ kind: "numeric", value: e.target.value })}
    />
    );
}
