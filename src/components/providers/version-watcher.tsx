'use client'

import { useEffect, useRef } from 'react'

const CHECK_INTERVAL_MS = 2 * 60_000 // 2 min

// Polls /api/version and does ONE full reload when the deployed version changes
// from the one this tab loaded with. Fixes the "open tab keeps running old JS
// after a deploy" gap: Next.js content-hashes chunks so a fresh load is always
// current, but a tab left open never re-fetches its code until reloaded.
export function VersionWatcher() {
  const baseline = useRef<string | null>(null)
  const reloading = useRef(false)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      if (reloading.current || document.visibilityState === 'hidden') return
      try {
        const res = await fetch('/api/version', { cache: 'no-store' })
        if (!res.ok) return
        const { version } = await res.json()
        if (!version || cancelled) return
        // 'dev' is constant, so local dev never trips this.
        if (baseline.current === null) {
          baseline.current = version
        } else if (version !== baseline.current) {
          reloading.current = true
          window.location.reload()
        }
      } catch {
        // Offline / transient — ignore and try again next tick.
      }
    }

    check()
    const id = setInterval(check, CHECK_INTERVAL_MS)
    // Re-check the moment the user returns to the tab, so they land on the
    // current version instead of waiting out the interval.
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}
