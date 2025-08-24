import { useEffect, useState } from 'react'

export default function Timer({ seconds, onTimeout }: { seconds: number; onTimeout?: ()=>void }) {
  const [left, setLeft] = useState(seconds)
  useEffect(() => {
    const t = setInterval(() => setLeft(v => {
      if (v <= 1) { clearInterval(t); onTimeout?.(); return 0 }
      return v - 1
    }), 1000)
    return () => clearInterval(t)
  }, [])
  const mm = String(Math.floor(left/60)).padStart(2,'0')
  const ss = String(left%60).padStart(2,'0')
  return <div className="font-mono tabular-nums">{mm}:{ss}</div>
}