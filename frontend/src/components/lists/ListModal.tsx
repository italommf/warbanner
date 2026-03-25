import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useBannerStore } from '@/store/bannerStore'
import type { Category } from '@/store/bannerStore'
import type { Item } from '@/api/hooks'
import { formatAmount } from '@/utils/format'
import { applyFilters } from '@/utils/challenges'
import { FilterBar, ColorFilterBar, SearchBar } from '@/components/filter/FilterBar'
import styles from './ListModal.module.css'

const PAGE_SIZE = 100

const LABELS: Record<Category, string> = {
  marcas: 'Marcas',
  insignias: 'Insígnias',
  fitas: 'Fitas',
}

interface Props {
  category: Category
  items: Item[]
  onClose: () => void
  onSelect?: (item: Item) => void
  selectedFilename?: string | null
  showFilters?: boolean
}

export function ListModal({ category, items, onClose, onSelect, selectedFilename, showFilters = false }: Props) {
  const state = useBannerStore((s) => s[category])
  const selectItem = useBannerStore((s) => s.selectItem)

  const effectiveSelected = selectedFilename !== undefined ? selectedFilename : state.selected

  // Filtros globais: devem ser iguais aos usados em "criar banner".
  const mainFilter = useBannerStore((s) => s.mainFilter)
  const armasFilter = useBannerStore((s) => s.armasFilter)
  const colorFilter = useBannerStore((s) => s.colorFilter)
  const searchTerm = useBannerStore((s) => s.searchTerm)
  const hideEmpty = useBannerStore((s) => s.hideEmpty)

  const filteredItems = useMemo(() => {
    if (!showFilters) return items
    return applyFilters(items, category, mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty)
  }, [showFilters, items, category, mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty])

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredItems.length))
  }, [filteredItems.length])

  // Quando filtros mudam, volta para o topo (mesmo comportamento do scrolling).
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [filteredItems])

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

  const visibleItems = filteredItems.slice(0, visibleCount)
  const total = filteredItems.length
  const selectedIndex = effectiveSelected
    ? filteredItems.findIndex((x) => x.filename === effectiveSelected) + 1
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

          {showFilters && (
            <div className={styles.filters}>
              <FilterBar />
              <ColorFilterBar />
              <SearchBar />
            </div>
          )}

          <div className={`${styles.grid} ${filteredItems.length === 0 ? styles.gridEmpty : ''}`}>
            {filteredItems.length === 0 ? (
              <div className={styles.emptyContainer}>
                <div className={styles.emptyIcon}>🏆</div>
                <p className={styles.emptyTitle}>NENHUMA CONQUISTA ENCONTRADA</p>
                <p className={styles.emptyDesc}>
                  Você ainda não possui conquistas nesta categoria. 
                  Continue jogando e processe suas capturas para desbloqueá-las!
                </p>
              </div>
            ) : (
              visibleItems.map((item) => (
                <div
                  key={item.filename}
                  className={`${styles.cell} ${effectiveSelected === item.filename ? styles.selected : ''} ${category === 'fitas' ? styles.cellFita : ''}`}
                  title={`${item.name}${item.description ? `\n\n${item.description}` : ''}${item.amount ? `\nObjetivo: ${formatAmount(item.amount)}` : ''}`}
                  onClick={() => {
                    if (onSelect) { onSelect(item); onClose() }
                    else { selectItem(category, item.filename); onClose() }
                  }}
                >
                  <img src={item.url} alt={item.name} loading="lazy" />
                  <span className={styles.cellName}>{item.name}</span>
                </div>
              ))
            )}
            {visibleCount < total && <div ref={sentinelRef} className={styles.sentinel} />}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  )
}
