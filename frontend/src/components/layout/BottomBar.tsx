import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useLocation, useNavigate } from 'react-router'
import { useBannerStore } from '@/store/bannerStore'
import { useAuthStore } from '@/store/authStore'
import { useSaveBanner } from '@/api/hooks'
import styles from './BottomBar.module.css'

interface Props {
  isHistorico?: boolean
}

// ── Toast "Banner Salvo" ───────────────────────────────────────────────────────

function SavedToast({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  return createPortal(
    <motion.div
      className={styles.toast}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.22 }}
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className={styles.toastIcon}>
        <circle cx="8" cy="8" r="7" stroke="#5cb85c" strokeWidth="1.5" />
        <path d="M4.5 8l2.5 2.5 4-4.5" stroke="#5cb85c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className={styles.toastBody}>
        <span className={styles.toastText}>Salvo com sucesso.</span>
        <span className={styles.toastSub}>Verifique na página de Banners Salvos</span>
      </div>
      <button
        className={styles.toastLink}
        onClick={() => { onClose(); navigate('/historico') }}
      >
        Ver
      </button>
      <button className={styles.toastClose} onClick={onClose}>✕</button>
    </motion.div>,
    document.body,
  )
}

function LockIcon() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor" style={{ flexShrink: 0 }}>
      <rect x="1" y="6" width="10" height="8" rx="1.5" />
      <path d="M3 6V4a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

// ── BottomBar ─────────────────────────────────────────────────────────────────

export function BottomBar({ isHistorico = false }: Props) {
  const nick = useBannerStore((s) => s.nick)
  const clan = useBannerStore((s) => s.clan)
  const marcas = useBannerStore((s) => s.marcas)
  const insignias = useBannerStore((s) => s.insignias)
  const fitas = useBannerStore((s) => s.fitas)
  const patentes = useBannerStore((s) => s.patentes)
  const rankLevel = useBannerStore((s) => s.rankLevel)
  const hideEmpty = useBannerStore((s) => s.hideEmpty)
  const user = useAuthStore((s) => s.user)
  const isLoggedIn = !!user
  const canSave = isLoggedIn && nick.trim() !== ''
  const { pathname } = useLocation()
  const isComunidade = pathname === '/comunidade'
  const isCreator = pathname === '/'
  const { mutateAsync, isPending } = useSaveBanner()
  const [saved, setSaved] = useState(false)
  const [toast, setToast] = useState(false)

  async function handleSave() {
    if (!nick.trim()) return
    await mutateAsync({
      nick,
      clan,
      marca: marcas.selected ?? '',
      insignia: insignias.selected ?? '',
      fita: fitas.selected ?? '',
      patente: patentes.selected ?? '',
      rank_level: rankLevel,
      hide_empty: hideEmpty,
    })
    setSaved(true)
    setToast(true)
    setTimeout(() => setSaved(false), 1800)
    setTimeout(() => setToast(false), 4000)
  }

  return (
    <>
      <motion.footer
        className={`${styles.bar} ${isComunidade ? styles.barComunidade : ''}`}
        initial={{ y: 48, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
      >
        <div className={styles.stats}>
          {/* Espaço reservado ou mantido vazio para centralizar outros elementos se necessário */}
        </div>

        {isHistorico ? (
          <a href="/" className={`${styles.saveBtn} ${styles.saveBtnLink}`}>
            NOVO WARBANNER
          </a>
        ) : isCreator ? canSave ? (
          <motion.button
            className={`${styles.saveBtn} ${saved ? styles.saved : ''}`}
            onClick={handleSave}
            disabled={isPending}
            whileTap={{ scale: 0.97 }}
          >
            {saved ? 'SALVO!' : 'SALVAR WARBANNER'}
          </motion.button>
        ) : (
          <div className={styles.lockedWrapper}>
            <div className={styles.saveBtnLocked}>
              <LockIcon />
              SALVAR WARBANNER
            </div>
            <div className={styles.lockTooltip}>
              {isLoggedIn
                ? 'Preencha o Nickname para salvar'
                : 'Faça login para poder salvar e baixar seus banners'}
            </div>
          </div>
        ) : null}
      </motion.footer>

      <AnimatePresence>
        {toast && <SavedToast onClose={() => setToast(false)} />}
      </AnimatePresence>
    </>
  )
}
