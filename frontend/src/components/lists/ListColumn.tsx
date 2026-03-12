import { useRef, useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useBannerStore } from '@/store/bannerStore'
import type { Category } from '@/store/bannerStore'
import type { Item } from '@/api/hooks'

import { ListItem } from './ListItem'
import { ListModal } from './ListModal'
import styles from './ListColumn.module.css'

const PAGE_SIZE = 100

const LABELS: Record<Category, string> = {
  marcas: 'Marcas',
  insignias: 'Insígnias',
  fitas: 'Fitas',
}

const SKELETON_COUNT = 14

function SkeletonList() {
  return (
    <div className={styles.skeletonList}>
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <div key={i} className={styles.skeletonItem} style={{ animationDelay: `${i * 40}ms` }}>
          <div className={styles.skeletonText} />
          <div className={styles.skeletonThumb} />
        </div>
      ))}
    </div>
  )
}

interface Props {
  category: Category
  items: Item[]
  columnIndex: number
  isLoading?: boolean
}


export function ListColumn({ category, items, columnIndex, isLoading = false }: Props) {
  const state = useBannerStore((s) => s[category])
  const selectItem = useBannerStore((s) => s.selectItem)

  const [modalOpen, setModalOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, items.length))
  }, [items.length])

  // Reset quando a lista mudar (ex: polling atualiza os dados)
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [items.length])

  // IntersectionObserver: carrega mais ao chegar perto do fim
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

  const visibleItems = items.slice(0, visibleCount)
  const total = items.length
  const selectedIndex = state.selected
    ? items.findIndex((x) => x.filename === state.selected) + 1
    : 0

  return (
    <motion.div
      className={styles.column}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: columnIndex * 0.05 }}
    >
      <div className={styles.header}>
        <span className={styles.title}>
          {LABELS[category]}{' '}
          <span className={styles.count}>{selectedIndex}/{total}</span>
        </span>
        <button className={styles.expandBtn} title="Expandir" onClick={() => setModalOpen(true)}>⛶</button>
      </div>

      {modalOpen && (
        <ListModal category={category} items={items} onClose={() => setModalOpen(false)} />
      )}

      {isLoading ? (
        <SkeletonList />
      ) : total === 0 ? (
        <div className={styles.empty}>
          Sem {LABELS[category].toLowerCase()} disponíveis
        </div>
      ) : (
        <div className={styles.items}>
          {visibleItems.map((item) => (
            <ListItem
              key={item.filename}
              item={item}
              category={category}
              isSelected={state.selected === item.filename}
              onClick={() => selectItem(category, item.filename)}
            />
          ))}
          {visibleCount < total && <div ref={sentinelRef} className={styles.sentinel} />}
        </div>
      )}
    </motion.div>
  )
}
