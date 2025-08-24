export default function SingleChoice({ choices = [], value, onChange }: any) {
  const idx = value?.index ?? -1
  return (
    <div className="space-y-2">
      {choices.map((c: string, i: number) => (
        <label key={i} className={`flex items-center gap-2 p-2 rounded border ${i===idx?'border-sky-600':'border-gray-200'}`}>
          <input type="radio" name="single" checked={i===idx} onChange={() => onChange({ kind: 'single', index: i })} />
          <span>{c}</span>
        </label>
      ))}
    </div>
  )
}