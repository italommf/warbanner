import { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useDeleteBanner } from '@/api/hooks'
import type { BannerRecord } from '@/api/hooks'
import { BannerImage } from '@/components/canvas/BannerImage'
import { buildBannerDataUrl } from '@/components/canvas/buildBannerDataUrl'
import styles from './HistoryCard.module.css'

interface Props {
  banner: BannerRecord
}

async function triggerDownload(banner: BannerRecord, withFrame: boolean) {
  const dataUrl = await buildBannerDataUrl(banner, withFrame)

  const d   = new Date(banner.created_at)
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${pad(d.getDate())}${pad(d.getMonth() + 1)}${d.getFullYear()}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  const nick    = (banner.nick || 'jogador').replace(/\s+/g, '_')
  const suffix  = withFrame ? 'cm' : 'sm'
  const filename = `${nick}_${stamp}_${suffix}.png`

  const a = document.createElement('a')
  a.href     = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

interface PreviewModalProps {
  banner:    BannerRecord
  onClose:   () => void
  onDownload: () => void
}

function PreviewModal({ banner, onClose, onDownload }: PreviewModalProps) {
  return createPortal(
    <motion.div
      className={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.previewModal}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
      >
        <BannerImage banner={banner} className={styles.previewImg} />
        <div className={styles.previewMeta}>
          <div className={styles.info}>
            <strong>{banner.nick}</strong>
            <span>{new Date(banner.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className={styles.btns}>
            <motion.button
              className={styles.downloadBtn}
              onClick={onDownload}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              BAIXAR
            </motion.button>
            <motion.button
              className={styles.deleteBtn}
              onClick={onClose}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              FECHAR
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

interface DownloadModalProps {
  banner:  BannerRecord
  onClose: () => void
}

function DownloadModal({ banner, onClose }: DownloadModalProps) {
  const [loading, setLoading] = useState<'with' | 'without' | null>(null)

  async function handle(withFrame: boolean) {
    setLoading(withFrame ? 'with' : 'without')
    try {
      await triggerDownload(banner, withFrame)
      onClose()
    } finally {
      setLoading(null)
    }
  }

  return createPortal(
    <motion.div
      className={styles.modalOverlay}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      onClick={onClose}
    >
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.94, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 10 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
      >
        <p className={styles.modalTitle}>Baixar Banner</p>
        <p className={styles.modalSub}>Escolha como deseja salvar o arquivo:</p>

        <div className={styles.modalBtns}>
          <button
            className={styles.modalBtnPrimary}
            onClick={() => handle(true)}
            disabled={loading !== null}
          >
            {loading === 'with' ? '...' : 'Baixar'}
          </button>
          <button
            className={styles.modalBtnSecondary}
            onClick={() => handle(false)}
            disabled={loading !== null}
          >
            {loading === 'without' ? '...' : 'Baixar sem moldura'}
          </button>
          <button
            className={styles.modalBtnCancel}
            onClick={onClose}
            disabled={loading !== null}
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

export function HistoryCard({ banner }: Props) {
  const { mutate: deleteBanner } = useDeleteBanner()
  const [showPreview, setShowPreview]   = useState(false)
  const [showDownload, setShowDownload] = useState(false)

  const dateStr = new Date(banner.created_at).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <>
      <motion.div
        className={styles.card}
        layout
        exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
        whileHover={{ borderColor: 'var(--border2)' }}
        transition={{ duration: 0.2 }}
      >
        <BannerImage
          banner={banner}
          className={styles.cardImg}
          onClick={() => setShowPreview(true)}
        />

        <div className={styles.meta}>
          <div className={styles.info}>
            <strong>{banner.nick}</strong>
            <span>{dateStr}</span>
          </div>

          <div className={styles.btns}>
            <motion.button
              className={styles.downloadBtn}
              onClick={() => setShowDownload(true)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              BAIXAR
            </motion.button>
            <motion.button
              className={styles.deleteBtn}
              onClick={() => deleteBanner(banner.id)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              DELETAR
            </motion.button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showPreview && (
          <PreviewModal
            banner={banner}
            onClose={() => setShowPreview(false)}
            onDownload={() => { setShowPreview(false); setShowDownload(true) }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDownload && (
          <DownloadModal banner={banner} onClose={() => setShowDownload(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
