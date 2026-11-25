import { NavLink } from 'react-router-dom'
import type { ComponentType, SVGProps } from 'react'
import {
  IconMinimizeMenu,
  IconNavBudgets,
  IconNavOverview,
  IconNavPots,
  IconNavRecurringBills,
  IconNavTransactions,
  LogoLarge,
  LogoSmall,
} from './icons'
import './Sidebar.css'

interface NavItem {
  to: string
  label: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
}

const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Overview', icon: IconNavOverview },
  { to: '/transactions', label: 'Transactions', icon: IconNavTransactions },
  { to: '/budgets', label: 'Budgets', icon: IconNavBudgets },
  { to: '/pots', label: 'Pots', icon: IconNavPots },
  { to: '/recurring-bills', label: 'Recurring bills', icon: IconNavRecurringBills },
]

/**
 * Desktop: full height sidebar that can be minimized (handled with jQuery in AppLayout).
 * Tablet and mobile: the same navigation becomes a bar fixed to the bottom of the screen.
 */
export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__logo">
        <LogoLarge className="sidebar__logo-large" aria-hidden="true" />
        <LogoSmall className="sidebar__logo-small" aria-hidden="true" />
      </div>

      <nav className="sidebar__nav" aria-label="Main">
        <ul className="sidebar__list">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink to={to} end={to === '/'} className="sidebar__link">
                <span className="sidebar__icon" aria-hidden="true">
                  <Icon />
                </span>
                <span className="sidebar__label">{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <button type="button" className="sidebar__link sidebar__toggle" data-sidebar-toggle aria-expanded="true">
        <span className="sidebar__icon" aria-hidden="true">
          <IconMinimizeMenu />
        </span>
        <span className="sidebar__label">Minimize Menu</span>
      </button>
    </aside>
  )
}
