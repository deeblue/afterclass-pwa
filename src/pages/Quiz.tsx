import { useEffect, useRef, useState } from 'react'
import { api } from '../api/client'
import type { Item } from '../api/types'
import Timer from '../components/Timer'
import ItemCard from '../components/ItemCard'
import { isoNow } from '../utils/time'
export default function Quiz() {
  const [items, setItems] = useState<Item[]>([])
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(false)
  const userId = 'kidA'
  const startedAtRef = useRef<number>(Date.now())
useEffect(() => {
    setLoading(true)
    api.getItems({ n: 4, random: 1 }).then((r: any) => {
      setItems(r.items || [])
    }).finally(() => setLoading(false))
  }, [])
const onChangeAnswer = (itemId: string, raw: any) => {
    setAnswers(prev => ({ ...prev, [itemId]: raw }))
  }
const finish = async () => {
    const elapsed = Math.floor((Date.now() - startedAtRef.current) / 1000)
    const attempts = items.map((it) => ({
      attempt_id: `${userId}_${it.id}_${isoNow()}`,
      user_id: userId,
      item_id: it.id,
      ts: isoNow(),
      elapsed_sec: Math.min(elapsed, 600),
      raw_answer: answers[it.id] ?? null,
      attempts: 1
    }))
    try {
      await api.submitAttempts(attempts)
      alert('已提交！')
    } catch {
      alert('提交失敗（可能離線）')
    }
  }
return (
    <div className="p-1">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">10 分鐘測驗</h1>
        <Timer seconds={600} onTimeout={finish} />
      </div>
      {loading && <p>載入中...</p>}
      {!loading && items.length === 0 && <p>目前沒有可用題目；請確認後端資料。</p>}
      {!loading && items.map(it =>
        <ItemCard key={it.id} item={it} value={answers[it.id]} onChange={raw => onChangeAnswer(it.id, raw)} />
      )}
      <div className="mt-6">
        <button className="px-4 py-2 rounded bg-sky-600 text-white" onClick={finish}>交卷</button>
      </div>
    </div>
  )
}
