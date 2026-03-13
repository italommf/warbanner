import { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useBannerStore } from '@/store/bannerStore'
import { useCanvasDraw } from './useCanvasDraw'
import styles from './BannerCanvas.module.css'

export function BannerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setCanvasRef = useBannerStore((s) => s.setCanvasRef)
  const hideEmpty = useBannerStore((s) => s.hideEmpty)
  const setHideEmpty = useBannerStore((s) => s.setHideEmpty)
  const nick = useBannerStore((s) => s.nick)
  const setNick = useBannerStore((s) => s.setNick)
  const clan = useBannerStore((s) => s.clan)
  const setClan = useBannerStore((s) => s.setClan)

  useCanvasDraw(canvasRef)

  useEffect(() => {
    setCanvasRef(canvasRef)
    return () => setCanvasRef(null)
  }, [setCanvasRef])

  return (
    <motion.section
      className={styles.section}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.12, delay: 0.02 }}
    >
      <p className={styles.label}>Seu banner pessoal</p>
      <div className={styles.wrapper}>
        <canvas ref={canvasRef} width={520} height={110} className={styles.canvas} />

        <div className={styles.controlsLayout}>
          <div className={styles.inputsGroup}>
            <input
              type="text"
              className={styles.input}
              placeholder="Nickname"
              maxLength={30}
              value={nick}
              onChange={(e) => setNick(e.target.value)}
            />
            <input
              type="text"
              className={styles.input}
              placeholder="Nome do clã"
              maxLength={20}
              value={clan}
              onChange={(e) => setClan(e.target.value)}
            />
          </div>

          <label className={styles.noFrameLabel}>
            <input
              type="checkbox"
              checked={hideEmpty}
              onChange={(e) => setHideEmpty(e.target.checked)}
            />
            Sem nome ou Desc
          </label>
        </div>
      </div>
    </motion.section>
  )
}
