import { lazy, Suspense, useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import AppLayout from './components/AppLayout'

// Each page is its own chunk, loaded when first visited
const Overview = lazy(() => import('./pages/Overview'))
const Transactions = lazy(() => import('./pages/Transactions'))
const Budgets = lazy(() => import('./pages/Budgets'))
const Pots = lazy(() => import('./pages/Pots'))
const RecurringBills = lazy(() => import('./pages/RecurringBills'))
const Login = lazy(() => import('./pages/auth/Login'))
const SignUp = lazy(() => import('./pages/auth/SignUp'))

const TITLES: Record<string, string> = {
  '/': 'Overview',
  '/transactions': 'Transactions',
  '/budgets': 'Budgets',
  '/pots': 'Pots',
  '/recurring-bills': 'Recurring Bills',
  '/login': 'Login',
  '/signup': 'Sign Up',
}

function useDocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    const page = TITLES[pathname]
    document.title = page ? `${page} | Personal finance app` : 'Personal finance app'
    window.scrollTo(0, 0)
  }, [pathname])
}

export default function App() {
  useDocumentTitle()

  return (
    <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route element={<AppLayout />}>
          <Route index element={<Overview />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="pots" element={<Pots />} />
          <Route path="recurring-bills" element={<RecurringBills />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
