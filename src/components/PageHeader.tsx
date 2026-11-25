import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  action?: ReactNode
}

export default function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      <h2 className="text-preset-1">{title}</h2>
      {action}
    </header>
  )
}
