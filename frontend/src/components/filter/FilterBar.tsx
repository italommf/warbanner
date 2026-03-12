import { useRef, useEffect } from 'react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBannerStore } from '../../store/bannerStore'
import type { MainFilter, ArmasFilter, ColorFilter } from '../../store/bannerStore'
import styles from './FilterBar.module.css'

const ARMAS_LABELS: Record<ArmasFilter, string> = {
  'todos': 'Todos',
  'low': '< 999',
  '999': '999 / 1.000',
  '2500': '2.500',
  '5000': '5.000',
  '10000': 'Avançado (10.000)',
  'especiais': 'Especiais',
  'crown': 'Crown',
  'dourada': 'Dourada',
}



const COLOR_OPTIONS: { value: ColorFilter; label: string; dot: string }[] = [
  { value: 'todos', label: 'Todas as cores', dot: 'transparent' },
  { value: 'ouro', label: 'Ouro', dot: '#d4a017' },
  { value: 'prata', label: 'Prata', dot: '#a0aab8' },
  { value: 'bronze', label: 'Bronze', dot: '#8b5c2a' },
  { value: 'preto', label: 'Preto', dot: '#444' },
  { value: 'vermelho', label: 'Vermelho', dot: '#c0392b' },
  { value: 'azul', label: 'Azul', dot: '#2980b9' },
  { value: 'verde', label: 'Verde', dot: '#27ae60' },
  { value: 'outro', label: 'Outro', dot: '#666' },
]

function getFilterLabel(main: MainFilter, armas: ArmasFilter): string {
  if (main === 'armas') return `Armas — ${ARMAS_LABELS[armas]}`
  if (main !== 'todos') return main.toUpperCase()
  return 'Todos os desafios'
}

export function FilterBar() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const mainFilter = useBannerStore((s) => s.mainFilter)
  const armasFilter = useBannerStore((s) => s.armasFilter)
  const setMainFilter = useBannerStore((s) => s.setMainFilter)
  const setArmasFilter = useBannerStore((s) => s.setArmasFilter)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className={styles.wrapper} ref={ref}>
      <button className={styles.trigger} onClick={() => setOpen((v) => !v)}>
        <span className={styles.triggerLabel}>Filtro</span>
        <span className={styles.triggerValue}>{getFilterLabel(mainFilter, armasFilter)}</span>
        <motion.span
          className={styles.arrow}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >▼</motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.dropdown}
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ transformOrigin: 'top' }}
          >
            {/* Filtro principal */}

            <div className={styles.section}>
              <span className={styles.sectionLabel}>Categoria</span>
              <div className={styles.chips}>
                {(['todos', 'armas', 'pvp', 'pve'] as MainFilter[]).map((f) => (
                  <button
                    key={f}
                    className={`${styles.chip} ${mainFilter === f ? styles.chipActive : ''}`}
                    onClick={() => setMainFilter(f)}
                  >
                    {f === 'todos' ? 'Todos os desafios' : f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-filtro Armas */}
            {mainFilter === 'armas' && (
              <>
                <div className={styles.divider} />
                <div className={styles.section}>
                  <span className={styles.sectionLabel}>Eliminações</span>
                  <div className={styles.chips}>
                    {(['todos', 'low', '999', '2500', '5000', '10000'] as ArmasFilter[]).map((f) => (
                      <button
                        key={f}
                        className={`${styles.chip} ${armasFilter === f ? styles.chipActive : ''}`}
                        onClick={() => setArmasFilter(f)}
                      >
                        {ARMAS_LABELS[f]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.section} style={{ marginTop: '8px' }}>
                  <span className={styles.sectionLabel}>Outros</span>
                  <div className={styles.chips}>
                    {(['especiais', 'crown', 'dourada'] as ArmasFilter[]).map((f) => (
                      <button
                        key={f}
                        className={`${styles.chip} ${armasFilter === f ? styles.chipActive : ''}`}
                        onClick={() => setArmasFilter(f)}
                      >
                        {ARMAS_LABELS[f]}
                      </button>
                    ))}
                  </div>

                </div>
              </>
            )}

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function ColorFilterBar() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const colorFilter = useBannerStore((s) => s.colorFilter)
  const setColorFilter = useBannerStore((s) => s.setColorFilter)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const active = COLOR_OPTIONS.find((o) => o.value === colorFilter)

  return (
    <div className={styles.wrapper} ref={ref}>
      <button className={styles.trigger} onClick={() => setOpen((v) => !v)}>
        <span className={styles.triggerLabel}>Agrupar por cores</span>
        <span className={`${styles.triggerValue} ${styles.triggerValueColor}`}>
          {colorFilter !== 'todos' && active && (
            <span className={styles.colorDot} style={{ background: active.dot }} />
          )}
          {active?.label ?? 'Todas as cores'}
        </span>
        <motion.span
          className={styles.arrow}
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >▼</motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.dropdown}
            initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{ transformOrigin: 'top' }}
          >
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Cor dominante</span>
              <div className={styles.chips}>
                {COLOR_OPTIONS.map(({ value, label, dot }) => (
                  <button
                    key={value}
                    className={`${styles.chip} ${styles.chipColor} ${colorFilter === value ? styles.chipActive : ''}`}
                    onClick={() => { setColorFilter(value); setOpen(false) }}
                  >
                    {value !== 'todos' && (
                      <span className={styles.colorDot} style={{ background: dot }} />
                    )}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function SearchBar() {
  const searchTerm = useBannerStore((s) => s.searchTerm)
  const setSearchTerm = useBannerStore((s) => s.setSearchTerm)
  const hideEmpty = useBannerStore((s) => s.hideEmpty)
  const setHideEmpty = useBannerStore((s) => s.setHideEmpty)

  return (
    <div className={styles.searchContainer}>
      <div className={styles.searchWrapper}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Pesquisar desafio por nome ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        {searchTerm && (
          <button
            className={styles.clearButton}
            onClick={() => setSearchTerm('')}
            title="Limpar pesquisa"
          >
            ✕
          </button>
        )}
      </div>

      <label className={styles.checkboxLabel}>
        <input
          type="checkbox"
          checked={hideEmpty}
          onChange={(e) => setHideEmpty(e.target.checked)}
          className={styles.checkbox}
        />
        <span>Ocultar sem descrição</span>
      </label>
    </div>
  )
}

