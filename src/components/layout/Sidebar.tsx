import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { HardDrive, LogIn, LogOut } from 'lucide-react'
import { isActive, navItems, statsNavItem } from '../../lib/navigation'
import { LogoMark, Wordmark } from '../brand/Logo'
import { Avatar } from '../account/Avatar'
import { useAccount } from '../../store/account'

/** Fixed left navigation for screens ≥ 1024px. */
export function Sidebar() {
  const { pathname } = useLocation()
  const items = [...navItems.slice(0, 1), statsNavItem, ...navItems.slice(1)]
  const { user, busy, signIn, signOut } = useAccount()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] flex-col border-r border-line bg-surface/70 px-4 pb-6 pt-7 backdrop-blur-xl lg:flex">
      <Link to="/review" className="flex items-center gap-2.5 rounded-xl px-2" aria-label="YoZu 記憶卡首頁">
        <LogoMark size={38} className="rounded-[11px] shadow-card" />
        <Wordmark />
      </Link>

      <nav aria-label="主要導覽" className="mt-9 flex flex-1 flex-col gap-1">
        {items.map((item) => {
          // 統計 has its own entry here, so 複習 should not also light up for it.
          const active =
            item === navItems[0] ? pathname.startsWith('/review') : isActive(item, pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={clsx(
                'relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors',
                active ? 'font-semibold text-ink' : 'font-medium text-ink-2 hover:bg-fill-2 hover:text-ink',
              )}
            >
              {active && (
                <motion.span
                  layoutId="side-pill"
                  transition={{ type: 'spring', stiffness: 520, damping: 42 }}
                  className="absolute inset-0 rounded-xl bg-fill"
                />
              )}
              <Icon size={19} strokeWidth={active ? 2.3 : 2} className="relative" aria-hidden />
              <span className="relative">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {user ? (
        <div className="flex items-center gap-2.5 rounded-2xl bg-fill-2 p-2.5">
          <Link to="/settings" className="flex min-w-0 flex-1 items-center gap-2.5" aria-label="帳號與雲端備份">
            <Avatar user={user} />
            <span className="min-w-0">
              <span className="block truncate text-[14px] font-medium text-ink">{user.displayName ?? '已登入'}</span>
              {user.email && <span className="block truncate text-[12px] text-ink-2">{user.email}</span>}
            </span>
          </Link>
          <button
            type="button"
            disabled={busy}
            onClick={() => void signOut()}
            aria-label="登出"
            title="登出"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-fill hover:text-ink"
          >
            <LogOut size={17} />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-fill-2 p-3 text-[12px] leading-relaxed text-ink-2">
          <span className="flex items-start gap-2.5">
            <HardDrive size={15} className="mt-0.5 shrink-0" aria-hidden />
            <span>資料僅儲存在此瀏覽器。登入後可備份到雲端。</span>
          </span>
          <button
            type="button"
            disabled={busy || user === undefined}
            onClick={() => void signIn()}
            className="flex min-h-9 items-center justify-center gap-2 rounded-xl bg-brand text-[14px] font-semibold text-white disabled:opacity-50"
          >
            <LogIn size={16} aria-hidden />
            使用 Google 登入
          </button>
        </div>
      )}
    </aside>
  )
}
