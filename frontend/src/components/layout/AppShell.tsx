import { NavLink, Outlet } from 'react-router-dom'
import {
  Camera,
  Clapperboard,
  Download,
  Mic,
  Moon,
  Music2,
  Settings,
  Sun,
  TvMinimalPlay,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/hooks/useTheme'
import { DOWNLOAD_PAGE_IDS } from '@/config/pages'
import type { PageId } from '@/types'

const DOWNLOAD_NAV: { id: PageId; icon: typeof TvMinimalPlay; path: string; label: string }[] = [
  { id: 'youtube', icon: TvMinimalPlay, path: '/download/youtube', label: 'YouTube' },
  { id: 'instagram', icon: Camera, path: '/download/instagram', label: 'Instagram' },
  { id: 'tiktok', icon: Clapperboard, path: '/download/tiktok', label: 'TikTok' },
  { id: 'spotify', icon: Music2, path: '/download/spotify', label: 'Spotify' },
]

function NavItem({ to, icon: Icon, label }: { to: string; icon: typeof Mic; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors duration-150',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        )
      }
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {label}
    </NavLink>
  )
}

export function AppShell() {
  const { isDark, toggle } = useTheme()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-4">
        <div className="mb-6 flex items-center justify-between gap-2 px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Download className="size-4" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold tracking-tight">Media Hub</p>
              <p className="font-mono text-[10px] tracking-[0.06em] text-muted-foreground uppercase">
                FitFeed
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            title={isDark ? 'Modo claro' : 'Modo escuro'}
            aria-label={isDark ? 'Ativar modo claro' : 'Ativar modo escuro'}
          >
            {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
        </div>

        <p className="sidebar-section-label eyebrow px-3">Download</p>
        <nav className="mb-6 space-y-0.5">
          {DOWNLOAD_NAV.filter(n =>
            DOWNLOAD_PAGE_IDS.includes(n.id as (typeof DOWNLOAD_PAGE_IDS)[number])
          ).map(({ id, icon, path, label }) => (
            <NavItem key={id} to={path} icon={icon} label={label} />
          ))}
        </nav>

        <p className="sidebar-section-label eyebrow px-3">Ferramentas</p>
        <nav className="mb-6">
          <NavItem to="/transcribe" icon={Mic} label="Transcrição" />
        </nav>

        <div className="mt-auto">
          <Separator className="mb-3" />
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-3 text-muted-foreground"
            disabled
          >
            <Settings className="size-4" aria-hidden />
            Configurações
          </Button>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
