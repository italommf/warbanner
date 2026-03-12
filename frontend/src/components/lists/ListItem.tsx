import { memo } from 'react'
import { motion } from 'framer-motion'
import type { Item } from '@/api/hooks'
import type { Category } from '@/store/bannerStore'
import styles from './ListItem.module.css'
import { formatAmount } from '@/utils/format'

interface Props {
  item: Item
  category: Category
  isSelected: boolean
  onClick: () => void
}

export const ListItem = memo(function ListItem({ item, category, isSelected, onClick }: Props) {
  return (
    <motion.div
      className={`${styles.listItem} ${isSelected ? styles.selected : ''}`}
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.1 }}
    >
      <span className={styles.itemName}>{item.name}</span>
      <img
        className={`${styles.itemThumb} ${styles[`thumb_${category}` as keyof typeof styles]}`}
        src={item.url}
        alt={item.name}
        loading="lazy"
      />

      {/* Overlay com informação detalhada no hover */}
      <div className={styles.overlay}>
        <div className={styles.overlayContent}>
          <p className={styles.overlayDesc}>{item.description || 'Sem descrição.'}</p>
          {item.amount && (
            <div className={styles.overlayMeta}>
              <span>Objetivo:</span>
              <strong>{formatAmount(item.amount)}</strong>
            </div>
          )}
        </div>
      </div>
    </motion.div>

  )
})
