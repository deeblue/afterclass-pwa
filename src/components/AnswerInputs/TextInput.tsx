import { useEffect, useState } from 'react'
export default function TextInput({ value, onChange, placeholder }: any) {
  const [text, setText] = useState(value?.text ?? '')
  useEffect(() => { onChange({ kind: 'text', text }) }, [text])
  return <textarea className="border rounded p-2 w-full min-h-[100px]" placeholder={placeholder||'請作答'} value={text} onChange={e => setText(e.target.value)} />
}