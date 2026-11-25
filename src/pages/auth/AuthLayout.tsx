import type { ReactNode } from 'react'
import illustration from '../../assets/images/illustration-authentication.svg'
import { LogoLarge } from '../../components/icons'
import './Auth.css'

/** Shared frame of the Login and Sign Up pages */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="auth">
      <h1 className="sr-only">Finance</h1>

      <header className="auth__topbar">
        <LogoLarge aria-label="finance" role="img" />
      </header>

      <aside className="auth__aside">
        <div className="auth__illustration">
          <img className="auth__image" src={illustration} alt="" width={560} height={920} />
          <LogoLarge className="auth__logo" aria-label="finance" role="img" />
          <div className="auth__intro">
            <p className="auth__tagline">
              Keep track of your money
              <br />
              and save for your future
            </p>
            <p className="text-preset-4">
              Personal finance app puts you in control of your spending. Track transactions, set budgets, and add to
              savings pots easily.
            </p>
          </div>
        </div>
      </aside>

      <main className="auth__main">{children}</main>
    </div>
  )
}
