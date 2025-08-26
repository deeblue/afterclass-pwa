export default function TextInput({
    value, onChange, placeholder = "請輸入你的答案"
}: {
    value?: { kind?: "text"; text?: string };
    onChange: (v:any)=>void;
    placeholder?: string;
}) {
    return (
    <input
        className="w-full rounded-lg border px-3 py-2"
        value={(value as any)?.text ?? ""}
        placeholder={placeholder}
        onChange={(e)=>onChange({ kind: "text", text: e.target.value })}
    />
    );
}
