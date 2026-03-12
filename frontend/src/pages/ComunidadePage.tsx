import { useState, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useCommunity, useCommunityLatest, useCommunityStatistics, type RankingItem } from '@/api/hooks'
import type { CommunityBanner } from '@/api/hooks'
import { useBannerStore } from '@/store/bannerStore'
import { useAuthStore } from '@/store/authStore'
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

// ── Componentes das Abas ────────────────────────────────────────────────────────

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
          <div className={styles.cardUserInfo}>
            <span className={styles.cardUsername}>@{banner.username}</span>
            <span className={styles.cardDate}>{dateStr}</span>
          </div>
        </div>
        <BannerImage banner={banner} className={styles.cardImg} onClick={() => setShowPreview(true)} />
        <div className={styles.cardFooter}>
          <span className={styles.cardNick}>{banner.nick || '—'}</span>
          {banner.clan && <span className={styles.cardClan}>{banner.clan}</span>}
        </div>
      </motion.div>
      <AnimatePresence>
        {showPreview && <PreviewModal banner={banner} onClose={() => setShowPreview(false)} />}
      </AnimatePresence>
    </>
  )
}

type SortOrder = 'newest' | 'oldest'

function applyFilters(banners: CommunityBanner[]): CommunityBanner[] {
  return banners
}

function WarbannersTab() {
  const [sort, setSort] = useState<SortOrder>('newest')
  const [groupByPlayer, setGroupByPlayer] = useState(false)
  const [groupByClan, setGroupByClan] = useState(false)

  const groupParam = useMemo(() => {
    if (groupByClan && groupByPlayer) return 'clan_player'
    if (groupByClan) return 'clan'
    if (groupByPlayer) return 'player'
    return ''
  }, [groupByClan, groupByPlayer])

  const { data, isLoading, isError, fetchNextPage, hasNextPage, isFetchingNextPage } = useCommunity(sort, groupParam)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = sentinelRef.current; if (!el) return
    const obs = new IntersectionObserver((es) => { if (es[0].isIntersecting && hasNextPage && !isFetchingNextPage) fetchNextPage() }, { threshold: 0.1 })
    obs.observe(el); return () => obs.disconnect()
  }, [fetchNextPage, hasNextPage, isFetchingNextPage])

  if (isLoading) return <div className={styles.loadingWrap}><div className={styles.spinner} /><span className={styles.loadingText}>CARREGANDO BANNERS...</span></div>
  if (isError) return <p className={styles.empty}>Erro ao carregar banners.</p>

  const allBanners = data?.pages.flatMap((p) => p.banners || []) ?? []
  const total = data?.pages[0]?.total ?? 0
  const filtered = applyFilters(allBanners)

  return (
    <>
      <div className={styles.gridSection} style={{ paddingBottom: 0 }}>
        <Separator title="ÚLTIMOS BANNERS FEITOS PELA COMUNIDADE" />
      </div>
      <Carousel />
      <div className={styles.gridSection}>
        <div className={styles.gridHeader} style={{ marginBottom: 24, gap: 32 }}>
          <Separator title={`TODOS OS BANNERS (${total})`} />
          <div className={styles.filters}>
            <div className={styles.filterGroup}>
              <button className={`${styles.filterBtn} ${sort === 'newest' ? styles.filterActive : ''}`} onClick={() => setSort('newest')}>MAIS RECENTES</button>
              <button className={`${styles.filterBtn} ${sort === 'oldest' ? styles.filterActive : ''}`} onClick={() => setSort('oldest')}>MAIS ANTIGOS</button>
            </div>
            <button className={`${styles.filterBtn} ${styles.filterStandalone} ${groupByPlayer ? styles.filterActive : ''}`} onClick={() => setGroupByPlayer(v => !v)}>POR JOGADOR</button>
            <button className={`${styles.filterBtn} ${styles.filterStandalone} ${groupByClan ? styles.filterActive : ''}`} onClick={() => setGroupByClan(v => !v)}>POR CLÃ</button>
          </div>
        </div>
        <motion.div className={styles.grid} initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.04 } } }}>
          {filtered.map((b) => <CommunityCard key={b.id} banner={b} />)}
        </motion.div>
        <div ref={sentinelRef} style={{ height: 40 }} />
      </div>
    </>
  )
}

// ── Utilitários ──────────────────────────────────────────────────────────────

function formatNumber(num: number): string {
  if (num % 1 !== 0) {
    return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return num.toLocaleString('pt-BR')
}

// ── Estatísticas components ───────────────────────────────────────────────────

function RankIcon({ rankIdx, size = 24 }: { rankIdx: number; size?: number }) {
  const url = `/media/site/patentes/Rank_${String(rankIdx).padStart(2, '0')}.png`
  return <img src={url} alt={`Rank ${rankIdx}`} className={styles.rankImg} style={{ width: size, height: size }} />
}

function TopRankList({ title, data, unit = '' }: { title: string; data: { top5: RankingItem[]; user: RankingItem & { rank: number } }; unit?: string }) {
  const isUserInTop5 = data.user.rank <= 5

  const getRowClass = (index: number, username: string) => {
    let classes = [styles.row]
    if (index === 0) classes.push(styles.rowGold)
    else if (index === 1) classes.push(styles.rowSilver)
    else if (index === 2) classes.push(styles.rowBronze)
    
    if (username === data.user.username) classes.push(styles.rowUser)
    return classes.join(' ')
  }

  return (
    <div className={styles.statsListCard}>
      <div className={styles.listTitle}>{title}</div>
      <div className={styles.statsList}>
        {data.top5.length === 0 ? (
          <div className={styles.emptyList}>
            <span className={styles.emptyText}>Ainda não há dados suficientes para este ranking.</span>
          </div>
        ) : (
          <>
            {data.top5.map((item, i) => (
              <div key={i} className={getRowClass(i, item.username)}>
                <span className={styles.rankPos}>{i + 1}º</span>
                <div className={styles.userInfo}>
                  <RankIcon rankIdx={item.rank_idx} size={22} />
                  <span className={styles.userNick}>{item.nick}</span>
                </div>
                <span className={styles.val}>{formatNumber(item.value)}{unit}</span>
              </div>
            ))}
            
            {!isUserInTop5 && (
              <>
                <div className={styles.ellipsis}>•••••</div>
                <div className={`${styles.row} ${styles.rowUser}`}>
                  <span className={styles.rankPos}>{data.user.rank}º</span>
                  <div className={styles.userInfo}>
                    <RankIcon rankIdx={data.user.rank_idx} size={22} />
                    <span className={styles.userNick}>{data.user.nick}</span>
                  </div>
                  <span className={styles.val}>{formatNumber(data.user.value)}{unit}</span>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ComparisonBlock({ label, communityAvg, userVal, unit = '' }: { label: string; communityAvg: number; userVal: number; unit?: string }) {
  const diff = userVal - communityAvg
  const isUp = diff >= 0

  return (
    <div className={styles.compGroup}>
      <span className={styles.compLabel}>{label}</span>
      <div className={styles.compSideBySide}>
        <div className={styles.compSide}>
          <span className={styles.compSubLabel}>Média Global</span>
          <span className={styles.avgVal}>{formatNumber(communityAvg)}{unit}</span>
        </div>
        <div className={styles.compSide}>
          <span className={styles.compSubLabel}>Você</span>
          <div className={`${styles.userCompareBadge} ${isUp ? styles.up : styles.down}`}>
            <span className={styles.arrow}>{isUp ? '↑' : '↓'}</span>
            <span className={styles.userValBadge}>{formatNumber(userVal)}{unit}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function Separator({ title }: { title: string }) {
  const parts = title.split(/(\(.*?\))/)
  return (
    <div className={styles.separator}>
      <span className={styles.sepTitle}>
        {parts.map((p, i) => p.startsWith('(') ? <span key={i}>{p}</span> : p)}
      </span>
      <div className={styles.sepLine} />
    </div>
  )
}

function CommunityStatsTab() {
  const { data: stats, isLoading } = useCommunityStatistics()

  if (isLoading) return <div className={styles.loadingWrap}><div className={styles.spinner} /><span className={styles.loadingText}>SINCRONIZANDO ESTATÍSTICAS...</span></div>
  
  const isDataReady = stats && stats.general && stats.pvp && stats.pve
  if (!isDataReady) return <p className={styles.empty}>Dados não disponíveis no momento.</p>

  // Caso não haja usuários registrados ou dados suficientes
  if (stats.general.player_count === 0) {
    return (
      <div className={styles.emptyStatsOverlay}>
        <div className={styles.emptyStatsContent}>
          <h2>AGUARDANDO REFORÇOS</h2>
          <p>Ainda não existem usuários suficientes para gerar as estatísticas globais.</p>
          <p className={styles.emptyHint}>Seja o primeiro a subir seu screenshot!</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.statsContainer}>
      {/* General Stats Section */}
      <div className={styles.section}>
        <div className={styles.combinedCard}>
          <div className={styles.combinedHeader}>Estatísticas Gerais (Comunidade)</div>
          <div className={styles.generalStatsGrid}>
            <div className={styles.genItem}>
              <span className={styles.genLabel}>Total Partidas PVP</span>
              <span className={styles.genVal}>{formatNumber(stats.general.total_pvp_matches)}</span>
            </div>
            <div className={styles.genItem}>
              <span className={styles.genLabel}>Tempo Total de Jogo</span>
              <span className={styles.genVal}>{formatNumber(stats.general.total_hours)}h</span>
            </div>
            <div className={styles.genItem}>
              <span className={styles.genLabel}>Players Registrados</span>
              <span className={styles.genVal}>{formatNumber(stats.general.player_count)}</span>
            </div>
            <div className={styles.genItem}>
              <span className={styles.genLabel}>Total Partidas PVE</span>
              <span className={styles.genVal}>{formatNumber(stats.general.total_pve_matches)}</span>
            </div>
            <div className={styles.genItem}>
              <span className={styles.genLabel}>PVE FÁCIL</span>
              <span className={styles.genVal}>{formatNumber(stats.general.total_pve_easy)}</span>
            </div>
            <div className={styles.genItem}>
              <span className={styles.genLabel}>PVE NORMAL</span>
              <span className={styles.genVal}>{formatNumber(stats.general.total_pve_normal)}</span>
            </div>
            <div className={styles.genItem}>
              <span className={styles.genLabel}>PVE DIFÍCIL</span>
              <span className={styles.genVal}>{formatNumber(stats.general.total_pve_hard)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* PVP Section */}
      <Separator title="DADOS PVP" />
      <div className={styles.section}>
        <div className={styles.rankingsRow}>
          <TopRankList title="RANKING DE MAIOR KD (PVP)" data={stats.pvp.ranking_kd} />
          <TopRankList title="MAIS PARTIDAS (PVP)" data={stats.pvp.ranking_matches} />
          <TopRankList title="TEMPO DE JOGO (PVP)" data={stats.pvp.ranking_hours} unit="h" />
          <TopRankList title="MAIOR PATENTE" data={stats.pvp.ranking_rank} />
        </div>
        
        <div className={styles.combinedCard}>
          <div className={styles.combinedHeader}>Comparativo PVP</div>
          <div className={styles.combinedBodyHorizontal}>
            <ComparisonBlock label="MÉDIA DE KD" communityAvg={stats.pvp.community_avgs.kd} userVal={stats.pvp.user_stats.kd} />
            <ComparisonBlock label="MÉDIA DE PARTIDAS" communityAvg={stats.pvp.community_avgs.matches} userVal={stats.pvp.user_stats.matches} />
            <ComparisonBlock label="MÉDIA DE HORAS - PVP" communityAvg={stats.pvp.community_avgs.hours} userVal={stats.pvp.user_stats.hours} unit="h" />
            <ComparisonBlock label="MÉDIA DE PATENTE" communityAvg={stats.pvp.community_avgs.rank} userVal={stats.pvp.user_stats.rank} />
          </div>
        </div>
      </div>

      {/* PVE Section */}
      <Separator title="DADOS COOP" />
      <div className={styles.section}>
        <div className={styles.rankingsRow}>
          <TopRankList title="PARTIDAS TOTAIS NO COOP (PVE)" data={stats.pve.ranking_total} />
          <TopRankList title="PVE FÁCIL" data={stats.pve.ranking_easy} />
          <TopRankList title="PVE MÉDIO" data={stats.pve.ranking_normal} />
          <TopRankList title="PVE DIFÍCIL" data={stats.pve.ranking_hard} />
        </div>

        <div className={styles.combinedCard}>
          <div className={styles.combinedHeader}>Comparativo PVE</div>
          <div className={styles.combinedBodyHorizontalPve}>
            <ComparisonBlock label="PARTIDAS TOTAIS PVE" communityAvg={stats.pve.community_avgs.total} userVal={stats.pve.user_stats.total} />
            <ComparisonBlock label="MÉDIA DE HORAS - PVE" communityAvg={stats.pve.community_avgs.hours} userVal={stats.pve.user_stats.hours} unit="h" />
            <ComparisonBlock label="Média de partidas - Fácil" communityAvg={stats.pve.community_avgs.easy} userVal={stats.pve.user_stats.easy} />
            <ComparisonBlock label="Média de partidas - Normal" communityAvg={stats.pve.community_avgs.normal} userVal={stats.pve.user_stats.normal} />
            <ComparisonBlock label="Média de partidas - Difícil" communityAvg={stats.pve.community_avgs.hard} userVal={stats.pve.user_stats.hard} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página Principal ───────────────────────────────────────────────────────────

export function ComunidadePage() {
  const user = useAuthStore(s => s.user)
  const panelBg = usePanelBg()
  const [activeTab, setActiveTab] = useState<'banners' | 'stats'>('banners')

  if (!user) {
    return (
      <main className={styles.lockedPage} style={{ background: panelBg }}>
        <div className={styles.lockedContent}>
          <div className={styles.lockIconLarge}>
            <svg width="40" height="48" viewBox="0 0 10 12" fill="currentColor">
              <rect x="0.5" y="5" width="9" height="7" rx="1.2" />
              <path d="M2.5 5V3.5a2.5 2.5 0 0 1 5 0V5" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
            </svg>
          </div>
          <h2>ACESSO RESTRITO</h2>
          <p>Você precisa estar logado para ver as criações da comunidade e o ranking global.</p>
          <NavLink to="/login" className={styles.loginLink}>IR PARA O DESERTO (LOGIN)</NavLink>
        </div>
      </main>
    )
  }

  return (
    <motion.main
      style={{ flex: 1, display: 'flex', flexDirection: 'column', background: panelBg, position: 'relative', zIndex: 1, borderRadius: 8, overflow: 'hidden', margin: '0 8px' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'banners' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('banners')}
        >
          WARBANNERS
          {activeTab === 'banners' && <motion.div layoutId="tabUnderline" className={styles.tabIndicator} />}
        </button>
        <button 
          className={`${styles.tabBtn} ${activeTab === 'stats' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          ESTATÍSTICAS DA COMUNIDADE
          {activeTab === 'stats' && <motion.div layoutId="tabUnderline" className={styles.tabIndicator} />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          style={{ flex: 1, overflowY: 'auto' }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'banners' ? <WarbannersTab /> : <CommunityStatsTab />}
        </motion.div>
      </AnimatePresence>
    </motion.main>
  )
}
