import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBannerStore } from '@/store/bannerStore'
import { useMusicStore } from '@/store/musicStore'
import { useBackgrounds } from '@/api/hooks'
import { VIDEO_EXT } from '@/App'
import styles from './WallpaperPicker.module.css'

const SPRING = { type: 'spring', stiffness: 340, damping: 32 } as const

function IconWallpaper() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

export function WallpaperPicker() {
  const [expanded, setExpanded]  = useState(false)
  const bgImage                  = useBannerStore((s) => s.bgImage)
  const setBgImage               = useBannerStore((s) => s.setBgImage)
  const { data: bgs = [] }       = useBackgrounds()
  const videos                   = bgs.filter((b) => b.type === 'video')
  const playKey                  = useMusicStore((s) => s.playKey)
  const playerExpanded           = useMusicStore((s) => s.playerExpanded)
  const musicInitRef             = useRef(false)

  // Set main.mp4 as default wallpaper on first load
  useEffect(() => {
    if (bgImage === null && videos.length > 0) {
      const main = videos.find((v) => v.url.toLowerCase().includes('main.mp4'))
      setBgImage(main?.url ?? videos[0].url)
    }
  }, [videos.length])

  // Change wallpaper randomly when music track changes
  useEffect(() => {
    if (!musicInitRef.current) { musicInitRef.current = true; return }
    if (!videos.length) return
    const others = videos.filter((v) => v.url !== bgImage)
    const pool   = others.length > 0 ? others : videos
    setBgImage(pool[Math.floor(Math.random() * pool.length)].url)
  }, [playKey])

  if (!videos.length) return null

  const isActive = bgImage !== null && VIDEO_EXT.test(bgImage)
  const W = expanded ? 320 : 64
  const H = expanded ? 92  : 64
  const R = expanded ? 10  : 32

  // 72px (music bottom) + 98px (music expanded height) + 16px gap = 186px
  // 150px when music is collapsed (default)
  const bottomPos = playerExpanded ? 186 : 150

  return (
    <motion.div
      className={styles.wrap}
      animate={{ width: W + 6, height: H + 6, borderRadius: R + 3, bottom: bottomPos }}
      transition={SPRING}
    >
      <div className={`${styles.spinRing} ${isActive ? styles.spinRingActive : ''}`} />

      <motion.div
        className={styles.container}
        animate={{ width: W, height: H, borderRadius: R }}
        transition={SPRING}
      >
        <AnimatePresence>
          {!expanded && (
            <motion.button
              key="ball"
              className={styles.ball}
              onClick={() => setExpanded(true)}
              title="Wallpaper animado"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.1 } }}
              transition={{ duration: 0.18 }}
            >
              <IconWallpaper />
            </motion.button>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {expanded && (
            <motion.div
              key="panel"
              className={styles.inner}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15, delay: 0.1 }}
            >
              <div className={styles.header}>
                <span className={styles.title}>WALLPAPER ANIMADO</span>
                <button className={styles.btnClose} onClick={() => setExpanded(false)} title="Fechar">✕</button>
              </div>

              <div className={styles.thumbRow}>
                <button
                  className={`${styles.thumb} ${!bgImage || !VIDEO_EXT.test(bgImage) ? styles.thumbActive : ''}`}
                  onClick={() => setBgImage(null)}
                  title="Nenhum"
                >
                  <span className={styles.thumbNone}>—</span>
                </button>

                {videos.map((v) => (
                  <button
                    key={v.url}
                    className={`${styles.thumb} ${bgImage === v.url ? styles.thumbActive : ''}`}
                    onClick={() => setBgImage(v.url)}
                    title={v.name}
                  >
                    <video src={v.url} muted autoPlay loop playsInline />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  )
}
