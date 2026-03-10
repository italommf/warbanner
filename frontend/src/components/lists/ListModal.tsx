import { useRef, useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useBannerStore } from '@/store/bannerStore'
import type { Category } from '@/store/bannerStore'
import styles from './ListModal.module.css'

const PAGE_SIZE = 500

const LABELS: Record<Category, string> = {
  marcas:    'Marcas',
  insignias: 'Insígnias',
  fitas:     'Fitas',
}

interface Props {
  category:          Category
  items:             { name: string; filename: string; url: string }[]
  onClose:           () => void
  onSelect?:         (item: { name: string; filename: string; url: string }) => void
  selectedFilename?: string | null
}

export function ListModal({ category, items, onClose, onSelect, selectedFilename }: Props) {
  const state      = useBannerStore((s) => s[category])
  const selectItem = useBannerStore((s) => s.selectItem)

  const effectiveSelected = selectedFilename !== undefined ? selectedFilename : state.selected

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, items.length))
  }, [items.length])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore() },
      { threshold: 0.1 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loadMore])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const visibleItems = items.slice(0, visibleCount)
  const total = items.length
  const selectedIndex = effectiveSelected
    ? items.findIndex((x) => x.filename === effectiveSelected) + 1
    : 0

  return createPortal(
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.95, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 16 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <span className={styles.title}>
              {LABELS[category]}{' '}
              <span className={styles.count}>{selectedIndex}/{total}</span>
            </span>
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          </div>

          <div className={styles.grid}>
            {visibleItems.map((item) => (
              <div
                key={item.filename}
                className={`${styles.cell} ${effectiveSelected === item.filename ? styles.selected : ''}`}
                title={item.name}
                onClick={() => {
                  if (onSelect) { onSelect(item); onClose() }
                  else { selectItem(category, item.filename); onClose() }
                }}
              >
                <img src={item.url} alt={item.name} loading="lazy" />
                <span className={styles.cellName}>{item.name}</span>
              </div>
            ))}
            {visibleCount < total && <div ref={sentinelRef} className={styles.sentinel} />}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
