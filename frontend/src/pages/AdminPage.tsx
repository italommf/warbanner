import { useState, useMemo, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { applyFilters } from '@/utils/challenges'
import { useBannerStore, type MainFilter, type ArmasFilter } from '@/store/bannerStore'
import { motion, AnimatePresence } from 'framer-motion'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminUsers, useAdminUserDetail, useAdminUserImages, useUpdateAdminUser, useAdminGlobalStats, useAdminChartData, usePatentes, useAdminQueue, useReprocessImage, useAdminUserHistory, useAdminMigrations, useItems, useTickets, useTicketDetail, useReplyTicket, useUpdateTicketStatus, authFetch, type TicketStatus, type Item } from '@/api/hooks'
import type { AdminLog, ItemsResponse } from '@/api/hooks'
import styles from './AdminPage.module.css'
import { useAuthStore } from '@/store/authStore'
import { Navigate, useParams, useNavigate } from 'react-router'
import { Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Filler)

type AdminTab = 'geral' | 'pvp' | 'pve' | 'desafios' | 'imagens' | 'historico' | 'warchaos'

export function AdminPage() {
    const { tab, id, subtab } = useParams()
    const navigate = useNavigate()
    const user = useAuthStore((s) => s.user)
    
    const [search, setSearch] = useState('')
    const [searchType, setSearchType] = useState<'all' | 'nick' | 'username' | 'email'>('all')

    const mainTab = tab || 'dashboard'
    const setMainTab = (newTab: string) => navigate(`/admin/${newTab}`)

    const selectedUserId = (mainTab === 'users' && id) ? id : null
    const setSelectedUserId = (uid: string | null) => {
        if (uid) navigate(`/admin/users/${uid}/${subtab || 'geral'}`)
        else navigate(`/admin/users`)
    }

    const activeTab = (subtab as AdminTab) || 'geral'
    const setActiveTab = (at: AdminTab) => {
        if (selectedUserId) navigate(`/admin/users/${selectedUserId}/${at}`)
    }

    const { data: stats } = useAdminGlobalStats()
    const {
        data: infiniteData,
        isLoading: loadingUsers,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useAdminUsers(search, searchType)

    const allUsers = useMemo(() => {
        return infiniteData?.pages.flatMap(page => page.users) ?? []
    }, [infiniteData])

    // Proteção de rota simplificada
    if (!user || !user.is_staff) {
        return <Navigate to="/" replace />
    }

    if (!tab) {
        return <Navigate to="/admin/dashboard" replace />
    }

    return (
        <div className={styles.container}>

            <div className={styles.gameTabBar}>
                <button
                    className={`${styles.gameTab} ${mainTab === 'dashboard' ? styles.gameTabActive : ''}`}
                    onClick={() => setMainTab('dashboard')}
                >
                    DASHBOARD
                    <div className={`${styles.gameTabUnderline} ${mainTab === 'dashboard' ? styles.gameTabUnderlineActive : ''}`} />
                </button>
                <button
                    className={`${styles.gameTab} ${mainTab === 'users' ? styles.gameTabActive : ''}`}
                    onClick={() => setMainTab('users')}
                >
                    ADMINISTRAÇÃO DE USUÁRIOS
                    <div className={`${styles.gameTabUnderline} ${mainTab === 'users' ? styles.gameTabUnderlineActive : ''}`} />
                </button>
                <button
                    className={`${styles.gameTab} ${mainTab === 'queue' ? styles.gameTabActive : ''}`}
                    onClick={() => setMainTab('queue')}
                >
                    FILA DE PROCESSAMENTO ({stats?.pending ?? 0})
                    <div className={`${styles.gameTabUnderline} ${mainTab === 'queue' ? styles.gameTabUnderlineActive : ''}`} />
                </button>
                <button
                    className={`${styles.gameTab} ${mainTab === 'migrations' ? styles.gameTabActive : ''}`}
                    onClick={() => setMainTab('migrations')}
                >
                    MIGRAÇÕES WARCHAOS
                    <div className={`${styles.gameTabUnderline} ${mainTab === 'migrations' ? styles.gameTabUnderlineActive : ''}`} />
                </button>
                <button
                    className={`${styles.gameTab} ${mainTab === 'support' ? styles.gameTabActive : ''}`}
                    onClick={() => setMainTab('support')}
                >
                    SUPORTE
                    <div className={`${styles.gameTabUnderline} ${mainTab === 'support' ? styles.gameTabUnderlineActive : ''}`} />
                </button>
            </div>

            <div className={`${styles.content} ${(mainTab === 'queue' || mainTab === 'support' || mainTab === 'migrations' || mainTab === 'dashboard') ? styles.contentFull : ''}`}>
                {mainTab === 'dashboard' ? (
                    <>
                    <div className={styles.dashboard}>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{stats?.total_users ?? '...'}</span>
                            <span className={styles.statLabel}>Usuários</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue} style={{ color: 'var(--orange)' }}>{stats?.total_admins ?? '...'}</span>
                            <span className={styles.statLabel}>Admins</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue} style={{ color: 'var(--gold)' }}>{stats?.total_mods ?? '...'}</span>
                            <span className={styles.statLabel}>Moderadores</span>
                        </div>
                        <div className={styles.statCard}>
                            <span className={styles.statValue}>{stats?.total_images ?? '...'}</span>
                            <span className={styles.statLabel}>Total de Imagens</span>
                        </div>
                        <div className={styles.statCard} onClick={() => setMainTab('queue')} style={{ cursor: 'pointer' }}>
                            <span className={styles.statValue} style={{ color: 'var(--gold)' }}>{stats?.pending ?? '...'}</span>
                            <span className={styles.statLabel}>Pendente (Fila)</span>
                        </div>
                        <div className={styles.statCard} onClick={() => setMainTab('queue')} style={{ cursor: 'pointer' }}>
                            <span className={styles.statValue} style={{ color: '#4caf82' }}>{stats?.done ?? '...'}</span>
                            <span className={styles.statLabel}>Sucessos</span>
                        </div>
                        <div className={styles.statCard} onClick={() => setMainTab('queue')} style={{ cursor: 'pointer' }}>
                            <span className={styles.statValue} style={{ color: 'var(--red)' }}>{stats?.failed ?? '...'}</span>
                            <span className={styles.statLabel}>Falhas</span>
                        </div>
                    </div>
                    <DashboardChart />
                    </>
                ) : mainTab === 'users' ? (
                    <>
                        <div className={styles.sidebar}>
                            <div className={styles.searchBox}>
                                <input
                                    className={styles.searchInput}
                                    placeholder="Buscar usuários..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <SearchFilterSelect
                                    value={searchType}
                                    onChange={(val) => setSearchType(val as any)}
                                    options={[
                                        { value: 'all', label: 'Todos' },
                                        { value: 'nick', label: 'Nick' },
                                        { value: 'username', label: 'Usuário' },
                                        { value: 'email', label: 'Email' },
                                    ]}
                                />
                            </div>

                            <div
                                className={styles.userList}
                                onScroll={(e) => {
                                    const el = e.currentTarget
                                    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50 && hasNextPage && !isFetchingNextPage) {
                                        fetchNextPage()
                                    }
                                }}
                            >
                                {loadingUsers ? (
                                    <p className={styles.loadingMsg}>Carregando desertores...</p>
                                ) : (
                                    <>
                                        {allUsers.map((u: any) => (
                                            <div
                                                key={u.id}
                                                className={`${styles.userCard} ${selectedUserId === u.id ? styles.userCardActive : ''}`}
                                                onClick={() => setSelectedUserId(u.id)}
                                            >
                                                <div className={styles.userAvatar}>
                                                    {u.game_nick?.[0] || u.username[0].toUpperCase()}
                                                </div>
                                                <div className={styles.userInfo}>
                                                    <span className={styles.userName}>{u.game_nick || u.username}</span>
                                                    <span className={styles.userEmail}>{u.email}</span>
                                                </div>
                                                {u.role === 'admin' && <span className={styles.staffBadge}>ADMIN</span>}
                                                {u.role === 'moderator' && <span className={styles.staffBadge} style={{ background: 'var(--gold)' }}>MOD</span>}
                                            </div>
                                        ))}
                                        {isFetchingNextPage && <p className={styles.loadingNext}>Carregando mais...</p>}
                                    </>
                                )}
                            </div>
                        </div>

                        <div className={styles.detailsArea}>
                            <AnimatePresence mode="wait">
                                {selectedUserId ? (
                                    <UserEditor
                                        key={selectedUserId}
                                        userId={selectedUserId}
                                        activeTab={activeTab}
                                        setActiveTab={setActiveTab}
                                    />
                                ) : (
                                    <motion.div
                                        className={styles.noUser}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.2">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                            <circle cx="9" cy="7" r="4" />
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                        </svg>
                                        <p>Selecione um usuário para gerenciar</p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </>
                ) : mainTab === 'queue' ? (
                    <QueuePanel />
                ) : mainTab === 'migrations' ? (
                    <MigrationsPanel onSelectUser={(id) => {
                        navigate(`/admin/users/${id}/warchaos`)
                    }} />
                ) : (
                    <SupportPanel />
                )}
            </div>
        </div>
    )
}

const METRIC_OPTIONS = [
    { value: 'uploads', label: 'Uploads por dia' },
    { value: 'users', label: 'Usuários cadastrados por dia' },
    { value: 'tickets', label: 'Tickets abertos por dia' },
]

const PERIOD_OPTIONS = [
    { value: '30', label: 'Últimos 30 dias' },
    { value: '90', label: 'Últimos 90 dias' },
    { value: 'all', label: 'Todos' },
]

function DashboardChart() {
    const [metric, setMetric] = useState('uploads')
    const [period, setPeriod] = useState('30')
    const [metricOpen, setMetricOpen] = useState(false)
    const [periodOpen, setPeriodOpen] = useState(false)
    const { data: chartData, isLoading } = useAdminChartData(metric, period)

    const metricLabel = METRIC_OPTIONS.find(o => o.value === metric)?.label ?? ''
    const periodLabel = PERIOD_OPTIONS.find(o => o.value === period)?.label ?? ''

    const data = {
        labels: chartData?.labels?.map(l => {
            const d = new Date(l + 'T00:00:00')
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        }) ?? [],
        datasets: [{
            data: chartData?.data ?? [],
            borderColor: '#ff9955',
            borderWidth: 1.5,
            pointRadius: 0,
            pointHoverRadius: 4,
            pointHoverBackgroundColor: '#ff9955',
            pointHoverBorderColor: '#fff',
            tension: 0.3,
            fill: false,
        }],
    }

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                titleColor: '#fff',
                bodyColor: '#ff9955',
                borderColor: 'rgba(255,255,255,0.1)',
                borderWidth: 1,
                padding: 10,
                displayColors: false,
                callbacks: {
                    title: (items: any) => items[0]?.label ?? '',
                    label: (item: any) => `${item.raw}`,
                },
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                ticks: {
                    color: 'rgba(255,255,255,0.35)',
                    font: { size: 10, weight: 600 as const },
                    maxTicksLimit: 15,
                },
                border: { display: false },
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(255,255,255,0.04)', drawBorder: false },
                ticks: {
                    color: 'rgba(255,255,255,0.35)',
                    font: { size: 10, weight: 600 as const },
                    precision: 0,
                },
                border: { display: false },
            },
        },
        interaction: {
            intersect: false,
            mode: 'index' as const,
        },
    }

    return (
        <div className={styles.chartContainer}>
            <div className={styles.chartSelectors}>
                <div className={styles.chartDropdownWrapper}>
                    <button
                        className={`${styles.chartDropdownTrigger} ${metricOpen ? styles.chartDropdownTriggerActive : ''}`}
                        onClick={() => { setMetricOpen(!metricOpen); setPeriodOpen(false) }}
                    >
                        {metricLabel}
                        <span className={`${styles.caret} ${metricOpen ? styles.caretOpen : ''}`} />
                    </button>
                    {metricOpen && (
                        <>
                            <div className={styles.chartDropdownBackdrop} onClick={() => setMetricOpen(false)} />
                            <div className={styles.chartDropdownMenu}>
                                {METRIC_OPTIONS.map(o => (
                                    <button
                                        key={o.value}
                                        className={`${styles.chartDropdownItem} ${metric === o.value ? styles.chartDropdownItemActive : ''}`}
                                        onClick={() => { setMetric(o.value); setMetricOpen(false) }}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <div className={styles.chartDropdownWrapper}>
                    <button
                        className={`${styles.chartDropdownTrigger} ${periodOpen ? styles.chartDropdownTriggerActive : ''}`}
                        onClick={() => { setPeriodOpen(!periodOpen); setMetricOpen(false) }}
                    >
                        {periodLabel}
                        <span className={`${styles.caret} ${periodOpen ? styles.caretOpen : ''}`} />
                    </button>
                    {periodOpen && (
                        <>
                            <div className={styles.chartDropdownBackdrop} onClick={() => setPeriodOpen(false)} />
                            <div className={styles.chartDropdownMenu}>
                                {PERIOD_OPTIONS.map(o => (
                                    <button
                                        key={o.value}
                                        className={`${styles.chartDropdownItem} ${period === o.value ? styles.chartDropdownItemActive : ''}`}
                                        onClick={() => { setPeriod(o.value); setPeriodOpen(false) }}
                                    >
                                        {o.label}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className={styles.chartArea}>
                {isLoading ? (
                    <div className={styles.chartLoading}>Carregando dados...</div>
                ) : (chartData?.labels?.length ?? 0) === 0 ? (
                    <div className={styles.chartLoading}>Sem dados para o período selecionado</div>
                ) : (
                    <Line data={data} options={options} />
                )}
            </div>
        </div>
    )
}



const ARMAS_LABELS: Record<ArmasFilter, string> = {
    'todos': 'Todos',
    'low': '< 999',
    '999': '999 / 1.000',
    '2500': '2.500',
    '5000': '5.000',
    '10000': 'Avançado (10.000)',
    'especiais': 'Especiais',
    'crown': 'Crown',
    'dourada': 'Dourada',
}

function getFilterLabel(main: MainFilter, armas: ArmasFilter): string {
    if (main === 'armas') return `Armas — ${ARMAS_LABELS[armas]}`
    if (main !== 'todos') return main.toUpperCase()
    return 'Todos os desafios'
}

function AdminFilterBar({ mainFilter, armasFilter, setMainFilter, setArmasFilter, showWithoutDescription, setShowWithoutDescription, showOnlyEmpty, setShowOnlyEmpty }: {
    mainFilter: MainFilter,
    armasFilter: ArmasFilter,
    setMainFilter: (v: MainFilter) => void,
    setArmasFilter: (v: ArmasFilter) => void,
    showWithoutDescription: boolean,
    setShowWithoutDescription: (v: boolean) => void,
    showOnlyEmpty: boolean,
    setShowOnlyEmpty: (v: boolean) => void
}) {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function onClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        document.addEventListener('mousedown', onClick)
        return () => document.removeEventListener('mousedown', onClick)
    }, [])

    return (
        <div className={styles.filterWrapper} ref={ref}>
            <button className={styles.filterTrigger} onClick={() => setOpen((v) => !v)}>
                <span className={styles.filterTriggerLabel}>Filtro</span>
                <span className={styles.filterTriggerValue}>{getFilterLabel(mainFilter, armasFilter)}</span>
                <motion.span
                    className={styles.filterArrow}
                    animate={{ rotate: open ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >▼</motion.span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className={styles.filterDropdown}
                        initial={{ opacity: 0, y: -6, scaleY: 0.95 }}
                        animate={{ opacity: 1, y: 0, scaleY: 1 }}
                        exit={{ opacity: 0, y: -6, scaleY: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{ transformOrigin: 'top' }}
                    >
                        <div className={styles.filterSection}>
                            <span className={styles.filterSectionLabel}>Categoria</span>
                            <div className={styles.filterChips}>
                                {(['todos', 'armas', 'pvp', 'pve'] as MainFilter[]).map((f) => (
                                    <button
                                        key={f}
                                        className={`${styles.filterChip} ${mainFilter === f ? styles.filterChipActive : ''}`}
                                        onClick={() => setMainFilter(f)}
                                    >
                                        {f === 'todos' ? 'Todos os desafios' : f.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {mainFilter === 'armas' && (
                            <>
                                <div className={styles.filterDivider} />
                                <div className={styles.filterSection}>
                                    <span className={styles.filterSectionLabel}>Eliminações</span>
                                    <div className={styles.filterChips}>
                                        {(['todos', 'low', '999', '2500', '5000', '10000'] as ArmasFilter[]).map((f) => (
                                            <button
                                                key={f}
                                                className={`${styles.filterChip} ${armasFilter === f ? styles.filterChipActive : ''}`}
                                                onClick={() => setArmasFilter(f)}
                                            >
                                                {ARMAS_LABELS[f]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className={styles.filterSection}>
                                    <span className={styles.filterSectionLabel}>Outros</span>
                                    <div className={styles.filterChips}>
                                        {(['especiais', 'crown', 'dourada'] as ArmasFilter[]).map((f) => (
                                            <button
                                                key={f}
                                                className={`${styles.filterChip} ${armasFilter === f ? styles.filterChipActive : ''}`}
                                                onClick={() => setArmasFilter(f)}
                                            >
                                                {ARMAS_LABELS[f]}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className={styles.filterDivider} />
                        <div className={styles.filterSection}>
                            <span className={styles.filterSectionLabel}>Opções</span>
                            <label className={styles.filterOptionLabel}>
                                <input
                                    type="checkbox"
                                    checked={showWithoutDescription && !showOnlyEmpty}
                                    onChange={(e) => {
                                        setShowWithoutDescription(e.target.checked)
                                        if (e.target.checked) setShowOnlyEmpty(false)
                                    }}
                                    className={styles.adminCheckbox}
                                />
                                <span>Todos os desafios</span>
                            </label>
                            <label className={styles.filterOptionLabel} style={{ marginTop: '8px' }}>
                                <input
                                    type="checkbox"
                                    checked={showOnlyEmpty}
                                    onChange={(e) => {
                                        setShowOnlyEmpty(e.target.checked)
                                        if (e.target.checked) setShowWithoutDescription(false)
                                    }}
                                    className={styles.adminCheckbox}
                                />
                                <span>Apenas sem nome/desc</span>
                            </label>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}


function UserEditor({ userId, activeTab, setActiveTab }: { userId: string, activeTab: AdminTab, setActiveTab: (t: AdminTab) => void }) {
    const { data: user, isLoading } = useAdminUserDetail(userId)
    const [imageSearch, setImageSearch] = useState('')
    const { data: images = [] } = useAdminUserImages(userId, imageSearch)
    const { mutate: update, isPending: updating } = useUpdateAdminUser()
    const currentUser = useAuthStore(s => s.user)
    const [formData, setFormData] = useState<any>(null)
    const [saved, setSaved] = useState(false)
    const [modalData, setModalData] = useState<any>(null)
    const [challengeSearch, setChallengeSearch] = useState('')
    const { hideEmpty, setHideEmpty, showOnlyEmpty, setShowOnlyEmpty } = useBannerStore()
    const [mainFilter, setMainFilter] = useState<MainFilter>('todos')
    const [armasFilter, setArmasFilter] = useState<ArmasFilter>('todos')

    const displayedImages = useMemo(() => {
        if (!images) return []
        // O hook useAdminUserImages já lida com o search. 
        // Aqui apenas garantimos a ordem visual: PVP -> PVE -> DESAFIOS
        const pvp = images.filter(img => img.image_type === 'pvp')
        const pve = images.filter(img => img.image_type === 'pve')
        const desafios = images.filter(img => img.image_type === 'desafios')
        return [...pvp, ...pve, ...desafios]
    }, [images])

    const handleNextImage = () => {
        if (!modalData) return
        const idx = displayedImages.findIndex(img => img.id === modalData.id)
        if (idx !== -1 && idx < displayedImages.length - 1) {
            setModalData(displayedImages[idx + 1])
        }
    }

    const handlePrevImage = () => {
        if (!modalData) return
        const idx = displayedImages.findIndex(img => img.id === modalData.id)
        if (idx > 0) {
            setModalData(displayedImages[idx - 1])
        }
    }

    // Admin = role 'admin'. Moderador tem is_staff mas NÃO é admin.
    const isAdmin = currentUser?.role === 'admin'
    const isModerator = currentUser?.role === 'moderator'

    // Admin edita tudo. Moderador só edita usuários comuns.
    const canEdit = isAdmin || (isModerator && user?.role === 'user')

    // Sincroniza form quando user carrega
    useMemo(() => {
        if (user) setFormData(user)
    }, [user])

    if (isLoading || !formData) return <div className={styles.noUser}>Carregando dados...</div>

    const handleChange = (field: string, value: any) => {
        // Campos numéricos vazios → null (não 0)
        if (typeof value === 'number' && isNaN(value)) value = null
        setFormData((prev: any) => ({ ...prev, [field]: value }))
        if (saved) setSaved(false)
    }

    const handleSave = () => {
        update({ id: userId, data: formData }, {
            onSuccess: () => {
                setSaved(true)
                setTimeout(() => setSaved(false), 2500)
            }
        })
    }

    const handleDeleteMigration = () => {
        if (!window.confirm("Deseja realmente REMOVER este usuário da fila de migração? Isso apagará os dados de usuário e nick Warchaos.")) return;
        
        const resetData = {
            warchaos_solicitou: false,
            warchaos_solicitou_at: null,
            warchaos_user: null,
            warchaos_nick: null,
            warchaos_migrado: false
        }
        
        setFormData((prev: any) => ({ ...prev, ...resetData }))
        
        // Salva imediatamente
        update({ id: userId, data: resetData }, {
            onSuccess: () => {
                setSaved(true)
                setTimeout(() => setSaved(false), 2500)
            }
        })
    }



    const handleLocalReset = (type: string) => {
        if (type === 'pvp') {
            setFormData((prev: any) => ({
                ...prev,
                pvp_em: null,
                pvp_win_rate: null,
                pvp_matches: null,
                pvp_hours: null,
                pvp_best_rank_rp: null,
                pvp_best_rank_name: '',
                pvp_classes: [],
                game_nick: '',
                game_rank: '',
                game_rank_idx: 0
            }))
        } else if (type === 'pve') {
            setFormData((prev: any) => ({
                ...prev,
                pve_em: null,
                pve_win_rate: null,
                pve_mission_easy: null,
                pve_mission_medium: null,
                pve_mission_hard: null,
                pve_matches: null,
                pve_hours: null,
                pve_classes: []
            }))
        } else if (type === 'desafios_data') {
            setFormData((prev: any) => ({
                ...prev,
                my_marcas: [],
                my_insignias: [],
                my_fitas: []
            }))
        } else if (type === 'desafios') {
            // Marcamos para deletar imagens no próximo save
            setFormData((prev: any) => ({ ...prev, _reset_desafios: true }))
        }
        if (saved) setSaved(false)
    }

    return (
        <motion.div
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
        >
            <div className={styles.detailsHeader}>
                <div className={styles.detailsTitle}>
                    <h2>{formData.game_nick || formData.username}</h2>
                    <span>ID: {userId} • Membro desde {new Date(formData.date_joined).toLocaleDateString()}</span>
                </div>
                <div className={styles.detailsActions}>
                    {activeTab === 'pvp' && canEdit && (
                        <button className={styles.resetBtn} onClick={() => handleLocalReset('pvp')}>
                            RESETAR PVP
                        </button>
                    )}
                    {activeTab === 'pve' && canEdit && (
                        <button className={styles.resetBtn} onClick={() => handleLocalReset('pve')}>
                            RESETAR PVE
                        </button>
                    )}
                    {activeTab === 'desafios' && canEdit && (
                        <button className={styles.resetBtn} onClick={() => handleLocalReset('desafios_data')}>
                            RESETAR CONQUISTAS
                        </button>
                    )}
                    {activeTab === 'imagens' && canEdit && (
                        <button 
                            className={`${styles.resetBtn} ${formData._reset_desafios ? styles.resetBtnActive : ''}`} 
                            onClick={() => handleLocalReset('desafios')}
                        >
                            {formData._reset_desafios ? '✓ APAGAR AGENDADO' : 'APAGAR IMAGENS'}
                        </button>
                    )}
                    {activeTab === 'warchaos' && canEdit && (formData.warchaos_solicitou || formData.warchaos_migrado) && (
                        <button className={`${styles.resetBtn} ${styles.resetBtnDanger}`} onClick={handleDeleteMigration}>
                            EXCLUIR SOLICITAÇÃO
                        </button>
                    )}
                    
                    {activeTab !== 'historico' && (
                        <button
                            className={`${styles.saveBtn} ${saved ? styles.saveBtnSuccess : ''}`}
                            onClick={handleSave}
                            disabled={updating || !canEdit}
                        >
                            {saved ? '✓ SALVO!' : updating ? 'SALVANDO...' : !canEdit ? 'SOMENTE LEITURA' : 'SALVAR'}
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.subTabBar}>
                <button className={`${styles.subTab} ${activeTab === 'geral' ? styles.subTabActive : ''}`} onClick={() => setActiveTab('geral')}>GERAL (GERAL BANNER)</button>
                <button className={`${styles.subTab} ${activeTab === 'pvp' ? styles.subTabActive : ''}`} onClick={() => setActiveTab('pvp')}>PVP STATS</button>
                <button className={`${styles.subTab} ${activeTab === 'pve' ? styles.subTabActive : ''}`} onClick={() => setActiveTab('pve')}>PVE STATS</button>
                <button className={`${styles.subTab} ${activeTab === 'desafios' ? styles.subTabActive : ''}`} onClick={() => setActiveTab('desafios')}>DESAFIOS</button>
                <button className={`${styles.subTab} ${activeTab === 'imagens' ? styles.subTabActive : ''}`} onClick={() => setActiveTab('imagens')}>IMAGENS ({images.length})</button>
                <button className={`${styles.subTab} ${activeTab === 'warchaos' ? styles.subTabActive : ''}`} onClick={() => setActiveTab('warchaos')}>WARCHAOS</button>
                <button className={`${styles.subTab} ${activeTab === 'historico' ? styles.subTabActive : ''}`} onClick={() => setActiveTab('historico')}>HISTÓRICO</button>
            </div>

            <div className={styles.tabContent}>
                {activeTab === 'geral' && (
                    <div className={styles.formGrid}>
                        <div className={styles.field}>
                            <label>USERNAME</label>
                            <input className={styles.input} value={formData.username} onChange={e => handleChange('username', e.target.value)} />
                        </div>
                        <div className={styles.field}>
                            <label>EMAIL</label>
                            <input className={styles.input} value={formData.email} onChange={e => handleChange('email', e.target.value)} />
                        </div>
                        <div className={styles.field}>
                            <label>NICK NO JOGO</label>
                            <input className={styles.input} value={formData.game_nick} onChange={e => handleChange('game_nick', e.target.value)} />
                        </div>
                        <div className={styles.field}>
                            <label>CLÃ</label>
                            <input className={styles.input} value={formData.game_clan} onChange={e => handleChange('game_clan', e.target.value)} />
                        </div>
                        <div className={styles.field}>
                            <label>PATENTE NO JOGO</label>
                            <RankSelector
                                value={formData.game_rank_idx}
                                onChange={(idx: number, filename: string) => {
                                    setFormData((prev: any) => ({ ...prev, game_rank_idx: idx + 1, game_rank: filename }))
                                }}
                            />
                        </div>
                        <div className={styles.field}>
                            <label>STATUS DA CONTA {!isAdmin && <span title="Apenas administradores podem inativar contas" style={{ cursor: 'help' }}>🔒</span>}</label>
                            <CustomSelect
                                value={formData.is_active ? '1' : '0'}
                                onChange={(val) => handleChange('is_active', val === '1')}
                                options={[
                                    { value: '1', label: 'Ativo' },
                                    { value: '0', label: 'Desativado' }
                                ]}
                                disabled={!isAdmin}
                            />
                        </div>
                        <div className={styles.field}>
                            <label>CARGO / PERMISSÕES {!isAdmin && <span title="Apenas administradores podem alterar cargos" style={{ cursor: 'help' }}>🔒</span>}</label>
                            <CustomSelect
                                value={formData.role}
                                onChange={(val: any) => {
                                    handleChange('role', val)
                                    handleChange('is_staff', val === 'admin' || val === 'moderator')
                                }}
                                options={[
                                    { value: 'user', label: 'Usuário Comum' },
                                    { value: 'moderator', label: 'Moderador' },
                                    { value: 'admin', label: 'Administrador' }
                                ]}
                                disabled={!isAdmin}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'pvp' && (
                    <div className={styles.formGrid}>
                        <div className={styles.field}>
                            <label>E/M TOTAL (PVP)</label>
                            <input type="number" step="0.01" className={styles.input} value={formData.pvp_em ?? ''} placeholder="Vazio" onChange={e => handleChange('pvp_em', parseFloat(e.target.value))} />
                        </div>
                        <div className={styles.field}>
                            <label>VITÓRIAS (%)</label>
                            <input type="number" step="1" className={styles.input} value={formData.pvp_win_rate ?? ''} placeholder="Vazio" onChange={e => handleChange('pvp_win_rate', parseInt(e.target.value))} />
                        </div>
                        <div className={styles.field}>
                            <label>PARTIDAS</label>
                            <input type="number" className={styles.input} value={formData.pvp_matches ?? ''} placeholder="Vazio" onChange={e => handleChange('pvp_matches', parseInt(e.target.value))} />
                        </div>
                        <div className={styles.field}>
                            <label>HORAS</label>
                            <input type="number" className={styles.input} value={formData.pvp_hours ?? ''} placeholder="Vazio" onChange={e => handleChange('pvp_hours', parseInt(e.target.value))} />
                        </div>
                        <div className={styles.field}>
                            <label>MELHOR RANK (RP)</label>
                            <input type="number" className={styles.input} value={formData.pvp_best_rank_rp ?? ''} placeholder="Vazio" onChange={e => handleChange('pvp_best_rank_rp', parseInt(e.target.value))} />
                        </div>
                        <div className={styles.field}>
                            <label>NOME MELHOR RANK</label>
                            <input className={styles.input} value={formData.pvp_best_rank_name ?? ''} placeholder="Vazio" onChange={e => handleChange('pvp_best_rank_name', e.target.value)} />
                        </div>
                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label>CLASSES PVP</label>
                            <ClassesEditor value={formData.pvp_classes ?? []} onChange={v => handleChange('pvp_classes', v)} />
                        </div>
                    </div>
                )}

                {activeTab === 'pve' && (
                    <div className={styles.formGrid}>
                        <div className={styles.field}>
                            <label>E/M TOTAL (PVE)</label>
                            <input type="number" step="0.01" className={styles.input} value={formData.pve_em ?? ''} placeholder="Vazio" onChange={e => handleChange('pve_em', parseFloat(e.target.value))} />
                        </div>
                        <div className={styles.field}>
                            <label>VITÓRIAS (%)</label>
                            <input type="number" step="0.1" className={styles.input} value={formData.pve_win_rate ?? ''} placeholder="Vazio" onChange={e => handleChange('pve_win_rate', parseFloat(e.target.value))} />
                        </div>
                        <div className={styles.field}>
                            <label>MISSÕES FÁCEIS</label>
                            <input type="number" className={styles.input} value={formData.pve_mission_easy ?? ''} placeholder="Vazio" onChange={e => handleChange('pve_mission_easy', parseInt(e.target.value))} />
                        </div>
                        <div className={styles.field}>
                            <label>MISSÕES MÉDIAS</label>
                            <input type="number" className={styles.input} value={formData.pve_mission_medium ?? ''} placeholder="Vazio" onChange={e => handleChange('pve_mission_medium', parseInt(e.target.value))} />
                        </div>
                        <div className={styles.field}>
                            <label>MISSÕES DIFÍCEIS</label>
                            <input type="number" className={styles.input} value={formData.pve_mission_hard ?? ''} placeholder="Vazio" onChange={e => handleChange('pve_mission_hard', parseInt(e.target.value))} />
                        </div>
                        <div className={styles.field}>
                            <label>PARTIDAS PVE</label>
                            <input type="number" className={styles.input} value={formData.pve_matches ?? ''} placeholder="Vazio" onChange={e => handleChange('pve_matches', parseInt(e.target.value))} />
                        </div>
                        <div className={styles.field}>
                            <label>HORAS (PVE)</label>
                            <input type="number" className={styles.input} value={formData.pve_hours ?? ''} placeholder="Vazio" onChange={e => handleChange('pve_hours', parseInt(e.target.value))} />
                        </div>
                        <div className={`${styles.field} ${styles.fullWidth}`}>
                            <label>CLASSES PVE</label>
                            <ClassesEditor value={formData.pve_classes ?? []} onChange={v => handleChange('pve_classes', v)} />
                        </div>
                    </div>
                )}

                {activeTab === 'desafios' && (
                    <div className={styles.challengesTabContent}>
                        <div className={styles.challengesToolbar}>
                            <div className={styles.challengeSearchContainer}>
                                <div className={styles.challengeFilterBox}>
                                    <input
                                        className={styles.challengeFilterInput}
                                        placeholder="Pesquisar desafio por nome ou descrição..."
                                        value={challengeSearch}
                                        onChange={e => setChallengeSearch(e.target.value)}
                                    />
                                    {challengeSearch && (
                                        <button className={styles.clearSearchBtn} onClick={() => setChallengeSearch('')}>✕</button>
                                    )}
                                </div>
                            </div>

                            <AdminFilterBar 
                                mainFilter={mainFilter} 
                                armasFilter={armasFilter} 
                                setMainFilter={setMainFilter} 
                                setArmasFilter={setArmasFilter} 
                                showWithoutDescription={!hideEmpty}
                                setShowWithoutDescription={(v) => setHideEmpty(!v)}
                                showOnlyEmpty={showOnlyEmpty}
                                setShowOnlyEmpty={setShowOnlyEmpty}
                            />


                        </div>

                        <div className={styles.challengeGridsContainer}>
                            <ChallengeCategoryEditor 
                                title="MARCAS" 
                                category="marcas"
                                items={formData.my_marcas ?? []} 
                                onChange={v => handleChange('my_marcas', v)}
                                filterText={challengeSearch}
                                filterHideEmpty={hideEmpty}
                                filterOnlyEmpty={showOnlyEmpty}
                                mainFilter={mainFilter}
                                armasFilter={armasFilter}
                            />
                            <ChallengeCategoryEditor 
                                title="INSÍGNIAS" 
                                category="insignias"
                                items={formData.my_insignias ?? []} 
                                onChange={v => handleChange('my_insignias', v)}
                                filterText={challengeSearch}
                                filterHideEmpty={hideEmpty}
                                filterOnlyEmpty={showOnlyEmpty}
                                mainFilter={mainFilter}
                                armasFilter={armasFilter}
                            />
                            <ChallengeCategoryEditor 
                                title="FITAS" 
                                category="fitas"
                                items={formData.my_fitas ?? []} 
                                onChange={v => handleChange('my_fitas', v)}
                                filterText={challengeSearch}
                                filterHideEmpty={hideEmpty}
                                filterOnlyEmpty={showOnlyEmpty}
                                mainFilter={mainFilter}
                                armasFilter={armasFilter}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'imagens' && (
                    <div className={styles.imageTabContent}>
                        <div className={styles.imageSearchBox}>
                            <input 
                                className={styles.imageSearchInput}
                                placeholder="🔍 Buscar por nome do desafio ou texto do OCR (ex: 'Elite', 'Vetor'...)"
                                value={imageSearch}
                                onChange={e => setImageSearch(e.target.value)}
                            />
                            {imageSearch && (
                                <button className={styles.clearSearchBtn} onClick={() => setImageSearch('')}>✕</button>
                            )}
                        </div>
                        <div className={styles.imageGridScroll}>
                            <div className={styles.imageTabs}>
                                <div className={styles.statsImagesRow}>
                                    <div className={styles.imageSection}>
                                        <h3 className={styles.sectionTitle}>PVP</h3>
                                        <div className={styles.imageGridMini}>
                                            {images.filter(img => img.image_type === 'pvp').length > 0 ? (
                                                images.filter(img => img.image_type === 'pvp').map(img => (
                                                    <ImageCard 
                                                        key={img.id} 
                                                        img={img} 
                                                        active={modalData?.id === img.id}
                                                        onClick={() => setModalData(img)} 
                                                    />
                                                ))
                                            ) : (
                                                <p className={styles.noImagesSmall}>Nenhum upload de PvP</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className={styles.imageSection}>
                                        <h3 className={styles.sectionTitle}>PVE</h3>
                                        <div className={styles.imageGridMini}>
                                            {images.filter(img => img.image_type === 'pve').length > 0 ? (
                                                images.filter(img => img.image_type === 'pve').map(img => (
                                                    <ImageCard 
                                                        key={img.id} 
                                                        img={img} 
                                                        active={modalData?.id === img.id}
                                                        onClick={() => setModalData(img)} 
                                                    />
                                                ))
                                            ) : (
                                                <p className={styles.noImagesSmall}>Nenhum upload de PvE</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.imageSection}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h3 className={styles.sectionTitle} style={{ margin: 0 }}>CONQUISTAS</h3>
                                    </div>
                                    <div className={styles.imageGrid}>
                                        {images.filter(img => img.image_type === 'desafios').length > 0 ? (
                                            images.filter(img => img.image_type === 'desafios').map(img => (
                                                <ImageCard 
                                                    key={img.id} 
                                                    img={img} 
                                                    active={modalData?.id === img.id}
                                                    onClick={() => setModalData(img)} 
                                                />
                                            ))
                                        ) : (
                                            <p className={styles.noImagesSmall}>Nenhum upload de conquistas</p>
                                        )}
                                    </div>
                                </div>

                                {images.length === 0 && (
                                    <p className={styles.noUser}>Usuário ainda não enviou capturas para processamento.</p>
                                )}
                            </div>
                        </div>

                    </div>
                )}

                {modalData && (
                    <OCRModal 
                        img={modalData} 
                        onClose={() => setModalData(null)} 
                        onNext={displayedImages.findIndex(i => i.id === modalData.id) < displayedImages.length - 1 ? handleNextImage : undefined}
                        onPrev={displayedImages.findIndex(i => i.id === modalData.id) > 0 ? handlePrevImage : undefined}
                        onUpdate={setModalData}
                    />
                )}

                {activeTab === 'warchaos' && (
                    <div className={styles.formGrid}>
                        <div className={styles.field}>
                            <label>SOLICITOU MIGRAÇÃO</label>
                            <CustomSelect
                                value={formData.warchaos_solicitou ? '1' : '0'}
                                onChange={(val) => handleChange('warchaos_solicitou', val === '1')}
                                options={[
                                    { value: '1', label: 'Sim' },
                                    { value: '0', label: 'Não' }
                                ]}
                            />
                        </div>
                        <div className={styles.field}>
                            <label>DATA DA SOLICITAÇÃO</label>
                            <input 
                                className={styles.input} 
                                value={formData.warchaos_solicitou_at ? new Date(formData.warchaos_solicitou_at).toLocaleString('pt-BR') : 'Não solicitado'} 
                                readOnly 
                            />
                        </div>
                        <div className={styles.field}>
                            <label>USUÁRIO WARCHAOS</label>
                            <input 
                                className={styles.input} 
                                value={formData.warchaos_user ?? ''} 
                                onChange={e => handleChange('warchaos_user', e.target.value)} 
                                placeholder="vazio"
                            />
                        </div>
                        <div className={styles.field}>
                            <label>NICK WARCHAOS</label>
                            <input 
                                className={styles.input} 
                                value={formData.warchaos_nick ?? ''} 
                                onChange={e => handleChange('warchaos_nick', e.target.value)} 
                                placeholder="vazio"
                            />
                        </div>
                        <div className={styles.field}>
                            <label>MIGRADO PARA WARCHAOS</label>
                            <CustomSelect
                                value={formData.warchaos_migrado ? '1' : '0'}
                                onChange={(val) => handleChange('warchaos_migrado', val === '1')}
                                options={[
                                    { value: '1', label: 'Sim (Concluído)' },
                                    { value: '0', label: 'Não' }
                                ]}
                            />
                        </div>
                    </div>
                )}

                {activeTab === 'historico' && <HistoryTab userId={userId} />}
            </div>
        </motion.div>
    )
}

function HistoryTab({ userId }: { userId: string }) {
    const { data: logs = [], isLoading } = useAdminUserHistory(userId)

    if (isLoading) return <div className={styles.noUser}>Carregando histórico...</div>

    return (
        <div className={styles.historyContainer}>
            {logs.length === 0 ? (
                <p className={styles.noUser}>Nenhuma alteração registrada para este usuário.</p>
            ) : (
                <table className={styles.historyTable}>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Modificado por</th>
                            <th>Dado</th>
                            <th>Valor Anterior</th>
                            <th>Novo Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log: AdminLog) => (
                            <tr key={log.id}>
                                <td>{new Date(log.created_at).toLocaleString('pt-BR')}</td>
                                <td><strong>{log.actor}</strong></td>
                                <td>{log.field_name}</td>
                                <td className={styles.historyOld}>{log.old_value}</td>
                                <td className={styles.historyNew}>{log.new_value}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )
}

interface ClassEntry { name: string; color: string; em: number; winRate: number; hours: number }

const DEFAULT_CLASSES: ClassEntry[] = [
    { name: 'Fuzileiro', color: '#4a90e2', em: 0, winRate: 0, hours: 0 },
    { name: 'Médico', color: '#50e3c2', em: 0, winRate: 0, hours: 0 },
    { name: 'Engenheiro', color: '#f5a623', em: 0, winRate: 0, hours: 0 },
    { name: 'Franco-atirador', color: '#d0021b', em: 0, winRate: 0, hours: 0 },
]

function ClassesEditor({ value, onChange }: { value: ClassEntry[]; onChange: (v: ClassEntry[]) => void }) {
    // Merge: usa dados existentes ou fallback para DEFAULT_CLASSES com zeros
    const merged = DEFAULT_CLASSES.map(def => {
        const existing = value.find(c => c.name === def.name)
        return existing ? { ...def, em: existing.em ?? 0, winRate: existing.winRate ?? 0, hours: existing.hours ?? 0 } : def
    })

    const updateField = (idx: number, field: keyof ClassEntry, val: any) => {
        const updated = [...merged]
        updated[idx] = { ...updated[idx], [field]: typeof val === 'number' && isNaN(val) ? 0 : val }
        onChange(updated)
    }

    return (
        <div className={styles.classesEditor}>
            <table className={styles.classesTable}>
                <thead>
                    <tr>
                        <th>CLASSE</th>
                        <th>E/M</th>
                        <th>WIN RATE</th>
                        <th>HORAS</th>
                    </tr>
                </thead>
                <tbody>
                    {merged.map((cls, i) => (
                        <tr key={i}>
                            <td>
                                <div className={styles.colorCell}>
                                    <span className={styles.classDot} style={{ background: cls.color }} />
                                    <span style={{ color: cls.color, fontWeight: 600 }}>{cls.name}</span>
                                </div>
                            </td>
                            <td><input type="number" step="0.01" className={styles.classInput} value={cls.em} onChange={e => updateField(i, 'em', parseFloat(e.target.value))} /></td>
                            <td><input type="number" step="0.1" className={styles.classInput} value={cls.winRate} onChange={e => updateField(i, 'winRate', parseFloat(e.target.value))} /></td>
                            <td><input type="number" className={styles.classInput} value={cls.hours} onChange={e => updateField(i, 'hours', parseInt(e.target.value))} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

function InlineCorrectionSelector({ 
    initialCategory, 
    rawText, 
    currentName,
    imageId, 
    onClose, 
    onSuccess,
    slot
}: { 
    initialCategory: string, 
    rawText: string, 
    currentName: string,
    imageId: number, 
    onClose: () => void, 
    onSuccess: (newImage: any) => void,
    slot: number
}) {
    const { data: allItems } = useItems();
    const [category, setCategory] = useState<keyof ItemsResponse>(
        (initialCategory === 'marcas' || initialCategory === 'insignias' || initialCategory === 'fitas') 
        ? initialCategory as keyof ItemsResponse 
        : 'marcas'
    );
    const [search, setSearch] = useState('');
    const [visibleCount, setVisibleCount] = useState(20);
    const observerTarget = useRef<HTMLDivElement>(null);
    
    // Filtro global
    const filteredItems = useMemo(() => {
        if (!allItems) return [];
        const catItems = allItems[category] || [];
        
        if (!search) return catItems;
        const s = search.toLowerCase();
        return catItems.filter((i: any) => 
            i.name.toLowerCase().includes(s) || 
            (i.description && i.description.toLowerCase().includes(s)) ||
            i.filename.toLowerCase().includes(s)
        );
    }, [allItems, category, search]);

    // Paginação frontend
    const items = useMemo(() => filteredItems.slice(0, visibleCount), [filteredItems, visibleCount]);
    const hasMore = filteredItems.length > visibleCount;

    // Infinite Scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore) {
                    setVisibleCount(prev => prev + 40);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [hasMore]);

    const handleCorrect = async (itemOrId: any | string) => {
        try {
            const isManualSelect = typeof itemOrId === 'string';
            const correct_item_id = isManualSelect ? itemOrId : itemOrId.filename;

            const res = await authFetch('/api/admin/ocr/correct/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_id: imageId,
                    raw_text: rawText,
                    correct_item_id: correct_item_id,
                    category: category
                })
            });
            const data = await res.json();
            if (data.success) {
                onSuccess(data.image);
                onClose();
            } else {
                alert(data.error || 'Erro ao corrigir');
            }
        } catch (e) {
            alert('Erro de conexão');
        }
    };

    return (
        <div className={styles.fullCorrectionView} onClick={e => e.stopPropagation()}>
            <div className={styles.correctionHeaderRow}>
                <button className={styles.backBtnInline} onClick={onClose}>
                    <span className={styles.backIcon}>←</span> Voltar
                </button>
                <button 
                    className={styles.notUnlockedActionBtn}
                    onClick={() => handleCorrect('not_unlocked')}
                >
                    Marcar como Não Desbloqueado
                </button>
            </div>
            
            <div className={styles.correctionInfoGrid}>
                <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Slot</span>
                    <strong className={styles.infoValue}>L{((slot-1)%4)+1} C{Math.floor((slot-1)/4)+1}</strong>
                </div>
                <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Leitura OCR</span>
                    <strong className={`${styles.infoValue} ${styles.ocrWarning}`}>"{rawText || 'vazio'}"</strong>
                </div>
                <div className={styles.infoBlock}>
                    <span className={styles.infoLabel}>Atribuído</span>
                    <strong className={`${styles.infoValue} ${currentName === 'Não encontrado' ? styles.missingVal : ''}`}>
                        {currentName}
                    </strong>
                </div>
            </div>

            <div className={styles.correctionControls}>
                <div className={styles.categoryToggle}>
                    {(['marcas', 'insignias', 'fitas'] as const).map(cat => (
                        <button 
                            key={cat}
                            className={`${styles.catBtn} ${category === cat ? styles.active : ''}`}
                            onClick={() => {
                                setCategory(cat);
                                setVisibleCount(20);
                            }}
                        >
                            {cat.charAt(0).toUpperCase() + cat.slice(1, -1)}
                        </button>
                    ))}
                </div>
                <input 
                    className={styles.inlineSearch} 
                    placeholder="Pesquisar desafio globalmente..." 
                    value={search}
                    onChange={e => {
                        setSearch(e.target.value);
                        setVisibleCount(20);
                    }}
                    autoFocus
                />
            </div>
            
            <div className={styles.inlineGridList}>
                {items.map((item: any) => (
                    <div 
                        key={item.filename} 
                        className={styles.gridListItem} 
                        onClick={() => handleCorrect(item)}
                    >
                        <div className={styles.gridItemIcon}>
                            <img src={item.url} alt="" />
                        </div>
                        <div className={styles.gridItemDetails}>
                            <span className={styles.gridItemName}>{item.name}</span>
                            <span className={styles.gridItemFilename}>{item.filename}</span>
                        </div>
                    </div>
                ))}
                {hasMore && (
                    <div ref={observerTarget} style={{ height: '40px', margin: '20px 0', background: 'transparent' }} />
                )}
            </div>

            {filteredItems.length === 0 && (
                <div className={styles.noResultsSmall}>Nenhum desafio encontrado para "{search}"</div>
            )}
        </div>
    );
}

function ImageCard({ img, active, onClick }: { img: any, active?: boolean, onClick?: () => void }) {
    const result = img.result;
    
    // Detectar falhas ou necessidades de revisão para as tags rápidas no grid
    const failedItems = result?.detected_achievements?.filter((a: any) => a.match_type === 'failed') || [];
    const reportFails = result?.ocr_report?.filter((r: any) => r.match_type === 'failed') || [];
    const failCount = failedItems.length + reportFails.length;
    
    const hasFail = img.status === 'failed' || failCount > 0;
    
    const needsReview = result?.detected_achievements?.some((a: any) => 
        !['exact', 'not_unlocked'].includes(a.match_type) && 
        (a.match_type === 'similarity' || a.match_type === 'failed')
    ) || result?.ocr_report?.some((r: any) => 
        !['exact', 'not_unlocked'].includes(r.match_type) && 
        (r.match_type === 'similarity' || r.match_type === 'failed')
    );

    const notUnlockedItems = result?.detected_achievements?.filter((a: any) => a.match_type === 'not_unlocked') || [];
    const unlockedCount = notUnlockedItems.length;

    return (
        <div 
            className={`${styles.imgCard} ${active ? styles.imgCardActive : ''}`}
            onClick={onClick}
            style={{ cursor: onClick ? 'pointer' : 'default' }}
        >
            <div className={styles.thumbBox}>
                <img src={img.image} alt={`Upload ${img.id}`} />
                
                {hasFail && <span className={styles.cardFailBadge}>{failCount > 0 ? failCount : '!'}</span>}
                {unlockedCount > 0 && <span className={styles.cardUnlockedBadge}>{unlockedCount}</span>}
                {!hasFail && needsReview && <span className={styles.cardReviewBadge}>Revisar</span>}
            </div>
            <div className={styles.imgInfo}>
                <div className={styles.imgDate}>
                    {new Date(img.created_at).toLocaleDateString('pt-BR')} às {new Date(img.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className={`${styles.imgStatus} ${styles['status-' + img.status]}`}>
                    {img.status === 'failed' ? 'Falhou' : img.status}
                </div>
            </div>
        </div>
    )
}

function OCRDetails({ result, imageId, onUpdate }: { result: any, imageId: number, onUpdate?: (img: any) => void }) {
    if (!result) return <p className={styles.noImagesSmall}>Sem resultados de OCR.</p>
    
    const queryClient = useQueryClient();
    const [correctingIndex, setCorrectingIndex] = useState<number | null>(null);

    const handleCorrectionSuccess = (newImage: any) => {
        // Invalida as queries do usuário para garantir que o cache traga os dados novos e as tags sumam
        queryClient.invalidateQueries({ queryKey: ['admin-user-images', String(newImage.user)] });
        queryClient.invalidateQueries({ queryKey: ['admin-user-detail', String(newImage.user)] });
        
        // Atualiza os dados da imagem sendo exibida no modal
        if (onUpdate) onUpdate(newImage);
        
        setCorrectingIndex(null);
    };

    return (
        <div className={styles.ocrBody}>
            {/* PvP Stats */}
            {result.pvp_stats && (
                <div className={styles.ocrSection}>
                    <span className={styles.ocrSectionTitle}>Status PvP</span>
                    <div className={styles.ocrDataGrid}>
                        <div className={styles.ocrDataItem}>
                            <span className={styles.ocrDataLabel}>E/M</span>
                            <span className={styles.ocrDataValue}>{result.pvp_stats.kd_ratio ?? '---'}</span>
                        </div>
                        <div className={styles.ocrDataItem}>
                            <span className={styles.ocrDataLabel}>VITÓRIAS</span>
                            <span className={styles.ocrDataValue}>{result.pvp_stats.win_rate ?? '---'}%</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Relatório Detalhado de OCR Campo a Campo */}
            {result.ocr_report && result.ocr_report.length > 0 && (
                <div className={styles.ocrSection}>
                    <span className={styles.ocrSectionTitle}>Processamento por ROI</span>
                    <div className={styles.ocrDetailsList}>
                        {result.ocr_report.map((item: any, idx: number) => {
                            const isV2 = item.raw_ocr !== undefined;
                            // Se for match exato ou "não desbloqueado", não precisa de revisão
                            const needsReview = isV2 && !['exact', 'not_unlocked'].includes(item.match_type) && 
                                (item.match_type === 'failed' || item.match_type === 'similarity' || item.raw_ocr !== String(item.assigned_value));
                            
                            return (
                                <div key={idx} className={styles.ocrTableRow}>
                                    <div className={styles.slotIndicator} style={{ backgroundColor: item.color || 'var(--orange)' }} />
                                    <div className={styles.ocrFieldInfo}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span className={styles.fieldName}>{item.name}</span>
                                        </div>
                                        <div className={styles.fieldValues}>
                                            {isV2 && (
                                                <div className={styles.fieldRow}>
                                                    <span className={styles.rowLabel}>OCR:</span>
                                                    <span className={styles.rawVal}>{item.raw_ocr || '---'}</span>
                                                </div>
                                            )}
                                            <div className={styles.fieldRow}>
                                                <span className={styles.rowLabel}>{isV2 ? 'Final:' : 'Valor:'}</span>
                                                <span className={styles.finalVal}>{item.assigned_value}</span>
                                                <div className={styles.fieldBadges}>
                                                    {isV2 && needsReview && <span className={styles.warningBadge}>Revisar</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Conquistas (v2 com Metadados e Cores) */}
            {result.detected_achievements && result.detected_achievements.length > 0 && (
                <div className={styles.ocrSection}>
                    <div className={styles.ocrSectionHeader}>
                        <span className={styles.ocrSectionTitle}>Desafios Detectados</span>
                        {correctingIndex !== null && (
                             <button className={styles.miniBackBtn} onClick={() => setCorrectingIndex(null)}>Voltar à lista</button>
                        )}
                    </div>

                    <div className={styles.ocrResultsContainer}>
                        <AnimatePresence mode="wait">
                            {correctingIndex === null ? (
                                <motion.div 
                                    key="list"
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    className={styles.ocrAchievements}
                                >
                                    {result.detected_achievements.map((ach: any, idx: number) => {
                                        const isV2 = ach.match_type !== undefined;
                                        const isFailed = isV2 && ach.match_type === 'failed';
                                        // Se for match exato ou "não desbloqueado", não precisa de revisão
                                        const needsReview = isV2 && !['exact', 'not_unlocked'].includes(ach.match_type) && (isFailed || ach.match_type === 'similarity' || ach.raw_ocr !== ach.name);
                                        
                                        return (
                                            <div 
                                                key={idx} 
                                                className={`${styles.ocrTableRow} ${needsReview ? styles.clickableFailCard : ''}`}
                                                onClick={() => {
                                                    if (needsReview) {
                                                        setCorrectingIndex(idx);
                                                    }
                                                }}
                                            >
                                                <div className={styles.slotIndicator} style={{ backgroundColor: ach.color || '#333' }} />
                                                <div className={styles.ocrFieldInfo}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span className={styles.fieldName}>L{((ach.slot-1)%4)+1} C{Math.floor((ach.slot-1)/4)+1}</span>
                                                    </div>
                                                    
                                                    <div className={styles.fieldValues}>
                                                        {isV2 && (
                                                            <div className={styles.fieldRow}>
                                                                <span className={styles.rowLabel}>OCR:</span>
                                                                <span className={styles.rawVal}>{ach.raw_ocr || 'vazio'}</span>
                                                            </div>
                                                        )}
                                                        <div className={styles.fieldRow}>
                                                            <span className={styles.rowLabel}>{isV2 ? 'Atrib:' : 'Desafio:'}</span>
                                                            <span className={styles.finalVal}>{ach.name}</span>
                                                            <div className={styles.fieldBadges}>
                                                                {isV2 && needsReview && <span className={styles.warningBadge}>Revisar</span>}
                                                                {isV2 && (
                                                                    <span className={`${styles.matchBadge} ${styles['match' + (ach.match_type === 'exact' ? 'Exact' : ach.match_type === 'similarity' ? 'Sim' : ach.match_type === 'not_unlocked' ? 'NotUnlocked' : 'Fail')]}`}>
                                                                        {ach.match_type === 'exact' ? 'Match Exato' : ach.match_type === 'similarity' ? 'Similaridade' : ach.match_type === 'not_unlocked' ? 'Não desbloqueado' : 'Não encontrado'}
                                                                    </span>
                                                                )}
                                                                {isV2 && ach.similarity && ach.similarity < 1 && (
                                                                    <span className={styles.similarityBadge}>
                                                                        {(ach.similarity * 100).toFixed(0)}% Match
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </motion.div>
                            ) : (
                                <motion.div 
                                    key="correction"
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -10 }}
                                    className={styles.correctionFullViewWrapper}
                                >
                                    <InlineCorrectionSelector 
                                        initialCategory={result.detected_achievements[correctingIndex].category}
                                        rawText={result.detected_achievements[correctingIndex].raw_ocr}
                                        currentName={result.detected_achievements[correctingIndex].name}
                                        slot={result.detected_achievements[correctingIndex].slot}
                                        imageId={imageId}
                                        onClose={() => setCorrectingIndex(null)}
                                        onSuccess={handleCorrectionSuccess}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            )}

            {result.error && (
                <div className={styles.ocrSection}>
                    <span className={styles.ocrSectionTitle} style={{ color: 'var(--red)' }}>ERRO OCR</span>
                    <p style={{ fontSize: '0.8rem', color: '#ff4757', background: 'rgba(255, 71, 87, 0.1)', padding: '8px', borderRadius: '4px' }}>
                        {result.error}
                    </p>
                </div>
            )}
        </div>
    )
}

function OCRModal({ img, onClose, onPrev, onNext, onUpdate }: { img: any, onClose: () => void, onPrev?: () => void, onNext?: () => void, onUpdate?: (img: any) => void }) {
    const result = img.result
    const report = result?.ocr_report || result?.detected_achievements || result?.roi_report || []
    const imgW = result?.image_width || 3840
    const imgH = result?.image_height || 2160

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') onPrev?.()
            if (e.key === 'ArrowRight') onNext?.()
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [onPrev, onNext, onClose])

    // Se existir a imagem de debug (com ROI desenhado no backend), usamos ela.
    const displayImage = img.debug_image || img.image;
    const hasDebug = !!img.debug_image;

    return createPortal(
        <div className={styles.ocrModalOverlay} onClick={onClose}>
            <div className={styles.ocrModalContent} onClick={e => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={onClose}>✕</button>
                
                <div className={styles.modalNavigation}>
                    <button className={styles.navBtn} onClick={onPrev} disabled={!onPrev}>‹</button>
                    <button className={styles.navBtn} onClick={onNext} disabled={!onNext}>›</button>
                </div>

                <div className={styles.modalImageArea}>
                    <img src={displayImage} alt="Diagnóstico de Extração" />
                    
                    {/* Só pintamos o ROI via CSS se NÃO tivermos a imagem de debug pronta (fallback para legado) */}
                    {!hasDebug && (
                        <div className={styles.roiOverlay}>
                            {report.map((item: any, idx: number) => {
                                if (!item.roi) return null
                                const x = (item.roi.x / imgW) * 100
                                const y = (item.roi.y / imgH) * 100
                                const w = (item.roi.w / imgW) * 100
                                const h = (item.roi.h / imgH) * 100
                                
                                return (
                                    <div 
                                        key={idx}
                                        className={styles.roiBox}
                                        style={{
                                            left: `${x}%`,
                                            top: `${y}%`,
                                            width: `${w}%`,
                                            height: `${h}%`,
                                            borderColor: item.color || (item.match_type === 'failed' ? 'var(--red)' : 'var(--orange)')
                                        }}
                                        title={`${item.name || 'Slot ' + item.slot}: ${item.raw_ocr}`}
                                    />
                                )
                            })}
                        </div>
                    )}
                </div>

                <div className={styles.modalSidebar}>
                    <div className={styles.sidebarHeader}>
                        <h2>Diagnóstico de Extração</h2>
                        <span className={styles.userEmail}>Imagem ID: {img.id}</span>
                    </div>
                    <div className={styles.sidebarBody}>
                        <OCRDetails result={img.result} imageId={img.id} onUpdate={onUpdate} />
                    </div>
                </div>
            </div>
        </div>,
        document.body
    )
}

function RankSelector({ value, onChange }: { value: number, onChange: (idx: number, filename: string) => void }) {
    const patentes = usePatentes()
    const [open, setOpen] = useState(false)
    const current = patentes.find((_, idx) => idx === (value - 1))

    return (
        <div className={styles.rankSelector}>
            <button className={styles.rankTrigger} onClick={() => setOpen(!open)} type="button">
                {current ? (
                    <>
                        <img src={current.url} alt={current.name} />
                        <span>{current.name}</span>
                    </>
                ) : (
                    <span>Selecione a patente...</span>
                )}
                <span className={`${styles.caret} ${open ? styles.caretOpen : ''}`}></span>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        className={styles.rankDropdown}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                    >
                        {patentes.map((p, idx) => (
                            <button
                                key={p.filename}
                                className={`${styles.rankItem} ${value === (idx + 1) ? styles.rankItemActive : ''}`}
                                onClick={() => {
                                    onChange(idx, p.filename);
                                    setOpen(false);
                                }}
                                title={p.name}
                                type="button"
                            >
                                <img src={p.url} alt={p.name} />
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function SearchFilterSelect({ value, onChange, options }: { value: string, onChange: (v: string) => void, options: { value: string, label: string }[] }) {
    const [open, setOpen] = useState(false)
    const current = options.find(o => o.value === value)

    return (
        <div className={styles.searchFilterSelectWrapper}>
            <button className={styles.searchFilterTrigger} onClick={() => setOpen(!open)} type="button">
                <span>{current?.label}</span>
                <span className={`${styles.caret} ${open ? styles.caretOpen : ''}`}></span>
            </button>
            <AnimatePresence>
                {open && (
                    <>
                        <div className={styles.searchFilterBackdrop} onClick={() => setOpen(false)} />
                        <motion.div
                            className={styles.searchFilterDropdown}
                            initial={{ opacity: 0, y: -10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -10, scale: 0.95 }}
                            transition={{ duration: 0.1 }}
                        >
                            {options.map(opt => (
                                <button
                                    key={opt.value}
                                    className={`${styles.searchFilterItem} ${value === opt.value ? styles.searchFilterItemActive : ''}`}
                                    onClick={() => {
                                        onChange(opt.value);
                                        setOpen(false);
                                    }}
                                    type="button"
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}

function CustomSelect({ value, onChange, options, className, disabled }: { value: string, onChange: (v: string) => void, options: { value: string, label: string }[], className?: string, disabled?: boolean }) {
    const [open, setOpen] = useState(false)
    const current = options.find(o => o.value === value)

    return (
        <div className={`${styles.customSelect} ${className || ''}`} style={disabled ? { opacity: 0.6, pointerEvents: 'none' } : {}}>
            <button className={styles.selectTrigger} onClick={() => setOpen(!open)} type="button" disabled={disabled}>
                <span>{current?.label}</span>
                <span className={`${styles.caret} ${open ? styles.caretOpen : ''}`}></span>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div
                        className={styles.selectDropdown}
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.1 }}
                    >
                        {options.map(opt => (
                            <button
                                key={opt.value}
                                className={`${styles.selectItem} ${value === opt.value ? styles.selectItemActive : ''}`}
                                onClick={() => {
                                    onChange(opt.value);
                                    setOpen(false);
                                }}
                                type="button"
                            >
                                {opt.label}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}


function ChallengeCategoryEditor({ 
    title, 
    category, 
    items, 
    onChange, 
    filterText = '', 
    filterHideEmpty = false,
    filterOnlyEmpty = false,
    mainFilter = 'todos',
    armasFilter = 'todos'
}: { 
    title: string, 
    category: string, 
    items: string[], 
    onChange: (v: string[]) => void, 
    filterText?: string, 
    filterHideEmpty?: boolean,
    filterOnlyEmpty?: boolean,
    mainFilter?: MainFilter,
    armasFilter?: ArmasFilter
}) {
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [hideEmpty, setHideEmpty] = useState(true)
    
    // Hooks de itens existentes (marcas, insignias, fitas)
    const allItems = useItems().data?.[category as keyof ItemsResponse] ?? []
    
    const filteredSearch = allItems.filter(item => {
        const matchesText = item.name.toLowerCase().includes(search.toLowerCase()) || 
                           item.filename.toLowerCase().includes(search.toLowerCase())
        
        if (!matchesText) return false
        
        if (hideEmpty) {
            return !!item.description && item.description !== 'Sem descrição.'
        }
        
        return true
    }).slice(0, 50) // Limita resultados para performance

    const handleRemove = (filename: string) => {
        onChange(items.filter(id => id !== filename))
    }

    const handleAdd = (filename: string) => {
        if (!items.includes(filename)) {
            onChange([...items, filename])
        }
        setIsModalOpen(false)
        setSearch('')
    }

    const currentItemsData = useMemo(() => {
        const baseItems = items.map(filename => {
            const data = allItems.find(i => i.filename === filename)
            return data || { name: filename, filename, url: '', description: '', color: 'outro' }
        }) as Item[]
        
        return applyFilters(
            baseItems,
            category as 'marcas' | 'insignias' | 'fitas',
            mainFilter,
            armasFilter,
            'todos',
            filterText,
            filterHideEmpty,
            filterOnlyEmpty
        )
    }, [items, allItems, category, mainFilter, armasFilter, filterText, filterHideEmpty, filterOnlyEmpty])

    const isFita = category === 'fitas'

    return (
        <div className={styles.challengeCategory}>
            <h3 className={styles.sectionTitle}>{title} ({items.length})</h3>
            
            <div className={`${styles.challengeGrid} ${isFita ? styles.challengeGridFitas : ''}`}>
                <button 
                    className={`${styles.addChallengeBtn} ${isFita ? styles.addChallengeBtnFita : ''}`} 
                    onClick={() => setIsModalOpen(true)}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    <span>ADICIONAR</span>
                </button>

                {currentItemsData.map(item => (
                    <div 
                        key={item.filename} 
                        className={`${styles.challengeItem} ${isFita ? styles.challengeItemFita : ''}`} 
                        title={item.name}
                    >
                        <img 
                            src={item.url || `/media/desafios/${category}/${item.filename}`} 
                            alt={item.name} 
                            className={`${styles.challengeIcon} ${isFita ? styles.challengeIconFita : ''}`} 
                        />
                        <span className={styles.challengeName}>{item.name}</span>
                        <button 
                            className={styles.removeChallengeBtn}
                            onClick={() => handleRemove(item.filename)}
                            title="Remover conquista"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>

            <AnimatePresence>
                {isModalOpen && (
                    <div className={styles.challengeSearchModal}>
                        <motion.div 
                            className={styles.modalContent}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                        >
                            <div className={styles.modalHeader}>
                                <h3>Adicionar {title.toLowerCase()}</h3>
                                <button className={styles.closeModalBtn} onClick={() => setIsModalOpen(false)}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <line x1="18" y1="6" x2="6" y2="18" />
                                        <line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                            
                            <div className={styles.modalSearch}>
                                <input 
                                    autoFocus
                                    placeholder={`Pesquisar ${title.toLowerCase()}...`}
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                                <label className={styles.modalCheckboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={hideEmpty}
                                        onChange={(e) => setHideEmpty(e.target.checked)}
                                    />
                                    <span>Ocultar sem descrição</span>
                                </label>
                            </div>

                            <div className={styles.modalBody}>
                                <div className={styles.searchGrid}>
                                    {filteredSearch.map(item => {
                                        const alreadyHas = items.includes(item.filename)
                                        return (
                                            <div 
                                                key={item.filename} 
                                                className={`${styles.searchItem} ${alreadyHas ? styles.searchItemDisabled : ''}`}
                                                onClick={() => !alreadyHas && handleAdd(item.filename)}
                                                style={alreadyHas ? { opacity: 0.4, cursor: 'not-allowed' } : {}}
                                            >
                                                <img src={item.url} alt={item.name} className={styles.searchIcon} />
                                                <span className={styles.searchName}>{item.name}</span>
                                                {alreadyHas && <span style={{ fontSize: '10px', color: 'var(--orange)' }}>JÁ POSSUI</span>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}

function QueuePanel() {
    const { data: queue = [], isLoading } = useAdminQueue()
    const { mutate: reprocess, isPending: isReprocessing } = useReprocessImage()

    if (isLoading) return <div className={styles.noUser}>Monitorando fila de processamento...</div>

    return (
        <div className={styles.queueContainer}>
            {queue.length === 0 ? (
                <div className={styles.noUser}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                        <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    <p>Fila vazia. Todas as imagens foram processadas!</p>
                </div>
            ) : (
                queue.map(u => (
                    <div key={u.id} className={styles.queueUserCard}>
                        <div className={styles.queueUserHeader}>
                            <h3>{u.game_nick || u.username} <span>({u.images.length} pendentes)</span></h3>
                        </div>
                        <div className={styles.queueListsWrapper}>
                            {(['pvp', 'pve', 'desafios'] as const).map(type => {
                                const typeImages = u.images.filter((img: any) => img.image_type === type);
                                if (typeImages.length === 0) return null;

                                return (
                                    <div key={type} className={styles.queueGroup}>
                                        <h4 className={styles.queueGroupTitle}>
                                            {type === 'desafios' ? 'CONQUISTAS' : type.toUpperCase()} ({typeImages.length})
                                        </h4>
                                        <div className={styles.queueList}>
                                            {typeImages.map((img: any) => (
                                                <div key={img.id} className={styles.queueListItem}>
                                                    <div className={styles.queueListThumb}>
                                                        <img src={img.image} alt="upload" />
                                                    </div>
                                                    
                                                    <div className={styles.queueListInfo}>
                                                        <span className={styles.queueListName}>
                                                            {img.image.split('/').pop() || 'Imagem_desconhecida.png'}
                                                        </span>
                                                        <div className={styles.queueListMeta}>
                                                            <span className={styles.queueListTypeTag}>{type === 'desafios' ? 'CONQUISTAS' : type.toUpperCase()}</span>
                                                            <span className={styles.queueListDate}>
                                                                {img.created_at ? new Date(img.created_at).toLocaleString('pt-BR') : ''}
                                                            </span>
                                                        </div>
                                                        {img.error && <span className={styles.errorText} title={img.error}>{img.error}</span>}
                                                    </div>

                                                    <div className={styles.queueListStatusCell}>
                                                        <span className={`${styles.queueStatus} ${styles['status-' + img.status]}`}>
                                                            {img.status === 'pending' && '🕒 AGUARDANDO'}
                                                            {img.status === 'processing' && '⚙️ PROCESSANDO...'}
                                                            {img.status === 'completed' && '✅ CONCLUÍDO'}
                                                            {img.status === 'failed' && '❌ FALHA'}
                                                        </span>
                                                        {img.status === 'failed' && (
                                                            <button
                                                                className={styles.reprocessBtn}
                                                                onClick={() => reprocess(img.id)}
                                                                disabled={isReprocessing}
                                                            >
                                                                REPROCESSAR
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}

function SupportPanel() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { data: tickets = [], isLoading } = useTickets()
    const { mutate: updateStatus } = useUpdateTicketStatus()
    const [draggingId, setDraggingId] = useState<number | null>(null)
    const [dragOverCol, setDragOverCol] = useState<string | null>(null)
    
    const selectedTicketId = id ? parseInt(id) : null
    const setSelectedTicketId = (tid: number | null) => {
        if (tid) navigate(`/admin/support/${tid}`)
        else navigate(`/admin/support`)
    }

    const columns = [
        { id: 'waiting', title: 'AGUARDANDO ATENDIMENTO' },
        { id: 'in_progress', title: 'CHAMADOS ABERTOS' },
        { id: 'resolved', title: 'CHAMADOS RESOLVIDOS' },
        { id: 'unsolved', title: 'CHAMADO SEM SOLUÇÃO' },
    ]

    const onDragStart = (e: React.DragEvent, id: number) => {
        setDraggingId(id)
        e.dataTransfer.setData('ticketId', id.toString())
    }

    const onDragOver = (e: React.DragEvent, colId: string) => {
        e.preventDefault()
        setDragOverCol(colId)
    }

    const onDrop = (e: React.DragEvent, colId: string) => {
        e.preventDefault()
        const ticketId = parseInt(e.dataTransfer.getData('ticketId'))
        setDraggingId(null)
        setDragOverCol(null)
        
        updateStatus({ id: ticketId, status: colId })
    }

    const getCategoryAbbr = (cat: string) => {
        const abbrs: Record<string, string> = {
            revisao_pvp: 'PVP',
            revisao_pve: 'PVE',
            conquistas: 'CONQ',
            migracao: 'MIGR',
            bug: 'BUG',
            sugestao: 'SUG'
        }
        return abbrs[cat] || cat.substring(0, 4).toUpperCase()
    }
    if (isLoading) return <div className={styles.noUser} style={{ padding: '40px' }}>Sincronizando Kanban...</div>

    return (
        <div style={{ height: '100%', overflow: 'hidden' }}>
            <div className={styles.supportKanban}>
                {columns.map(col => {
                    const colTickets = tickets.filter(t => t.status === col.id)
                    
                    return (
                        <div 
                            key={col.id} 
                            className={styles.kanbanColumn}
                            onDragOver={(e) => onDragOver(e, col.id)}
                            onDrop={(e) => onDrop(e, col.id)}
                            onDragLeave={() => setDragOverCol(null)}
                        >
                            <div className={styles.kanbanHeader}>
                                <h3>{col.title}</h3>
                                <span className={styles.kanbanCount}>{colTickets.length}</span>
                            </div>
                            <div className={`${styles.kanbanBody} ${dragOverCol === col.id ? styles.kanbanBodyDragging : ''}`}>
                                {colTickets.length === 0 ? (
                                    <div className={styles.noCards}>Vazio</div>
                                ) : (
                                    colTickets.map(t => (
                                        <div 
                                            key={t.id} 
                                            className={`${styles.kanbanCard} ${draggingId === t.id ? styles.kanbanCardActive : ''} ${selectedTicketId === t.id ? styles.kanbanCardSelected : ''} ${(t.status === 'resolved' || t.status === 'unsolved') ? styles.kanbanCardLocked : ''}`}
                                            draggable={t.status !== 'resolved' && t.status !== 'unsolved'}
                                            onDragStart={(e) => onDragStart(e, t.id)}
                                            onClick={() => setSelectedTicketId(t.id)}
                                        >
                                            <div className={styles.cardHeader}>
                                                <span className={styles.cardId}>#{t.id}</span>
                                                <span className={styles.cardCategory}>{getCategoryAbbr(t.category)}</span>
                                            </div>
                                            <div className={styles.cardName}>{t.name}</div>
                                            <div className={styles.cardFooter}>
                                                <div className={styles.cardUser}>{t.username}</div>
                                                <div className={styles.cardDate}>{new Date(t.created_at).toLocaleDateString('pt-BR')}</div>
                                            </div>
                                            {t.assigned_to && (
                                                <div className={styles.cardFooter} style={{ border: 'none', padding: 0, marginTop: 4 }}>
                                                    <div className={styles.cardAssigned}>ATENDIDO POR: {t.assigned_to.toUpperCase()}</div>
                                                </div>
                                            )}
                                            {(t.unread_count ?? 0) > 0 && (
                                                <span className={styles.unreadBadge}>{t.unread_count}</span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {createPortal(
                <AnimatePresence>
                    {selectedTicketId && (
                        <motion.div 
                            className={styles.modalBackdrop}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={(e) => {
                                if (e.target === e.currentTarget) setSelectedTicketId(null)
                            }}
                        >
                            <motion.div 
                                className={styles.modalContainer}
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            >
                                <AdminTicketDetail ticketId={selectedTicketId} onClose={() => setSelectedTicketId(null)} />
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    )
}

function AdminTicketDetail({ ticketId, onClose }: { ticketId: number, onClose: () => void }) {
    const { data: ticket, isLoading } = useTicketDetail(ticketId)
    const { mutate: reply, isPending: replying } = useReplyTicket()
    const { mutate: updateStatus, isPending: updating } = useUpdateTicketStatus()
    const [msg, setMsg] = useState('')
    const [confirmAction, setConfirmAction] = useState<'resolved' | 'unsolved' | null>(null)

    const handleReply = () => {
        if (!msg.trim()) return
        reply({ id: ticketId, message: msg }, {
            onSuccess: () => setMsg('')
        })
    }

    const handleUpdateStatus = (status: TicketStatus) => {
        updateStatus({ id: ticketId, status }, {
            onSuccess: () => {
                setConfirmAction(null)
            }
        })
    }

    if (isLoading) return <div className={styles.sidebarLoading}>Carregando chamado...</div>
    if (!ticket) return null

    const isFinalized = ticket.status === 'resolved' || ticket.status === 'unsolved'

    if (confirmAction) {
        return (
            <div className={styles.sideDetail}>
                <div className={styles.confirmView}>
                    <h3>Confirmar Encerramento</h3>
                    <p>Tem certeza que deseja marcar este chamado como <strong>{confirmAction === 'resolved' ? 'RESOLVIDO' : 'SEM SOLUÇÃO'}</strong>?</p>
                    <div className={styles.confirmButtons}>
                        <button className={styles.cancelAction} onClick={() => setConfirmAction(null)}>CANCELAR</button>
                        <button 
                            className={confirmAction === 'resolved' ? styles.confirmResolve : styles.confirmUnsolve} 
                            onClick={() => handleUpdateStatus(confirmAction)}
                            disabled={updating}
                        >
                            {updating ? '...' : (confirmAction === 'resolved' ? 'ENCERRAR COMO RESOLVIDO' : 'MARCAR SEM SOLUÇÃO')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className={styles.sideDetail}>
            <div className={styles.sideHeader}>
                <div className={styles.sideTitle}>
                    <h3>{ticket.name}</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={styles.sideSub}>#{ticket.id} • {ticket.username}</span>
                        {isFinalized && (
                            <span className={`${styles.statusBadge} ${styles['status-' + ticket.status]}`}>
                                {ticket.status === 'resolved' ? 'RESOLVIDO' : 'SEM SOLUÇÃO'}
                            </span>
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {isFinalized ? (
                        <button 
                            className={styles.reopenBtn} 
                            onClick={() => handleUpdateStatus('waiting')}
                            disabled={updating}
                        >
                            REABRIR CHAMADO
                        </button>
                    ) : (
                        <>
                            <button className={styles.resolveBtn} onClick={() => setConfirmAction('resolved')}>RESOLVER</button>
                            <button className={styles.unsolveBtn} onClick={() => setConfirmAction('unsolved')}>SEM SOLUÇÃO</button>
                        </>
                    )}
                    <button className={styles.closeSide} onClick={onClose}>✕</button>
                </div>
            </div>

            <div className={styles.sideChat}>
                <div className={styles.sideMsg}>
                    <div className={styles.sideMsgMeta}>{ticket.username} • SOLICITAÇÃO</div>
                    <div className={styles.sideMsgText}>{ticket.message}</div>
                </div>
                {ticket.responses?.map(r => (
                    <div key={r.id} className={`${styles.sideMsg} ${r.is_staff_response ? styles.sideMsgStaff : ''}`}>
                        <div className={styles.sideMsgMeta}>
                            {r.is_staff_response ? 'ATENDIMENTO' : r.user} • {new Date(r.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className={styles.sideMsgText}>{r.message}</div>
                    </div>
                ))}
            </div>

            {!isFinalized && (
                <div className={styles.sideInput}>
                    <textarea 
                        placeholder="Escreva sua resposta..."
                        value={msg}
                        onChange={e => setMsg(e.target.value)}
                    />
                    <button onClick={handleReply} disabled={replying}>
                        {replying ? '...' : 'RESPONDER'}
                    </button>
                </div>
            )}
        </div>
    )
}

function MigrationsPanel({ onSelectUser }: { onSelectUser: (id: string) => void }) {
    const { data: migrations = [], isLoading } = useAdminMigrations()
    const { mutate: update } = useUpdateAdminUser()
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all')
    const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')

    const handleRemove = (userId: string, username: string) => {
        if (!window.confirm(`Deseja realmente REMOVER ${username} da API de migração?`)) return;
        
        update({ 
            id: userId, 
            data: { 
                warchaos_solicitou: false,
                warchaos_user: null,
                warchaos_nick: null,
                warchaos_migrado: false
            }
        });
    }

    const filteredMigrations = useMemo(() => {
        let filtered = [...migrations];

        if (statusFilter === 'pending') filtered = filtered.filter(m => !m.migrado);
        else if (statusFilter === 'done') filtered = filtered.filter(m => m.migrado);

        if (search) {
            const lowerSearch = search.toLowerCase();
            filtered = filtered.filter(m => 
                m.username?.toLowerCase().includes(lowerSearch) || 
                m.email?.toLowerCase().includes(lowerSearch) || 
                m.warchaos_user?.toLowerCase().includes(lowerSearch) || 
                m.warchaos_nick?.toLowerCase().includes(lowerSearch)
            );
        }

        filtered.sort((a, b) => {
            const dateA = new Date(a.solicitou_at).getTime();
            const dateB = new Date(b.solicitou_at).getTime();
            return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        return filtered;
    }, [migrations, search, statusFilter, sortOrder]);

    if (isLoading) return <div className={styles.noUser}>Carregando solicitações de migração...</div>

    return (
        <div className={styles.migrationsContainer}>
            <div className={styles.migrationsFilterBar}>
                <div className={styles.searchBox} style={{ marginBottom: 0 }}>
                    <input
                        className={styles.searchInput}
                        placeholder="Buscar por usuário, email ou nick..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <SearchFilterSelect
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val as any)}
                    options={[
                        { value: 'all', label: 'Todos os Status' },
                        { value: 'pending', label: 'Aguardando' },
                        { value: 'done', label: 'Migrados' },
                    ]}
                />
                <SearchFilterSelect
                    value={sortOrder}
                    onChange={(val) => setSortOrder(val as any)}
                    options={[
                        { value: 'newest', label: 'Mais Recentes' },
                        { value: 'oldest', label: 'Mais Antigos' },
                    ]}
                />
            </div>

            {filteredMigrations.length === 0 ? (
                <div className={styles.noUser} style={{ padding: '60px' }}>
                    <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <polyline points="16 11 18 13 22 9" />
                    </svg>
                    <p>Nenhuma solicitação de migração encontrada.</p>
                </div>
            ) : (
                <div className={styles.historyContainer}>
                    <table className={styles.historyTable}>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Usuário</th>
                                <th>Email</th>
                                <th>Usuário WarChaos</th>
                                <th>Nick WarChaos</th>
                                <th>Status</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMigrations.map((m: any) => (
                                <tr key={m.user_id}>
                                    <td>{new Date(m.solicitou_at).toLocaleString('pt-BR')}</td>
                                    <td>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span style={{ fontWeight: 600 }}>{m.username}</span>
                                        </div>
                                    </td>
                                    <td>{m.email}</td>
                                    <td><code className={styles.warchaosCode}>{m.warchaos_user}</code></td>
                                    <td><code className={styles.warchaosCode}>{m.warchaos_nick}</code></td>
                                    <td>
                                        <span className={`${styles.statusLabel} ${m.migrado ? styles.statusDone : styles.statusPending}`}>
                                            {m.migrado ? 'MIGRADO' : 'AGUARDANDO'}
                                        </span>
                                    </td>
                                    <td className={styles.historyActions}>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button 
                                                className={styles.viewUserBtn}
                                                onClick={() => onSelectUser(m.user_id)}
                                                title="Editar dados de migração"
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                </svg>
                                                EDITAR
                                            </button>
                                            <button 
                                                className={styles.resetBtn}
                                                onClick={() => handleRemove(m.user_id, m.username)}
                                                title="Remover solicitação"
                                                style={{ padding: '6px 10px' }}
                                            >
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                    <polyline points="3 6 5 6 21 6" />
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
