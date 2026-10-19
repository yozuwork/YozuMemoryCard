import { Link, useLocation } from 'react-router-dom'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { isActive, navItems } from '../../lib/navigation'

/** Floating capsule tab bar for phones and tablets. */
export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="主要導覽"
      className="tabbar fixed inset-x-0 z-40 flex justify-center px-4 bottom-[max(var(--safe-bottom),12px)] lg:hidden"
    >
      <div className="glass flex h-[var(--tabbar-h)] w-full max-w-[460px] items-stretch rounded-full p-[5px] shadow-[0_10px_36px_rgb(0_0_0/0.10),0_1px_2px_rgb(0_0_0/0.05)]">
        {navItems.map((item) => {
          const active = isActive(item, pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className="relative flex flex-1 flex-col items-center justify-center gap-[3px] rounded-full outline-offset-[-2px]"
            >
              {active && (
                <motion.span
                  layoutId="tab-pill"
                  transition={{ type: 'spring', stiffness: 520, damping: 40 }}
                  className="absolute inset-0 rounded-full bg-fill"
                />
              )}
              <Icon
                size={22}
                strokeWidth={active ? 2.4 : 2}
                className={clsx('relative transition-colors', active ? 'text-ink' : 'text-ink/80')}
                aria-hidden
              />
              <span
                className={clsx(
                  'relative text-[11px] leading-none tracking-wide transition-colors',
                  active ? 'font-semibold text-ink' : 'font-medium text-ink/75',
                )}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
