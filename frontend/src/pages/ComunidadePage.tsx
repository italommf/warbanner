import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCommunity, useCommunityLatest } from '@/api/hooks'
import type { CommunityBanner } from '@/api/hooks'
import { useBannerStore } from '@/store/bannerStore'
import { BannerImage } from '@/components/canvas/BannerImage'
import { VIDEO_EXT } from '@/App'
import styles from './ComunidadePage.module.css'

// ── Painel de fundo ───────────────────────────────────────────────────────────

function meshGradient(tl: string, tr: string, bl: string, br: string, a = 0.70): string {
  return [
    `radial-gradient(ellipse at   0%   0%, rgba(${tl},${a}) 0%, transparent 70%)`,
    `radial-gradient(ellipse at 100%   0%, rgba(${tr},${a}) 0%, transparent 70%)`,
    `radial-gradient(ellipse at   0% 100%, rgba(${bl},${a}) 0%, transparent 70%)`,
    `radial-gradient(ellipse at 100% 100%, rgba(${br},${a}) 0%, transparent 70%)`,
    'rgba(8,13,21,0.82)',
  ].join(', ')
}

function usePanelBg(): string {
  const bgImage  = useBannerStore((s) => s.bgImage)
  const bgColors = useBannerStore((s) => s.bgColors)
  if (!bgImage) return 'rgba(8, 13, 21, 0.80)'
  if (VIDEO_EXT.test(bgImage)) return meshGradient('8,13,21', '8,13,21', '8,13,21', '8,13,21', 0.50)
  if (bgColors) {
    const { tl, tr, bl, br } = bgColors
    return meshGradient(tl, tr, bl, br)
  }
  return 'rgba(8, 13, 21, 0.80)'
}

// ── Avatar ─────────────────────────────────────────────────────────────────────

function UserAvatar({ username, avatar, size = 28 }: { username: string; avatar: string | null; size?: number }) {
  if (avatar) {
    return <img src={avatar} alt={username} className={styles.avatar} style={{ width: size, height: size }} />
  }
  return (
    <span className={styles.avatarInitial} style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {username?.[0]?.toUpperCase() ?? '?'}
    </span>
  )
}

// ── Modal de preview ───────────────────────────────────────────────────────────

function PreviewModal({ banner, onClose }: { banner: CommunityBanner; onClose: () => void }) {
  const dateStr = new Date(banner.created_at).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return createPortal(
    <motion.div
      className={styles.overlay}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
          <div className={styles.previewUser}>
            <UserAvatar username={banner.username} avatar={banner.avatar} size={32} />
            <div className={styles.previewInfo}>
              <span className={styles.previewNick}>{banner.nick || '—'}</span>
              <span className={styles.previewUsername}>@{banner.username} · {dateStr}</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕ FECHAR</button>
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  )
}

// ── Carrossel ─────────────────────────────────────────────────────────────────
// Mais novo à esquerda (ordem da API). 6 itens visíveis por vez.
// Novo banner entra deslizando da esquerda; os demais se deslocam para a direita.

function Carousel() {
  const { data: banners = [] } = useCommunityLatest()
  const [preview, setPreview] = useState<CommunityBanner | null>(null)

  return (
    <div className={styles.carouselWrap}>
      <div className={styles.carouselTrack}>
        <AnimatePresence initial={false} mode="popLayout">
          {banners.map((b) => (
            <motion.button
              key={b.id}
              layout
              className={styles.carouselItem}
              initial={{ x: '-110%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              onClick={() => setPreview(b)}
              title={`${b.nick} — @${b.username}`}
            >
              <BannerImage banner={b} className={styles.carouselImg} />
              <div className={styles.carouselLabel}>
                <UserAvatar username={b.username} avatar={b.avatar} size={18} />
                <span>@{b.username}</span>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {preview && <PreviewModal banner={preview} onClose={() => setPreview(null)} />}
      </AnimatePresence>
    </div>
  )
}

// ── Card do grid ───────────────────────────────────────────────────────────────

const cardVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

function CommunityCard({ banner }: { banner: CommunityBanner }) {
  const [showPreview, setShowPreview] = useState(false)

  const dateStr = new Date(banner.created_at).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  return (
    <>
      <motion.div className={styles.card} variants={cardVariants} whileHover={{ borderColor: 'var(--border2)' }}>
        <div className={styles.cardHeader}>
          <UserAvatar username={banner.username} avatar={banner.avatar} />
          <div className={styles.cardUserInfo}>
            <span className={styles.cardUsername}>@{banner.username}</span>
            <span className={styles.cardDate}>{dateStr}</span>
          </div>
        </div>

        <BannerImage
          banner={banner}
          className={styles.cardImg}
          onClick={() => setShowPreview(true)}
        />

        <div className={styles.cardFooter}>
          <span className={styles.cardNick}>{banner.nick || '—'}</span>
          {banner.clan && <span className={styles.cardClan}>{banner.clan}</span>}
        </div>
      </motion.div>

      <AnimatePresence>
        {showPreview && (
          <PreviewModal banner={banner} onClose={() => setShowPreview(false)} />
        )}
      </AnimatePresence>
    </>
  )
}

// ── Filtros ────────────────────────────────────────────────────────────────────

type SortOrder = 'newest' | 'oldest'

/** Agrupa itens por chave preservando a ordem de primeira aparição e mantendo todos os itens de cada grupo juntos. */
function grouped<T>(items: T[], keyFn: (item: T) => string): T[] {
  const map = new Map<string, T[]>()
  for (const item of items) {
    const k = keyFn(item)
    if (!map.has(k)) map.set(k, [])
    map.get(k)!.push(item)
  }
  return Array.from(map.values()).flat()
}

function applyFilters(
  banners: CommunityBanner[],
  sort: SortOrder,
  groupByPlayer: boolean,
  groupByClan: boolean,
): CommunityBanner[] {
  const result = sort === 'oldest' ? [...banners].reverse() : [...banners]

  if (groupByClan && groupByPlayer) {
    // Agrupa por clã; dentro de cada clã agrupa por jogador
    const clanMap = new Map<string, CommunityBanner[]>()
    for (const b of result) {
      const k = b.clan ?? ''
      if (!clanMap.has(k)) clanMap.set(k, [])
      clanMap.get(k)!.push(b)
    }
    return Array.from(clanMap.values()).flatMap((cb) => grouped(cb, (b) => b.username))
  }

  if (groupByClan)   return grouped(result, (b) => b.clan ?? '')
  if (groupByPlayer) return grouped(result, (b) => b.username)

  return result
}

// ── Página ─────────────────────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
}

export function ComunidadePage() {
  const panelBg = usePanelBg()
  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunity()

  const [sort, setSort]                   = useState<SortOrder>('newest')
  const [groupByPlayer, setGroupByPlayer] = useState(false)
  const [groupByClan, setGroupByClan]     = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage() },
      { threshold: 0.1 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  const allBanners: CommunityBanner[] = data?.pages.flatMap((p) => p.banners) ?? []
  const total = data?.pages[0]?.total ?? 0
  const filtered = applyFilters(allBanners, sort, groupByPlayer, groupByClan)

  return (
    <motion.main
      style={{ flex: 1, background: panelBg, position: 'relative', zIndex: 1, borderRadius: 8, overflowY: 'auto' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      <div className={styles.header}>
        <h2 className={styles.title}>BANNERS DA COMUNIDADE</h2>
        <p className={styles.subtitle}>
          Os últimos banners criados por todos os jogadores
          {total > 0 && (
            <span className={styles.count}>{total} banner{total !== 1 ? 's' : ''}</span>
          )}
        </p>
      </div>

      {isLoading && (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
          <span className={styles.loadingText}>CARREGANDO BANNERS DA COMUNIDADE...</span>
        </div>
      )}
      {isError   && <p className={styles.empty}>Erro ao conectar com o servidor.</p>}

      {!isLoading && allBanners.length === 0 && (
        <p className={styles.empty}>Nenhum banner publicado ainda. Seja o primeiro!</p>
      )}

      {allBanners.length > 0 && (
        <>
          <Carousel />

          <div className={styles.gridSection}>
            <div className={styles.gridHeader}>
              <span className={styles.gridLabel}>TODOS OS BANNERS</span>

              <div className={styles.filters}>
                <div className={styles.filterGroup}>
                  <button
                    className={`${styles.filterBtn} ${sort === 'newest' ? styles.filterActive : ''}`}
                    onClick={() => setSort('newest')}
                  >
                    MAIS RECENTES
                  </button>
                  <button
                    className={`${styles.filterBtn} ${sort === 'oldest' ? styles.filterActive : ''}`}
                    onClick={() => setSort('oldest')}
                  >
                    MAIS ANTIGOS
                  </button>
                </div>

                <button
                  className={`${styles.filterBtn} ${groupByPlayer ? styles.filterActive : ''}`}
                  onClick={() => setGroupByPlayer((v) => !v)}
                >
                  AGRUPAR POR JOGADOR
                </button>

                <button
                  className={`${styles.filterBtn} ${groupByClan ? styles.filterActive : ''}`}
                  onClick={() => setGroupByClan((v) => !v)}
                >
                  AGRUPAR POR CLÃ
                </button>
              </div>
            </div>

            <motion.div
              className={styles.grid}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              key={`${sort}-${groupByPlayer}-${groupByClan}`}
            >
              {filtered.map((banner) => (
                <CommunityCard key={banner.id} banner={banner} />
              ))}
            </motion.div>

            {filtered.length === 0 && (
              <p className={styles.empty}>Nenhum banner encontrado com esses filtros.</p>
            )}

            {/* sentinel de infinite scroll */}
            <div ref={sentinelRef} style={{ height: 40 }} />
            {isFetchingNextPage && (
              <div className={styles.loadingWrap}>
                <div className={styles.spinner} />
                <span className={styles.loadingText}>CARREGANDO MAIS BANNERS...</span>
              </div>
            )}
            {!hasNextPage && allBanners.length > 0 && (
              <p className={styles.empty} style={{ opacity: 0.4 }}>
                Todos os {total} banners carregados.
              </p>
            )}
          </div>
        </>
      )}
    </motion.main>
  )
}
