import type { CloudUser } from '../../lib/cloud'

export function Avatar({ user, size = 32 }: { user: CloudUser; size?: number }) {
  const initial = (user.displayName ?? user.email ?? '?').slice(0, 1).toUpperCase()
  return user.photoURL ? (
    <img
      src={user.photoURL}
      alt=""
      referrerPolicy="no-referrer"
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-brand font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {initial}
    </span>
  )
}
