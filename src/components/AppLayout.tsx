import { Suspense, useRef } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useSidebarToggle } from '../lib/interactions'
import Sidebar from './Sidebar'
import './AppLayout.css'

/** Shell for the signed-in pages: sidebar/bottom navigation + routed page */
export default function AppLayout() {
  const { user } = useAuth()
  const { status } = useData()
  const appRef = useRef<HTMLDivElement>(null)
  useSidebarToggle(appRef)

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className="app" ref={appRef}>
      <Sidebar />
      <main className="app__main" id="main">
        <h1 className="sr-only">Finance</h1>
        {status === 'loading' && <p className="empty-state">Loading your finances…</p>}
        {status === 'error' && <p className="empty-state">Sorry, your data could not be loaded. Please try again.</p>}
        {status === 'ready' && (
          <Suspense fallback={<p className="empty-state">Loading…</p>}>
            <Outlet />
          </Suspense>
        )}
      </main>
    </div>
  )
}
