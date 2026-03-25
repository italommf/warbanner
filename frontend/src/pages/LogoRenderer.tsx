import { useRef, useEffect, useState } from 'react'
import styles from './LogoRenderer.module.css'

export function LogoRenderer() {
  const canvasRefLarge = useRef<HTMLCanvasElement>(null)
  const canvasRefSmall = useRef<HTMLCanvasElement>(null)
  const [fontLoaded, setFontLoaded] = useState(false)

  useEffect(() => {
    // Wait for the font to be ready
    document.fonts.ready.then(() => {
      setFontLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!fontLoaded) return
    renderLogos()
  }, [fontLoaded])

  const renderLogos = () => {
    // Render Large Logo
    const canvasL = canvasRefLarge.current
    if (canvasL) {
      const ctx = canvasL.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasL.width, canvasL.height)
        ctx.font = 'bold 120px Warface'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'

        const textWar = 'WAR'
        const textBanner = 'BANNER'
        const fullText = textWar + textBanner
        const totalWidth = ctx.measureText(fullText).width
        const startX = (canvasL.width - totalWidth) / 2

        // Draw WAR (White)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(textWar, startX + ctx.measureText(textWar).width / 2, canvasL.height / 2)

        // Draw BANNER (Red)
        ctx.fillStyle = '#e8332a'
        ctx.fillText(textBanner, startX + ctx.measureText(textWar).width + ctx.measureText(textBanner).width / 2, canvasL.height / 2)
      }
    }

    // Render Small Logo
    const canvasS = canvasRefSmall.current
    if (canvasS) {
      const ctx = canvasS.getContext('2d')
      if (ctx) {
        ctx.clearRect(0, 0, canvasS.width, canvasS.height)
        ctx.font = 'bold 120px Warface'
        ctx.textBaseline = 'middle'
        ctx.textAlign = 'center'

        const textW = 'W'
        const textB = 'B'
        const fullText = textW + textB
        const totalWidth = ctx.measureText(fullText).width
        const startX = (canvasS.width - totalWidth) / 2

        // Draw W (White)
        ctx.fillStyle = '#FFFFFF'
        ctx.fillText(textW, startX + ctx.measureText(textW).width / 2, canvasS.height / 2)

        // Draw B (Red)
        ctx.fillStyle = '#e8332a'
        ctx.fillText(textB, startX + ctx.measureText(textW).width + ctx.measureText(textB).width / 2, canvasS.height / 2)
      }
    }
  }

  const download = (canvas: HTMLCanvasElement | null, name: string) => {
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `${name}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Gerador de Logos (Fundo Transparente)</h1>
      <p className={styles.subtitle}>Os logos abaixo são renderizados com fundo transparente. Clique para baixar.</p>

      <div className={styles.section}>
        <h2>Logo Grande (WARBANNER)</h2>
        <div className={styles.canvasWrapper}>
          <canvas ref={canvasRefLarge} width={800} height={200} />
        </div>
        <button className={styles.btn} onClick={() => download(canvasRefLarge.current, 'warbanner_logo_large')}>
          Baixar Logo Grande
        </button>
      </div>

      <div className={styles.section}>
        <h2>Logo Pequena (WB)</h2>
        <div className={styles.canvasWrapper}>
          <canvas ref={canvasRefSmall} width={300} height={200} />
        </div>
        <button className={styles.btn} onClick={() => download(canvasRefSmall.current, 'warbanner_logo_small')}>
          Baixar Logo Pequena
        </button>
      </div>
    </div>
  )
}
