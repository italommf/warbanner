import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBannerStore } from '@/store/bannerStore'
import { usePatentes } from '@/api/hooks'
import styles from './PatenteSelector.module.css'

export function PatenteSelector() {
  const [isOpen, setIsOpen] = useState(false)
  const selected      = useBannerStore((s) => s.patentes.selected)
  const selectPatente = useBannerStore((s) => s.selectPatente)
  const items         = usePatentes()

  useEffect(() => {
    if (items.length > 0 && selected === null) {
      selectPatente(items[0].filename)
    }
  }, [items, selected, selectPatente])

  const selectedItem = selected ? items.find((x) => x.filename === selected) : null

  function handleSelect(filename: string) {
    selectPatente(filename)
    setIsOpen(false)
  }

  return (
    <div className={styles.row}>
      <div className={styles.selector}>
        <div
          className={styles.current}
          onClick={() => setIsOpen((v) => !v)}
        >
          {selectedItem ? (
            <img src={selectedItem.url} alt={selectedItem.name} className={styles.currentImg} />
          ) : (
            <div className={styles.placeholder}>—</div>
          )}
          <span className={styles.currentName}>
            {selectedItem ? selectedItem.name : 'Selecionar patente'}
          </span>
          <motion.span
            className={styles.arrow}
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            ▼
          </motion.span>
        </div>

        <AnimatePresence>
          {isOpen && (
            <>
              <div className={styles.overlay} onClick={() => setIsOpen(false)} />
              <motion.div
                className={styles.dropdown}
                initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                style={{ transformOrigin: 'top' }}
              >
                {items.map((item) => (
                  <div
                    key={item.filename}
                    className={`${styles.option} ${selected === item.filename ? styles.optionSelected : ''}`}
                    title={item.name}
                    onClick={() => handleSelect(item.filename)}
                  >
                    <img src={item.url} alt={item.name} />
                  </div>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
