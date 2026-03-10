import { useState } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuthStore } from '@/store/authStore'
import { useBannerStore } from '@/store/bannerStore'
import { useLogin, useRegister, useRecover, useDiscordAuthUrl, usePatentes } from '@/api/hooks'
import type { AuthResponse } from '@/api/hooks'
import { useRef, useEffect } from 'react'
import styles from './AuthPage.module.css'

type Tab = 'login' | 'register' | 'recover'

function EyeOpen() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeClosed() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}

// ── Ícone Discord ─────────────────────────────────────────────────────────────

function DiscordIcon() {
  return (
    <svg width="18" height="14" viewBox="0 0 18 14" fill="currentColor">
      <path d="M15.25 1.18A14.76 14.76 0 0 0 11.48 0c-.18.33-.38.77-.52 1.12a13.6 13.6 0 0 0-3.92 0C6.9.77 6.69.33 6.51 0A14.76 14.76 0 0 0 2.74 1.18C.39 4.8-.24 8.33.08 11.8a14.9 14.9 0 0 0 4.55 2.3c.37-.5.7-1.03.98-1.59a9.65 9.65 0 0 1-1.54-.74c.13-.09.26-.19.38-.28a10.57 10.57 0 0 0 9.08 0c.13.1.25.19.38.28-.49.29-1 .54-1.54.74.28.56.61 1.09.98 1.59a14.85 14.85 0 0 0 4.55-2.3c.37-3.93-.63-7.43-2.69-10.62ZM6.01 9.67c-.85 0-1.54-.78-1.54-1.74s.67-1.74 1.54-1.74c.86 0 1.56.78 1.54 1.74 0 .96-.68 1.74-1.54 1.74Zm5.98 0c-.85 0-1.54-.78-1.54-1.74s.67-1.74 1.54-1.74c.86 0 1.56.78 1.54 1.74 0 .96-.68 1.74-1.54 1.74Z" />
    </svg>
  )
}

// ── Botão Discord ─────────────────────────────────────────────────────────────

function DiscordButton() {
  const { data } = useDiscordAuthUrl()
  return (
    <a
      href={data?.url ?? '#'}
      className={styles.discordBtn}
      onClick={(e) => { if (!data?.url) e.preventDefault() }}
    >
      <DiscordIcon />
      Entrar com Discord
    </a>
  )
}

// ── Separador ─────────────────────────────────────────────────────────────────

function Divider() {
  return (
    <div className={styles.divider}>
      <span />
      <p>ou</p>
      <span />
    </div>
  )
}

// ── Tela: código de recuperação pós-registro ──────────────────────────────────

function RecoveryCodeDisplay({ code, onClose }: { code: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <motion.div
      className={styles.recoveryDisplay}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <p className={styles.recoveryTitle}>GUARDE SEU CÓDIGO DE RECUPERAÇÃO</p>
      <p className={styles.recoverySub}>
        Use este código para redefinir sua senha caso esqueça. Ele não será exibido novamente.
      </p>
      <div className={styles.codeBox}>
        <span className={styles.code}>{code}</span>
        <button className={styles.copyBtn} onClick={copy}>
          {copied ? 'COPIADO!' : 'COPIAR'}
        </button>
      </div>
      <button className={styles.submitBtn} onClick={onClose}>
        ENTENDIDO, SALVEI O CÓDIGO
      </button>
    </motion.div>
  )
}

// ── Tab: Login ────────────────────────────────────────────────────────────────

function LoginForm({ onSuccess, onRecover }: { onSuccess: () => void; onRecover: () => void }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const setAuth = useAuthStore((s) => s.setAuth)
  const setNick = useBannerStore((s) => s.setNick)
  const setClan = useBannerStore((s) => s.setClan)
  const selectPatente = useBannerStore((s) => s.selectPatente)
  const { mutate, isPending, error } = useLogin()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    mutate({ username, password }, {
      onSuccess: (data: AuthResponse) => {
        setAuth(data.user, data.access, data.refresh)
        if (data.user.game_nick) setNick(data.user.game_nick)
        if (data.user.game_clan) setClan(data.user.game_clan)
        if (data.user.game_rank) selectPatente(data.user.game_rank)
        onSuccess()
      },
    })
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <DiscordButton />
      <Divider />
      <div className={styles.field}>
        <label>USERNAME</label>
        <input
          className={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
        />
      </div>
      <div className={styles.field}>
        <label>SENHA</label>
        <div className={styles.inputWrapper}>
          <input
            type={showPwd ? 'text' : 'password'}
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShowPwd(!showPwd)}
            title={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPwd ? <EyeOpen /> : <EyeClosed />}
          </button>
        </div>
      </div>
      {error && <p className={styles.error}>{error.message}</p>}
      <button className={styles.submitBtn} disabled={isPending}>
        {isPending ? 'ENTRANDO...' : 'ENTRAR'}
      </button>
      <button type="button" className={styles.linkBtn} onClick={onRecover}>
        Esqueci minha senha
      </button>
    </form>
  )
}

// ── Tab: Criar conta ──────────────────────────────────────────────────────────

function RegisterForm({ onSuccess }: { onSuccess: (code: string) => void }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [gameNick, setGameNick] = useState('')
  const [gameClan, setGameClan] = useState('')
  const [gameRank, setGameRank] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [showPwd2, setShowPwd2] = useState(false)

  const [rankOpen, setRankOpen] = useState(false)
  const rankRef = useRef<HTMLDivElement>(null)
  const patentes = usePatentes()

  useEffect(() => {
    if (!rankOpen) return
    function onClickOutside(e: MouseEvent) {
      if (rankRef.current && !rankRef.current.contains(e.target as Node)) setRankOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [rankOpen])

  const setAuth = useAuthStore((s) => s.setAuth)
  const setNick = useBannerStore((s) => s.setNick)
  const setClan = useBannerStore((s) => s.setClan)
  const selectPatente = useBannerStore((s) => s.selectPatente)
  const { mutate, isPending, error } = useRegister()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    mutate({ username, email, password, password2, game_nick: gameNick, game_clan: gameClan, game_rank: gameRank }, {
      onSuccess: (data: AuthResponse) => {
        setAuth(data.user, data.access, data.refresh)
        if (data.user.game_nick) setNick(data.user.game_nick)
        if (data.user.game_clan) setClan(data.user.game_clan)
        if (data.user.game_rank) selectPatente(data.user.game_rank)
        onSuccess(data.recovery_code ?? '')
      },
    })
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <DiscordButton />
      <Divider />
      <div className={styles.field}>
        <label>USERNAME</label>
        <input
          className={styles.input}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          autoFocus
        />
      </div>
      <div className={styles.field}>
        <label>EMAIL</label>
        <input
          type="email"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          placeholder="exemplo@email.com"
        />
      </div>
      <div className={styles.field}>
        <label>NICKNAME NO WARFACE</label>
        <input
          className={styles.input}
          value={gameNick}
          onChange={(e) => setGameNick(e.target.value)}
          placeholder="Seu nick no jogo"
          autoComplete="off"
        />
      </div>
      <div className={styles.field}>
        <label>CLÃ NO WARFACE</label>
        <input
          className={styles.input}
          value={gameClan}
          onChange={(e) => setGameClan(e.target.value)}
          placeholder="Nome do clã (opcional)"
          autoComplete="off"
        />
      </div>
      <div className={styles.field}>
        <label>RANK NO WARFACE</label>
        <div className={styles.rankDropdown} ref={rankRef}>
          <button
            type="button"
            className={styles.rankTrigger}
            onClick={() => setRankOpen((v) => !v)}
          >
            {gameRank ? (
              <>
                <img src={patentes.find((p) => p.filename === gameRank)?.url} alt={gameRank} className={styles.rankTriggerImg} />
                <span>{patentes.find((p) => p.filename === gameRank)?.name ?? gameRank}</span>
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
                  className={`${styles.rankItem} ${gameRank === p.filename ? styles.rankItemActive : ''}`}
                  onClick={() => { setGameRank(p.filename); setRankOpen(false) }}
                  title={p.name}
                >
                  <img src={p.url} alt={p.name} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className={styles.field}>
        <label>SENHA</label>
        <div className={styles.inputWrapper}>
          <input
            type={showPwd ? 'text' : 'password'}
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShowPwd(!showPwd)}
            title={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPwd ? <EyeOpen /> : <EyeClosed />}
          </button>
        </div>
      </div>
      <div className={styles.field}>
        <label>CONFIRMAR SENHA</label>
        <div className={styles.inputWrapper}>
          <input
            type={showPwd2 ? 'text' : 'password'}
            className={styles.input}
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className={styles.eyeBtn}
            onClick={() => setShowPwd2(!showPwd2)}
            title={showPwd2 ? 'Ocultar senha' : 'Mostrar senha'}
          >
            {showPwd2 ? <EyeOpen /> : <EyeClosed />}
          </button>
        </div>
      </div>
      {error && <p className={styles.error}>{error.message}</p>}
      <button className={styles.submitBtn} disabled={isPending}>
        {isPending ? 'CRIANDO...' : 'CRIAR CONTA'}
      </button>
    </form>
  )
}

// ── Tab: Recuperar senha ──────────────────────────────────────────────────────

function RecoverForm({ onSuccess }: { onSuccess: (code: string) => void }) {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const setAuth = useAuthStore((s) => s.setAuth)
  const { mutate, isPending, error } = useRecover()

  function submit(e: React.FormEvent) {
    e.preventDefault()
    mutate({ email, code: code.toUpperCase(), new_password: newPassword }, {
      onSuccess: (data: AuthResponse) => {
        setAuth(data.user, data.access, data.refresh)
        onSuccess(data.recovery_code ?? '')
      },
    })
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <p className={styles.recoverSub}>
        Informe seu email e o código de recuperação que você salvou no cadastro.
      </p>
      <div className={styles.field}>
        <label>EMAIL</label>
        <input
          type="email"
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          placeholder="seu@email.com"
        />
      </div>
      <div className={styles.field}>
        <label>CÓDIGO DE RECUPERAÇÃO</label>
        <input
          className={`${styles.input} ${styles.codeInput}`}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="WOLF-1234-HAWK-5678"
          spellCheck={false}
        />
      </div>
      <div className={styles.field}>
        <label>NOVA SENHA</label>
        <input
          type="password"
          className={styles.input}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
        />
      </div>
      {error && <p className={styles.error}>{error.message}</p>}
      <button className={styles.submitBtn} disabled={isPending}>
        {isPending ? 'VERIFICANDO...' : 'REDEFINIR SENHA'}
      </button>
    </form>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────

export function AuthPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('login')
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null)

  // Lê erro de query string (ex: ?error=discord_cancelado)
  const urlError = new URLSearchParams(window.location.search).get('error')

  function afterLogin() { navigate('/') }

  function afterRegister(code: string) { setRecoveryCode(code) }

  function afterRecover(code: string) { setRecoveryCode(code) }

  const tabLabels: { id: Tab; label: string }[] = [
    { id: 'login', label: 'ENTRAR' },
    { id: 'register', label: 'CRIAR CONTA' },
  ]

  return (
    <div className={styles.page}>
      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className={styles.logo}>
          <span className={styles.logoWar}>WAR</span>
          <span className={styles.logoFace}>BANNER</span>
        </div>

        <AnimatePresence mode="wait">
          {recoveryCode ? (
            <RecoveryCodeDisplay
              key="recovery"
              code={recoveryCode}
              onClose={afterLogin}
            />
          ) : (
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === 'login' ? -12 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {tab !== 'recover' && (
                <div className={styles.tabs}>
                  {tabLabels.map((t) => (
                    <button
                      key={t.id}
                      className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
                      onClick={() => setTab(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {urlError && (
                <p className={styles.error}>
                  {urlError === 'discord_cancelado'
                    ? 'Login com Discord cancelado.'
                    : 'Falha ao conectar com Discord.'}
                </p>
              )}

              {tab === 'login' && <LoginForm onSuccess={afterLogin} onRecover={() => setTab('recover')} />}
              {tab === 'register' && <RegisterForm onSuccess={afterRegister} />}
              {tab === 'recover' && (
                <>
                  <button className={styles.backBtn} onClick={() => setTab('login')}>
                    ← Voltar
                  </button>
                  <RecoverForm onSuccess={afterRecover} />
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
