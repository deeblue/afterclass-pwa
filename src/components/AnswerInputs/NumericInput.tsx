import { useEffect, useState } from 'react'
export default function NumericInput({ value, onChange }: any) {
  const [text, setText] = useState(value?.value ?? '')
  useEffect(() => { onChange({ kind: 'numeric', value: text }) }, [text])
  return <input className="border rounded p-2 w-full" placeholder="例如 3/4 或 0.75" value={text} onChange={e => setText(e.target.value)} />
}