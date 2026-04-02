import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { NavLink, useNavigate } from 'react-router'
import { useBannerStore } from '@/store/bannerStore'
import { useAuthStore } from '@/store/authStore'
import { useMusicStore } from '@/store/musicStore'
import { useUpdateProfile, useChangePassword, usePatentes, useBackgrounds, useGifs } from '@/api/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { VIDEO_EXT } from '@/App'
import styles from './TopNav.module.css'

function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function IconVolume() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  )
}

function IconMute() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

// ── Widget de usuário (logado) ────────────────────────────────────────────────

interface UserWidgetProps {
  inline?: boolean
  onCloseSidebar?: () => void
}

function UserWidget({ inline, onCloseSidebar }: UserWidgetProps) {
  const { user, logout } = useAuthStore()
  const { hideEmpty, setHideEmpty, showOnlyEmpty, setShowOnlyEmpty } = useBannerStore()

  const handleToggleAll = (checked: boolean) => {
    setHideEmpty(!checked)
    if (checked) setShowOnlyEmpty(false)
  }

  const handleToggleOnlyEmpty = (checked: boolean) => {
    setShowOnlyEmpty(checked)
    if (checked) setHideEmpty(true)
  }

  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const patentes = usePatentes()

  const rankUrl = user?.game_rank
    ? patentes.find((p) => p.filename === user.game_rank)?.url
    : null

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleLogout() {
    logout()
    qc.removeQueries({ queryKey: ['history'] })
    setOpen(false)
    navigate('/')
  }

  if (!user) {
    if (inline) {
      return (
        <div className={styles.userWidgetInline}>
          <button className={styles.sidebarLoginBtn} onClick={() => { navigate('/login'); onCloseSidebar?.(); }}>
            FAZER LOGIN
          </button>
        </div>
      )
    }
    return (
      <button className={styles.loginBtn} onClick={() => navigate('/login')}>
        <span className={styles.desktopLogo}>Entrar / Criar conta</span>
        <span className={styles.mobileLogo}>ENTRAR</span>
      </button>
    )
  }

  const content = (
    <div className={`${styles.userDisplay} ${open ? styles.widgetActive : ''}`} onClick={() => !inline && setOpen((v) => !v)}>
      <div className={styles.rankIconBox}>
        {rankUrl ? (
          <img src={rankUrl} alt="rank" className={styles.rankAvatar} />
        ) : (
          <div className={styles.rankPlaceholder} />
        )}
      </div>
      <div className={styles.userLines}>
        <span className={styles.displayNick}>
          {user?.game_nick ? user.game_nick : (user?.username ? user.username : 'Soldado')}
        </span>
        {!inline && <span className={styles.displayUser}>{user?.username}</span>}
      </div>
      {!inline && (
        <div className={`${styles.gearIcon} ${open ? styles.gearIconActive : ''}`}>
          <GearIcon />
        </div>
      )}
    </div>
  )

  if (inline) {
    return (
      <div className={styles.userWidgetInline}>
        <div className={styles.userInlineMain}>
          {content}
          <div className={styles.userInlineActions}>
            <button className={styles.inlineActionBtn} onClick={() => setModalOpen(true)} title="Editar Perfil">
              <GearIcon />
            </button>
            <button className={styles.inlineLogoutBtn} onClick={() => { handleLogout(); onCloseSidebar?.(); }} title="Sair">
              <LogoutIcon />
            </button>
          </div>
        </div>
        {modalOpen && <ProfileModal onClose={() => setModalOpen(false)} />}
      </div>
    )
  }

  return (
    <div className={styles.userWidget} ref={ref}>
      {content}

      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.userDropdown}
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {user.is_staff && (
              <>
                <label className={styles.hideEmptyOption}>
                  <input
                    type="checkbox"
                    checked={!hideEmpty && !showOnlyEmpty}
                    onChange={(e) => handleToggleAll(e.target.checked)}
                  />
                  <span className={styles.optionLabel}>Todos os desafios</span>
                </label>
                <label className={styles.hideEmptyOption}>
                  <input
                    type="checkbox"
                    checked={showOnlyEmpty}
                    onChange={(e) => handleToggleOnlyEmpty(e.target.checked)}
                  />
                  <span className={styles.optionLabel}>Apenas sem nome/desc</span>
                </label>
                <div style={{ height: '1px', background: 'var(--border2)', opacity: 0.5, margin: '2px 0' }} />
                <button
                  className={styles.dropItem}
                  onClick={() => { navigate('/admin/dashboard'); setOpen(false) }}
                  style={{ color: 'var(--primary)' }}
                >
                  PAINEL ADMIN
                </button>
              </>
            )}
            <button className={styles.dropItem} onClick={() => { setModalOpen(true); setOpen(false) }}>
              EDITAR PERFIL
            </button>
            <button className={styles.logoutBtn} onClick={handleLogout}>
              SAIR PARA O DESERTO
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {modalOpen && <ProfileModal onClose={() => setModalOpen(false)} />}
    </div>
  )
}

// ── Music Widget ────────────────────────────────────────────────────────────

interface MusicWidgetProps {
  inline?: boolean
}

function MusicWidget({ inline }: MusicWidgetProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { isPlaying, isMuted, queue, currentIndex, volume, togglePlay, toggleMute, next, prev, setVolume, playKey } = useMusicStore()
  const currentTrack = queue[currentIndex]

  // GIF Logic
  const { data: gifs = [] } = useGifs()
  const [currentGif, setCurrentGif] = useState<string | null>(null)
  const gifQueueRef = useRef<string[]>([])
  const gifIndexRef = useRef(0)

  useEffect(() => {
    if (!gifs.length) return
    if (gifIndexRef.current >= gifQueueRef.current.length) {
      const shuffled = [...gifs].sort(() => Math.random() - 0.5)
      gifQueueRef.current = shuffled.map((g) => g.url)
      gifIndexRef.current = 0
    }
    setCurrentGif(gifQueueRef.current[gifIndexRef.current])
    gifIndexRef.current += 1
  }, [playKey, gifs.length])

  useEffect(() => {
    if (inline) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [inline])

  const content = (
    <div className={styles.musicMain}>
      {currentGif && (
        <div className={styles.musicGif}>
          <img src={currentGif} alt="gif" />
        </div>
      )}

      <div className={styles.musicContent}>
        <div className={styles.trackInfo}>
          <span className={styles.nowPlaying}>TOCANDO AGORA</span>
          <span className={styles.trackName}>{currentTrack?.name || '---'}</span>
        </div>

        <div className={styles.musicControls}>
          <button onClick={prev} className={styles.btnSm} title="Anterior">◀◀</button>
          <button
            onClick={togglePlay}
            className={`${styles.btnPlay} ${isPlaying ? styles.btnPlayActive : ''}`}
            title={isPlaying ? 'Pausar' : 'Tocar'}
          >
            {isPlaying ? '❙❙' : '▶'}
          </button>
          <button onClick={next} className={styles.btnSm} title="Próxima">▶▶</button>
        </div>

        <div className={styles.volumeRow}>
          <button onClick={toggleMute} className={styles.muteBtn} title={isMuted ? 'Ativar som' : 'Mutar'}>
            {isMuted ? <IconMute /> : <IconVolume />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className={styles.volumeSlider}
          />
        </div>
      </div>
    </div>
  )

  if (inline) {
    return (
      <div className={styles.musicInline}>
        <span className={styles.dropdownTitle}>PLAYER DE MÚSICA</span>
        {content}
      </div>
    )
  }

  return (
    <div className={styles.musicWidget} ref={ref}>
      <button
        className={`${styles.iconButton} ${open ? styles.widgetActive : ''}`}
        onClick={() => setOpen(!open)}
        title="Controles de Música"
      >
        <div className={`${styles.iconBorder} ${isPlaying ? styles.borderSpinning : ''}`} />
        <span className={styles.musicIconText}>♪</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={`${styles.dropdown} ${styles.musicDropdown}`}
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Wallpaper Widget ─────────────────────────────────────────────────────

interface WallpaperWidgetProps {
  inline?: boolean
}

function WallpaperWidget({ inline }: WallpaperWidgetProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { bgImage, setBgImage } = useBannerStore()
  const { data: bgs = [] } = useBackgrounds()
  const videos = bgs.filter(b => b.type === 'video')

  // Se não houver wallpaper (primeira vez), escolhe um aleatório dos vídeos disponíveis
  useEffect(() => {
    if (!bgImage && videos.length > 0) {
      const randomBg = videos[Math.floor(Math.random() * videos.length)].url
      setBgImage(randomBg)
    }
  }, [bgImage, videos, setBgImage])

  useEffect(() => {
    if (inline) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [inline])

  const content = (
    <>
      <span className={styles.dropdownTitle}>WALLPAPERS ANIMADOS</span>
      <div className={styles.wallpaperGrid}>
        {videos.map((v) => (
          <button
            key={v.url}
            className={`${styles.wallThumb} ${bgImage === v.url ? styles.wallThumbActive : ''}`}
            onClick={() => setBgImage(v.url)}
          >
            <video src={v.url} muted autoPlay loop playsInline />
          </button>
        ))}
        <button
          className={`${styles.wallThumb} ${styles.wallThumbNone} ${!bgImage || !VIDEO_EXT.test(bgImage) ? styles.wallThumbActive : ''}`}
          onClick={() => setBgImage(null)}
        >
          <span className={styles.noneLabel}>—</span>
        </button>
      </div>
    </>
  )

  if (inline) {
    return <div className={styles.wallpaperInline}>{content}</div>
  }

  return (
    <div className={styles.wallpaperWidget} ref={ref}>
      <button
        className={`${styles.iconButton} ${open ? styles.widgetActive : ''}`}
        onClick={() => setOpen(!open)}
        title="Papéis de Parede"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className={`${styles.dropdown} ${styles.wallpaperDropdown}`}
            initial={{ opacity: 0, y: -6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Lock icon ─────────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg width="10" height="12" viewBox="0 0 10 12" fill="currentColor" style={{ flexShrink: 0 }}>
      <rect x="0.5" y="5" width="9" height="7" rx="1.2" />
      <path d="M2.5 5V3.5a2.5 2.5 0 0 1 5 0V5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

// ── TopNav ─────────────────────────────────────────────────────────────────────

export function TopNav() {
  const user = useAuthStore((s) => s.user)
  const isLoggedIn = !!user
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <>
      <motion.header
        className={styles.nav}
        initial={{ y: -52, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className={styles.left}>
          <button
            className={styles.burgerBtn}
            onClick={() => setSidebarOpen(true)}
            aria-label="Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.logo}>
          <NavLink to="/" className={styles.logoLink}>
            <span className={styles.desktopLogo}>
              <span className={styles.logoWar}>WAR</span>
              <span className={styles.logoFace}>BANNER</span>
            </span>
            <span className={styles.mobileLogo}>
              <span className={styles.logoWar}>W</span>
              <span className={styles.logoFace}>B</span>
            </span>
          </NavLink>
        </div>

        <nav className={`${styles.links} ${styles.desktopOnly}`}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            CRIAR WARBANNER
          </NavLink>
          {isLoggedIn ? (
            <NavLink
              to="/historico"
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              MEUS WARBANNERS
            </NavLink>
          ) : (
            <div className={styles.lockedNav}>
              <span className={styles.navItemLocked}>
                <LockIcon />
                MEUS WARBANNERS
              </span>
              <div className={styles.navTooltip}>
                Faça login para ter acesso aos seus warbanners
              </div>
            </div>
          )}
          {isLoggedIn ? (
            <NavLink
              to="/mywf/warface"
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              MEU WARFACE
            </NavLink>
          ) : (
            <div className={styles.lockedNav}>
              <span className={styles.navItemLocked}>
                <LockIcon />
                MEU WARFACE
              </span>
              <div className={styles.navTooltip}>
                Faca login para salvar seus desafios
              </div>
            </div>
          )}
          {isLoggedIn ? (
            <NavLink
              to="/comunidade"
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
            >
              COMUNIDADE
            </NavLink>
          ) : (
            <div className={styles.lockedNav}>
              <span className={styles.navItemLocked}>
                <LockIcon />
                COMUNIDADE
              </span>
              <div className={styles.navTooltip}>
                Faça login para ver a comunidade e rankings
              </div>
            </div>
          )}
          <NavLink
            to="/apoie"
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            APOIE O PROJETO
          </NavLink>
          <NavLink
            to="/faq"
            className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}
          >
            F.A.Q
          </NavLink>
        </nav>

        <div className={styles.player}>
          <div className={styles.desktopOnlyWidgets}>
            <MusicWidget />
            <WallpaperWidget />
          </div>
          <div className={styles.headerUserWidget}>
            <UserWidget />
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              className={styles.sidebarOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              className={styles.sidebar}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            >
              <div className={styles.sidebarHeader}>
                <div className={styles.logo}>
                  <span className={styles.logoWar}>WAR</span>
                  <span className={styles.logoFace}>BANNER</span>
                </div>
                <button className={styles.closeBtn} onClick={() => setSidebarOpen(false)}>✕</button>
              </div>

              <div className={styles.sidebarContent}>
                <nav className={styles.sidebarLinks}>
                  <NavLink
                    to="/"
                    end
                    className={({ isActive }) => `${styles.sideNavItem} ${isActive ? styles.sideActive : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    CRIAR WARBANNER
                  </NavLink>
                  {isLoggedIn ? (
                    <NavLink
                      to="/historico"
                      className={({ isActive }) => `${styles.sideNavItem} ${isActive ? styles.sideActive : ''}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      MEUS WARBANNERS
                    </NavLink>
                  ) : (
                    <div className={styles.sideLockedNav}>
                      <div className={styles.sideLockedTop}>
                        <LockIcon />
                        <span>MEUS WARBANNERS</span>
                      </div>
                      <span className={styles.sideLockedSub}>Faça login para acessar</span>
                    </div>
                  )}
                  {isLoggedIn ? (
                    <NavLink
                      to="/mywf/warface"
                      className={({ isActive }) => `${styles.sideNavItem} ${isActive ? styles.sideActive : ''}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      MEU WARFACE
                    </NavLink>
                  ) : (
                    <div className={styles.sideLockedNav}>
                      <div className={styles.sideLockedTop}>
                        <LockIcon />
                        <span>MEU WARFACE</span>
                      </div>
                      <span className={styles.sideLockedSub}>Faça login para acessar</span>
                    </div>
                  )}
                  {isLoggedIn ? (
                    <NavLink
                      to="/comunidade"
                      className={({ isActive }) => `${styles.sideNavItem} ${isActive ? styles.sideActive : ''}`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      COMUNIDADE
                    </NavLink>
                  ) : (
                    <div className={styles.sideLockedNav}>
                      <div className={styles.sideLockedTop}>
                        <LockIcon />
                        <span>COMUNIDADE</span>
                      </div>
                      <span className={styles.sideLockedSub}>Faça login para acessar</span>
                    </div>
                  )}
                  <NavLink
                    to="/apoie"
                    className={({ isActive }) => `${styles.sideNavItem} ${isActive ? styles.sideActive : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    APOIE O PROJETO
                  </NavLink>
                  <NavLink
                    to="/faq"
                    className={({ isActive }) => `${styles.sideNavItem} ${isActive ? styles.sideActive : ''}`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    F.A.Q
                  </NavLink>
                </nav>

                <div className={styles.sidebarWidgets}>
                </div>
              </div>

              <div className={styles.sidebarFooter}>
                <MusicWidget inline />
                <UserWidget inline onCloseSidebar={() => setSidebarOpen(false)} />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

// ── Modal de Editar Perfil ───────────────────────────────────────────────────

type ProfileTab = 'warface' | 'warbanner'

function ProfileModal({ onClose }: { onClose: () => void }) {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const setBannerNick = useBannerStore((s) => s.setNick)
  const setBannerClan = useBannerStore((s) => s.setClan)
  const selectPatente = useBannerStore((s) => s.selectPatente)
  const hideEmpty = useBannerStore((s) => s.hideEmpty)
  const setHideEmpty = useBannerStore((s) => s.setHideEmpty)

  const [tab, setTab] = useState<ProfileTab>('warface')

  // Warface tab state
  const [nick, setNickVal] = useState(user?.game_nick ?? '')
  const [clan, setClan] = useState(user?.game_clan ?? '')
  const [rank, setRank] = useState(user?.game_rank ?? '')
  const [rankOpen, setRankOpen] = useState(false)
  const rankRef = useRef<HTMLDivElement>(null)
  const patentes = usePatentes()
  const [profileSaved, setProfileSaved] = useState(false)

  useEffect(() => {
    if (!rankOpen) return
    function onClickOutside(e: MouseEvent) {
      if (rankRef.current && !rankRef.current.contains(e.target as Node)) setRankOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [rankOpen])

  const { mutate: saveProfile, isPending: savingProfile, error: profileError } = useUpdateProfile()

  // WarBanner tab state
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [pwdSaved, setPwdSaved] = useState(false)
  const { mutate: changePwd, isPending: changingPwd, error: pwdError } = useChangePassword()

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    saveProfile({ game_nick: nick, game_clan: clan, game_rank: rank }, {
      onSuccess: (updated) => {
        updateUser(updated)
        setBannerNick(updated.game_nick ?? '')
        setBannerClan(updated.game_clan ?? '')
        selectPatente(updated.game_rank || null)
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 1800)
      },
    })
  }

  function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    changePwd({ current_password: currentPwd, new_password: newPwd, confirm_password: confirmPwd }, {
      onSuccess: () => {
        setCurrentPwd(''); setNewPwd(''); setConfirmPwd('')
        setPwdSaved(true)
        setTimeout(() => setPwdSaved(false), 1800)
      },
    })
  }

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>EDITAR PERFIL</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalTabs}>
          <button
            className={`${styles.modalTab} ${tab === 'warface' ? styles.modalTabActive : ''}`}
            onClick={() => setTab('warface')}
          >
            WARFACE
          </button>
          <button
            className={`${styles.modalTab} ${tab === 'warbanner' ? styles.modalTabActive : ''}`}
            onClick={() => setTab('warbanner')}
          >
            WARBANNER
          </button>
        </div>

        {tab === 'warface' && (
          <form className={styles.modalForm} onSubmit={handleSaveProfile}>
            <div className={styles.modalField}>
              <label>NICKNAME NO WARFACE</label>
              <input
                className={styles.modalInput}
                value={nick}
                onChange={(e) => setNickVal(e.target.value)}
                maxLength={50}
                placeholder="Seu nick no jogo"
              />
            </div>
            <div className={styles.modalField}>
              <label>CLÃ NO WARFACE</label>
              <input
                className={styles.modalInput}
                value={clan}
                onChange={(e) => setClan(e.target.value)}
                maxLength={50}
                placeholder="Nome do clã"
              />
            </div>
            <div className={styles.modalField}>
              <label>RANK NO WARFACE</label>
              <div className={styles.rankDropdown} ref={rankRef}>
                <button
                  type="button"
                  className={styles.rankTrigger}
                  onClick={() => setRankOpen((v) => !v)}
                >
                  {rank ? (
                    <>
                      <img src={patentes.find((p) => p.filename === rank)?.url} alt={rank} className={styles.rankTriggerImg} />
                      <span>{patentes.find((p) => p.filename === rank)?.name ?? rank}</span>
                    </>
                  ) : (
                    <span className={styles.rankTriggerPlaceholder}>Selecione sua patente</span>
                  )}
                  <span className={styles.rankCaret}>{rankOpen ? '▲' : '▼'}</span>
                </button>
                {rankOpen && (
                  <div className={styles.rankGrid}>
                    {patentes.map((p) => (
                      <button
                        key={p.filename}
                        type="button"
                        className={`${styles.rankItem} ${rank === p.filename ? styles.rankItemActive : ''}`}
                        onClick={() => { setRank(p.filename); setRankOpen(false) }}
                        title={p.name}
                      >
                        <img src={p.url} alt={p.name} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {profileError && <p className={styles.modalError}>{profileError.message}</p>}
            <button
              type="submit"
              className={`${styles.modalSaveBtn} ${profileSaved ? styles.modalSaveBtnOk : ''}`}
              disabled={savingProfile}
            >
              {profileSaved ? 'SALVO!' : savingProfile ? 'SALVANDO...' : 'SALVAR ALTERAÇÕES'}
            </button>
          </form>
        )}

        {tab === 'warbanner' && (
          <form className={styles.modalForm} onSubmit={handleChangePassword}>
            <div className={styles.modalField}>
              <label>SENHA ATUAL</label>
              <input
                type="password"
                className={styles.modalInput}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className={styles.modalField}>
              <label>NOVA SENHA</label>
              <input
                type="password"
                className={styles.modalInput}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className={styles.modalField}>
              <label>CONFIRMAR NOVA SENHA</label>
              <input
                type="password"
                className={styles.modalInput}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            {pwdError && <p className={styles.modalError}>{pwdError.message}</p>}
            <button
              type="submit"
              className={`${styles.modalSaveBtn} ${pwdSaved ? styles.modalSaveBtnOk : ''}`}
              disabled={changingPwd}
            >
              {pwdSaved ? 'ALTERADA!' : changingPwd ? 'ALTERANDO...' : 'ALTERAR SENHA'}
            </button>

            <div className={styles.modalSeparator} style={{ height: '1px', background: 'var(--border)', margin: '16px 0', opacity: 0.5 }} />
            
            <div className={styles.modalField}>
              <label>PREFERÊNCIAS DO BANNER</label>
              <label className={styles.hideEmptyOption} style={{ padding: '8px 0' }}>
                <input
                  type="checkbox"
                  checked={!hideEmpty}
                  onChange={(e) => setHideEmpty(!e.target.checked)}
                />
                <span className={styles.optionLabel}>Desafios sem nome/desc</span>
              </label>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
