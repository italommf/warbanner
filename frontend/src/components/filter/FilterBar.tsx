import { useRef, useEffect } from 'react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBannerStore } from '../../store/bannerStore'
import type { FilterCategory, MainFilter, ArmasFilter, ColorFilter } from '../../store/bannerStore'
import styles from './FilterBar.module.css'

const APPLY_TO_LABELS: Record<FilterCategory, string> = {
  marcas:    'Marcas',
  insignias: 'Insígnias',
  fitas:     'Fitas',
}

const ARMAS_LABELS: Record<ArmasFilter, string> = {
  'todos': 'Todos',
  '10k':   '10.000 elim.',
  '5k':    '5.000 elim.',
  '2.5k':  '2.500 elim.',
  'ouro':  'Ouro',
}

const COLOR_OPTIONS: { value: ColorFilter; label: string; dot: string }[] = [
  { value: 'todos',    label: 'Todas as cores', dot: 'transparent' },
  { value: 'ouro',     label: 'Ouro',           dot: '#d4a017' },
  { value: 'prata',    label: 'Prata',           dot: '#a0aab8' },
  { value: 'bronze',   label: 'Bronze',          dot: '#8b5c2a' },
  { value: 'preto',    label: 'Preto',           dot: '#444' },
  { value: 'vermelho', label: 'Vermelho',        dot: '#c0392b' },
  { value: 'azul',     label: 'Azul',            dot: '#2980b9' },
  { value: 'verde',    label: 'Verde',           dot: '#27ae60' },
  { value: 'outro',    label: 'Outro',           dot: '#666' },
]

function getFilterLabel(main: MainFilter, armas: ArmasFilter): string {
  if (main === 'armas') return `Armas — ${ARMAS_LABELS[armas]}`
  if (main !== 'todos') return main.toUpperCase()
  return 'Todos os desafios'
}

export function FilterBar() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const applyTo     = useBannerStore((s) => s.applyTo)
  const mainFilter  = useBannerStore((s) => s.mainFilter)
  const armasFilter = useBannerStore((s) => s.armasFilter)
  const toggleApplyTo  = useBannerStore((s) => s.toggleApplyTo)
  const setMainFilter  = useBannerStore((s) => s.setMainFilter)
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
            {/* Aplicar filtro em */}
            <div className={styles.section}>
              <span className={styles.sectionLabel}>Aplicar filtro em</span>
              <div className={styles.chips}>
                {(Object.keys(APPLY_TO_LABELS) as FilterCategory[]).map((cat) => (
                  <button
                    key={cat}
                    className={`${styles.chip} ${applyTo.includes(cat) ? styles.chipActive : ''}`}
                    onClick={() => toggleApplyTo(cat)}
                  >
                    {APPLY_TO_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.divider} />

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
                  <span className={styles.sectionLabel}>Armas</span>
                  <div className={styles.chips}>
                    {(Object.keys(ARMAS_LABELS) as ArmasFilter[]).map((f) => (
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

  const colorFilter    = useBannerStore((s) => s.colorFilter)
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
