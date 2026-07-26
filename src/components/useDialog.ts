import { useEffect, useRef } from 'react'

/**
 * Lightweight dialog accessibility: Escape-to-close, initial focus on the
 * panel, and body-scroll lock while open. Attach the returned ref to the modal
 * panel (also give it role="dialog" aria-modal="true" tabIndex={-1}).
 */
export function useDialog<T extends HTMLElement = HTMLDivElement>(onClose: () => void) {
  const ref = useRef<T>(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current()
    }
    document.addEventListener('keydown', onKey)
    ref.current?.focus()
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [])

  return ref
}
