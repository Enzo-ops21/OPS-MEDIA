interface PageHeaderProps {
  eyebrow: string
  title: string
  description?: string
}

export function PageHeader({ eyebrow, title, description }: PageHeaderProps) {
  return (
    <header className="mb-10">
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title mt-2">{title}</h1>
      {description && <p className="page-desc">{description}</p>}
    </header>
  )
}
