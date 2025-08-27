export default function Footer() {
  const v = (typeof __APP_VERSION__ !== 'undefined') ? __APP_VERSION__ : 'dev'
  const t = (typeof __BUILD_TIME__ !== 'undefined') ? __BUILD_TIME__ : ''
  return (
    <footer className="mt-12 py-8 text-center text-xs text-slate-500">
      AfterClass v{v}{t ? ` · build ${t}` : ''}
    </footer>
  )
}
