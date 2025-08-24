import { useEffect, useState } from 'react'
import { api } from '../api/client'
export default function Home() {
  const [time, setTime] = useState<string>('(讀取中)')
  useEffect(() => { api.health().then(r => setTime(r.time)).catch(() => setTime('(無法連線)')) }, [])
  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold">歡迎使用 AfterClass</h1>
      <p className="text-gray-600">後端健康檢查時間：{time}</p>
      <p className="text-sm text-gray-500">前往「測驗」開始 10 分鐘練習。</p>
    </div>
  )
}
