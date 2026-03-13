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
          <div className={styles.devCard}>
            <div className={styles.devInfo}>
              <span className={styles.devLabel}>Desenvolvido por</span>
              <div className={styles.devSocials}>
                <a href="mailto:italo.mageste@gmail.com" target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="Gmail">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6zm-2 0l-8 5-8-5h16zm0 12H4V8l8 5 8-5v10z" />
                  </svg>
                </a>
                <a href="https://www.linkedin.com/in/italommf/" target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="LinkedIn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                  </svg>
                </a>
                <a href="https://steamcommunity.com/id/Italommf/" target="_blank" rel="noopener noreferrer" className={styles.socialLink} title="Steam">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2a10 10 0 0 0-9.96 9.04l5.37 2.22a2.82 2.82 0 0 1 1.62-.51l2.54-3.69v-.06a3.75 3.75 0 1 1 3.75 3.75h-.09l-3.63 2.59a2.84 2.84 0 0 1-5.65.26L1.1 13.52A10 10 0 1 0 12 2zm5.64 9a2.25 2.25 0 1 0-4.5 0 2.25 2.25 0 0 0 4.5 0zm-8.11 5.25a1.69 1.69 0 0 0 .94-2.19l-1.22-.5a2.12 2.12 0 0 1 2.74 1.44 2.12 2.12 0 0 1-1.35 2.67 2.12 2.12 0 0 1-2.63-1.17l1.26.52a1.69 1.69 0 0 0 .26-1.77z" />
                  </svg>
                </a>
              </div>
            </div>
            <img src="/media/site/footer/footer_banner.png" alt="VIP" className={styles.devBadge} />
          </div>
        </div>

        {isHistorico ? (
          <a href="/" className={`${styles.saveBtn} ${styles.saveBtnLink}`}>
            NOVO BANNER
          </a>
        ) : isCreator ? canSave ? (
          <motion.button
            className={`${styles.saveBtn} ${saved ? styles.saved : ''}`}
            onClick={handleSave}
            disabled={isPending}
            whileTap={{ scale: 0.97 }}
          >
            {saved ? 'SALVO!' : 'SALVAR BANNER'}
          </motion.button>
        ) : (
          <div className={styles.lockedWrapper}>
            <div className={styles.saveBtnLocked}>
              <LockIcon />
              SALVAR BANNER
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
