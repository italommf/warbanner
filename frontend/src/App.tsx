import { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { TopNav } from '@/components/layout/TopNav'
import { BottomBar } from '@/components/layout/BottomBar'
import { MusicPlayer } from '@/components/layout/MusicPlayer'
import { CreatorPage } from '@/pages/CreatorPage'
import { HistoricoPage } from '@/pages/HistoricoPage'
import { ComunidadePage } from '@/pages/ComunidadePage'
import { GuardarWarfacePage } from '@/pages/GuardarWarfacePage'
import { AuthPage } from '@/pages/AuthPage'
import { useBannerStore } from '@/store/bannerStore'
import { useAuthStore } from '@/store/authStore'
import type { BgColors } from '@/store/bannerStore'
import styles from './App.module.css'

export const VIDEO_EXT = /\.(mp4|webm|mov)$/i

function avgRgb(data: Uint8ClampedArray): string {
  let r = 0, g = 0, b = 0
  const count = data.length / 4
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]; g += data[i + 1]; b += data[i + 2]
  }
  return `${Math.round(r / count)},${Math.round(g / count)},${Math.round(b / count)}`
}

function extractPanelEdgeColors(url: string, viewportWidth: number): Promise<BgColors | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const W = 200, H = 100
      const canvas = document.createElement('canvas')
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return }
      ctx.drawImage(img, 0, 0, W, H)
      const panelW = Math.min(1200, viewportWidth)
      const sideW = (viewportWidth - panelW) / 2
      const lx = Math.round((sideW / viewportWidth) * W)
      const rx = Math.round(((sideW + panelW) / viewportWidth) * W)
      const pw = Math.max(1, rx - lx)
      const qw = Math.max(1, Math.round(pw / 3))
      const qh = Math.round(H / 2)
      resolve({
        tl: avgRgb(ctx.getImageData(lx, 0, qw, qh).data),
        tr: avgRgb(ctx.getImageData(rx - qw, 0, qw, qh).data),
        bl: avgRgb(ctx.getImageData(lx, qh, qw, H - qh).data),
        br: avgRgb(ctx.getImageData(rx - qw, qh, qw, H - qh).data),
      })
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

// Lê token do Discord OAuth da query string e salva no store
function useDiscordTokenFromUrl() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('token')
    const refresh = params.get('refresh')
    if (!token || !refresh) return

    // Busca dados do usuário com o token recebido
    fetch('/api/auth/me/', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((user) => {
        setAuth(user, token, refresh)
        // Remove os parâmetros da URL sem recarregar a página
        navigate('/', { replace: true })
      })
      .catch(() => navigate('/login', { replace: true }))
  }, [])
}

// Aplica dados do perfil ao bannerStore na inicialização (sessão persistida)
function useProfileSync() {
  const user = useAuthStore((s) => s.user)
  const setNick = useBannerStore((s) => s.setNick)
  const setClan = useBannerStore((s) => s.setClan)
  const selectPatente = useBannerStore((s) => s.selectPatente)

  useEffect(() => {
    if (!user) return
    if (user.game_nick) setNick(user.game_nick)
    if (user.game_clan) setClan(user.game_clan)
    if (user.game_rank) selectPatente(user.game_rank)
  }, [])
}

export function App() {
  const location = useLocation()
  const isHistorico = location.pathname === '/historico'
  const isLogin = location.pathname === '/login'
  const bgImage = useBannerStore((s) => s.bgImage)
  const setBgColors = useBannerStore((s) => s.setBgColors)
  const isVideo = bgImage ? VIDEO_EXT.test(bgImage) : false

  useDiscordTokenFromUrl()
  useProfileSync()

  useEffect(() => {
    if (!bgImage || isVideo) { setBgColors(null); return }
    extractPanelEdgeColors(bgImage, window.innerWidth).then(setBgColors)
  }, [bgImage])

  return (
    <>
      <MusicPlayer />
      {!isLogin && <TopNav />}
      <div
        className={`${styles.routeArea} ${bgImage && !isLogin ? styles.hasBg : ''}`}
        style={bgImage && !isVideo && !isLogin ? { backgroundImage: `url(${bgImage})` } : undefined}
      >
        {!isLogin && (
          <AnimatePresence mode="wait">
            {bgImage && isVideo && (
              <motion.video
                key={bgImage}
                className={styles.bgVideo}
                src={bgImage}
                autoPlay
                loop
                muted
                playsInline
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              />
            )}
          </AnimatePresence>
        )}
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<CreatorPage />} />
            <Route path="/historico" element={<HistoricoPage />} />
            <Route path="/comunidade" element={<ComunidadePage />} />
            <Route path="/guardar" element={<GuardarWarfacePage />} />
            <Route path="/login" element={<AuthPage />} />
          </Routes>
        </AnimatePresence>
      </div>
      {!isLogin && <BottomBar isHistorico={isHistorico} />}
    </>
  )
}
