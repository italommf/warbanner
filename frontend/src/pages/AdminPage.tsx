import { useState, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAdminUsers, useAdminUserDetail, useAdminUserImages, useUpdateAdminUser, useAdminGlobalStats, usePatentes, useAdminQueue, useReprocessImage, useAdminUserHistory, useAdminMigrations, useItems, useTickets, useTicketDetail, useReplyTicket, useUpdateTicketStatus, type TicketStatus } from '@/api/hooks'
import type { AdminLog, ItemsResponse } from '@/api/hooks'
import styles from './AdminPage.module.css'
import { useAuthStore } from '@/store/authStore'
import { Navigate } from 'react-router'

type AdminTab = 'geral' | 'pvp' | 'pve' | 'desafios' | 'imagens' | 'historico' | 'warchaos'

export function AdminPage() {
    const user = useAuthStore((s) => s.user)
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
    const [search, setSearch] = useState('')
    const [searchType, setSearchType] = useState<'all' | 'nick' | 'username' | 'email'>('all')
    const [activeTab, setActiveTab] = useState<AdminTab>('geral')
    const [mainTab, setMainTab] = useState<'admin' | 'queue' | 'support' | 'migrations'>('admin')

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

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.title}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    ADMINISTRAÇÃO
                </div>
            </header>

            <div className={styles.gameTabBar}>
                <button
                    className={`${styles.gameTab} ${mainTab === 'admin' ? styles.gameTabActive : ''}`}
                    onClick={() => setMainTab('admin')}
                >
                    ADMINISTRAÇÃO DE USUÁRIOS
                    <div className={`${styles.gameTabUnderline} ${mainTab === 'admin' ? styles.gameTabUnderlineActive : ''}`} />
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

            <div className={`${styles.content} ${(mainTab === 'queue' || mainTab === 'support' || mainTab === 'migrations') ? styles.contentFull : ''}`}>
                {mainTab === 'admin' ? (
                    <>
                        <div className={styles.sidebar}>
                            <div className={styles.searchBox}>
                                <input
                                    className={styles.searchInput}
                                    placeholder="Buscar usuários..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                />
                                <CustomSelect
                                    className={styles.searchType}
                                    value={searchType}
                                    onChange={(val: any) => setSearchType(val)}
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
                        setMainTab('admin');
                        setSelectedUserId(id);
                    }} />
                ) : (
                    <SupportPanel />
                )}
            </div>
        </div>
    )
}

function UserEditor({ userId, activeTab, setActiveTab }: { userId: number, activeTab: AdminTab, setActiveTab: (t: AdminTab) => void }) {
    const { data: user, isLoading } = useAdminUserDetail(userId)
    const { data: images = [] } = useAdminUserImages(userId)
    const { mutate: update, isPending: updating } = useUpdateAdminUser()
    const currentUser = useAuthStore(s => s.user)
    const [formData, setFormData] = useState<any>(null)
    const [saved, setSaved] = useState(false)

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
                        <div className={styles.tabResetArea}>
                            <button
                                className={styles.resetBtn}
                                onClick={() => handleLocalReset('pvp')}
                            >
                                RESETAR DADOS PVP
                            </button>
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
                        <div className={styles.tabResetArea}>
                            <button
                                className={styles.resetBtn}
                                onClick={() => handleLocalReset('pve')}
                            >
                                RESETAR DADOS PVE
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'desafios' && (
                    <div className={styles.challengesTabContent}>
                        <div className={styles.challengeGridsContainer}>
                            <ChallengeCategoryEditor 
                                title="MARCAS" 
                                category="marcas"
                                items={formData.my_marcas ?? []} 
                                onChange={v => handleChange('my_marcas', v)} 
                            />
                            <ChallengeCategoryEditor 
                                title="INSÍGNIAS" 
                                category="insignias"
                                items={formData.my_insignias ?? []} 
                                onChange={v => handleChange('my_insignias', v)} 
                            />
                            <ChallengeCategoryEditor 
                                title="FITAS" 
                                category="fitas"
                                items={formData.my_fitas ?? []} 
                                onChange={v => handleChange('my_fitas', v)} 
                            />
                        </div>

                        <div className={styles.challengesFixedFooter}>
                            <button
                                className={styles.resetBtn}
                                onClick={() => handleLocalReset('desafios_data')}
                            >
                                Resetar Desafios
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'imagens' && (
                    <div className={styles.imageTabs}>
                        <div className={styles.statsImagesRow}>
                            <div className={styles.imageSection}>
                                <h3 className={styles.sectionTitle}>PVP</h3>
                                <div className={styles.imageGridMini}>
                                    {images.filter(img => img.image_type === 'pvp').length > 0 ? (
                                        images.filter(img => img.image_type === 'pvp').map(img => (
                                            <ImageCard key={img.id} img={img} />
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
                                            <ImageCard key={img.id} img={img} />
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
                                <button
                                    className={styles.resetBtn}
                                    style={{ fontSize: '10px', padding: '4px 10px' }}
                                    onClick={() => handleLocalReset('desafios')}
                                >
                                    RESETAR CONQUISTAS
                                </button>
                            </div>
                            <div className={styles.imageGrid}>
                                {images.filter(img => img.image_type === 'desafios').length > 0 ? (
                                    images.filter(img => img.image_type === 'desafios').map(img => (
                                        <ImageCard key={img.id} img={img} />
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

function HistoryTab({ userId }: { userId: number }) {
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

function ImageCard({ img }: { img: any }) {
    return (
        <div className={styles.imgCard}>
            <div className={styles.thumbBox}>
                <img src={img.image} alt={`Upload ${img.id}`} />
            </div>
            <div className={styles.imgInfo}>
                <div className={styles.imgDate}>
                    {new Date(img.created_at).toLocaleDateString('pt-BR')} às {new Date(img.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className={`${styles.imgStatus} ${styles['status-' + img.status]}`}>
                    {img.status}
                </div>
            </div>
        </div>
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


function ChallengeCategoryEditor({ title, category, items, onChange }: { title: string, category: string, items: string[], onChange: (v: string[]) => void }) {
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

    const currentItemsData = items.map(filename => {
        const data = allItems.find(i => i.filename === filename)
        return data || { name: filename, filename, url: '', description: '' }
    })

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
                        <div className={styles.queueGrid}>
                            {u.images.map(img => (
                                <div key={img.id} className={styles.queueItem}>
                                    <div className={styles.queueThumb}>
                                        <img src={img.image} alt="upload" />
                                    </div>
                                    <div className={styles.queueInfo}>
                                        <span className={styles.queueType}>{img.image_type}</span>
                                        <span className={`${styles.queueStatus} ${styles['status-' + img.status]}`}>
                                            {img.status === 'pending' && '🕒 AGUARDANDO'}
                                            {img.status === 'processing' && '⚙️ PROCESSANDO...'}
                                            {img.status === 'failed' && '❌ FALHA'}
                                        </span>
                                        {img.error && <span className={styles.errorText} title={img.error}>{img.error}</span>}
                                    </div>
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
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    )
}

function SupportPanel() {
    const { data: tickets = [], isLoading } = useTickets()
    const { mutate: updateStatus } = useUpdateTicketStatus()
    const [draggingId, setDraggingId] = useState<number | null>(null)
    const [dragOverCol, setDragOverCol] = useState<string | null>(null)
    const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null)

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

function MigrationsPanel({ onSelectUser }: { onSelectUser: (id: number) => void }) {
    const { data: migrations = [], isLoading } = useAdminMigrations()

    if (isLoading) return <div className={styles.noUser}>Carregando solicitações de migração...</div>

    return (
        <div className={styles.migrationsContainer}>
            {migrations.length === 0 ? (
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
                            {migrations.map((m: any) => (
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
                                    <td>
                                        <button 
                                            className={styles.viewUserBtn}
                                            onClick={() => onSelectUser(m.user_id)}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                            EDITAR PERFIL
                                        </button>
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
