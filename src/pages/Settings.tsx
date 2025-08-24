export default function Settings() {
  return (
    <div className="space-y-2">
      <h1 className="text-xl font-bold">設定</h1>
      <p className="text-sm text-gray-600">API_BASE：{import.meta.env.VITE_API_BASE}</p>
      <p className="text-sm text-gray-600">Authorization：{import.meta.env.VITE_API_BEARER ? 'Bearer ***' : '(未設定)'}</p>
      <p className="text-sm text-gray-600">裝置：{navigator.userAgent}</p>
      <p className="text-sm text-gray-600">線上狀態：{navigator.onLine ? 'Online' : 'Offline'}</p>
    </div>
  )
}