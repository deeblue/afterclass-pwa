export default function MultipleChoice({ choices = [], value, onChange }: any) {
  const set = new Set<number>(value?.indices || [])
  const toggle = (i: number) => {
    const next = new Set(set)
    if (next.has(i)) next.delete(i); else next.add(i)
    onChange({ kind: 'multiple', indices: Array.from(next).sort() })
  }
  return (
    <div className="space-y-2">
      {choices.map((c: string, i: number) => (
        <label key={i} className={`flex items-center gap-2 p-2 rounded border ${set.has(i)?'border-sky-600':'border-gray-200'}`}>
          <input type="checkbox" checked={set.has(i)} onChange={() => toggle(i)} />
          <span>{c}</span>
        </label>
      ))}
    </div>
  )
}