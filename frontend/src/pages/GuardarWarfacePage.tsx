import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigate } from 'react-router'
import { useAuthStore } from '@/store/authStore'
import { useBannerStore } from '@/store/bannerStore'
import { VIDEO_EXT } from '@/App'
import { useMarcas, useInsignias, useFitas, usePatentes, useItemsLoading, useUploadImages, useUserStats, useTickets, useCreateTicket, useReplyTicket, useTicketDetail, useRequestWarchaosMigration } from '@/api/hooks'
import type { Item } from '@/api/hooks'
import { ListModal } from '@/components/lists/ListModal'
import { ListColumn } from '@/components/lists/ListColumn'
import { FilterBar, ColorFilterBar, SearchBar } from '@/components/filter/FilterBar'
import { applyFilters } from '@/utils/challenges'
import type { Category } from '@/store/bannerStore'
import styles from './GuardarWarfacePage.module.css'

// ── Gradiente de fundo ────────────────────────────────────────────────────────

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
  const bgImage = useBannerStore((s) => s.bgImage)
  const bgColors = useBannerStore((s) => s.bgColors)
  if (!bgImage) return 'rgba(8, 13, 21, 0.80)'
  if (VIDEO_EXT.test(bgImage)) return meshGradient('8,13,21', '8,13,21', '8,13,21', '8,13,21', 0.50)
  if (bgColors) {
    const { tl, tr, bl, br } = bgColors
    return meshGradient(tl, tr, bl, br)
  }
  return 'rgba(8, 13, 21, 0.80)'
}

// ── Icones ────────────────────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
      <rect x="4" y="26" width="32" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M20 6v18M13 13l7-7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="5.5" cy="5.5" r="1.5" fill="currentColor" />
      <path d="M1 11l4-4 3 3 2-2 5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

type GameTab = 'warface' | 'warchaos'
type WarfaceTab = 'guardar' | 'perfil' | 'desafios' | 'chamados'

interface UploadedImage {
  id: string
  file: File
  preview: string
  name: string
  size: number
}

// ── ImageCard ─────────────────────────────────────────────────────────────────

function ImageCard({ image, onRemove }: { image: UploadedImage; onRemove: (id: string) => void }) {
  const sizeKb = (image.size / 1024).toFixed(0)
  return (
    <motion.div
      className={styles.imageCard}
      layout
      initial={{ opacity: 0, scale: 0.88, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.imageCardThumb}>
        <img src={image.preview} alt={image.name} className={styles.imageCardImg} />
        <button className={styles.imageCardRemove} onClick={() => onRemove(image.id)} title="Remover">
          ✕
        </button>
      </div>
      <div className={styles.imageCardMeta}>
        <div className={styles.imageCardIcon}><ImageIcon /></div>
        <div className={styles.imageCardInfo}>
          <span className={styles.imageCardName} title={image.name}>{image.name}</span>
          <span className={styles.imageCardSize}>{sizeKb} KB</span>
        </div>
      </div>
    </motion.div>
  )
}

// ── DropZone ──────────────────────────────────────────────────────────────────

interface DropZoneProps {
  isDragging: boolean
  hasImages: boolean
  onDragOver: (e: DragEvent<HTMLDivElement>) => void
  onDragLeave: () => void
  onDrop: (e: DragEvent<HTMLDivElement>) => void
  onClick: () => void
}

function DropZone({ isDragging, hasImages, onDragOver, onDragLeave, onDrop, onClick }: DropZoneProps) {
  return (
    <div
      className={`${styles.dropZone} ${isDragging ? styles.dropZoneDragging : ''} ${hasImages ? styles.dropZoneCompact : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick()}
    >
      <AnimatePresence mode="wait">
        {isDragging ? (
          <motion.div key="drag" className={styles.dropZoneContent} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={styles.dropZoneIcon} style={{ color: 'var(--orange)' }}><UploadIcon /></div>
            <p className={styles.dropZoneTitle} style={{ color: 'var(--orange)' }}>Solte para adicionar</p>
          </motion.div>
        ) : (
          <motion.div key="idle" className={styles.dropZoneContent} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className={styles.dropZoneIcon}><UploadIcon /></div>
            {!hasImages ? (
              <>
                <p className={styles.dropZoneTitle}>Arraste capturas de tela aqui</p>
                <p className={styles.dropZoneHint}>ou clique para selecionar arquivos</p>
                <p className={styles.dropZoneSub}>PNG, JPG · Lote de multiplas imagens suportado</p>
              </>
            ) : (
              <>
                <p className={styles.dropZoneTitle}>Adicionar mais imagens</p>
                <p className={styles.dropZoneHint}>clique ou arraste</p>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Slot de imagem única (perfil PvP / PvE) ───────────────────────────────────

interface ProfileImageSlotProps {
  label: string
  image: UploadedImage | null
  onChange: (img: UploadedImage | null) => void
}

function ProfileImageSlot({ label, image, onChange }: ProfileImageSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handleFile(file: File) {
    if (image) URL.revokeObjectURL(image.preview)
    onChange({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
    })
  }

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files?.[0]) handleFile(e.target.files[0])
    e.target.value = ''
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
    if (file) handleFile(file)
  }

  return (
    <div
      className={`${styles.profileSlot} ${isDragging ? styles.profileSlotDragging : ''}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleInputChange} />

      {/* Lado esquerdo: Drop/Upload */}
      <div className={styles.profileDropSide} onClick={() => inputRef.current?.click()}>
        <div className={styles.profileSlotIcon}><UploadIcon /></div>
        <div className={styles.profileSlotInfo}>
          <span className={styles.profileSlotLabel}>{label}</span>
          <span className={styles.profileSlotHint}>Arraste aqui ou clique</span>
        </div>
      </div>

      {/* Lado direito: Preview */}
      <div className={styles.profilePreviewSide}>
        {image ? (
          <div className={styles.profilePreviewThumb}>
            <img src={image.preview} alt="Preview" className={styles.profilePreviewImg} />
            <button
              className={styles.profilePreviewRemove}
              onClick={(e) => { e.stopPropagation(); onChange(null) }}
              title="Remover"
            >✕</button>
          </div>
        ) : (
          <div className={styles.profilePreviewEmpty}>
            <span>SEM IMAGEM</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Aba: Guardar Meus Dados ───────────────────────────────────────────────────

function GuardarDadosTab() {
  const [images, setImages] = useState<UploadedImage[]>([])
  const [pvpImage, setPvpImage] = useState<UploadedImage | null>(null)
  const [pveImage, setPveImage] = useState<UploadedImage | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data: userStats } = useUserStats()

  useEffect(() => () => { images.forEach((i) => URL.revokeObjectURL(i.preview)) }, [])

  const { mutateAsync: uploadImages, isPending, isSuccess, reset: resetUpload } = useUploadImages()

  const processFiles = useCallback((files: FileList | File[]) => {
    resetUpload() // Reseta o estado de sucesso ao adicionar novos arquivos
    const valid = Array.from(files).filter((f) => f.type.startsWith('image/'))
    if (!valid.length) return
    setImages((prev) => [
      ...prev,
      ...valid.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        preview: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
      })),
    ])
  }, [])

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setIsDragging(false)
    processFiles(e.dataTransfer.files)
  }

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(e.target.files)
    e.target.value = ''
  }

  const handlePvpChange = (img: UploadedImage | null) => {
    resetUpload()
    setPvpImage(img)
  }

  const handlePveChange = (img: UploadedImage | null) => {
    resetUpload()
    setPveImage(img)
  }

  const handleUpload = async () => {
    const pvpFiles = pvpImage ? [pvpImage.file] : []
    const pveFiles = pveImage ? [pveImage.file] : []
    const desafioFiles = images.map(img => img.file)

    if (isPending) return
    if (pvpFiles.length === 0 && pveFiles.length === 0 && desafioFiles.length === 0) return

    // Envia cada tipo sequencialmente (PVP → PVE → Desafios)
    // Cada upload é independente: se um falhar, os outros continuam
    if (pvpFiles.length > 0) {
      try { await uploadImages({ files: pvpFiles, type: 'pvp' }) }
      catch (e) { console.error('Erro no upload PVP:', e) }
    }
    if (pveFiles.length > 0) {
      try { await uploadImages({ files: pveFiles, type: 'pve' }) }
      catch (e) { console.error('Erro no upload PVE:', e) }
    }
    if (desafioFiles.length > 0) {
      try { await uploadImages({ files: desafioFiles, type: 'desafios' }) }
      catch (e) { console.error('Erro no upload Desafios:', e) }
    }

    setImages([])
    setPvpImage(null)
    setPveImage(null)
  }

  function handleRemove(id: string) {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id)
      if (img) URL.revokeObjectURL(img.preview)
      return prev.filter((i) => i.id !== id)
    })
  }

  function handleClearAll() {
    images.forEach((i) => URL.revokeObjectURL(i.preview))
    setImages([])
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.guardarLayout}>

        {/* ── Coluna esquerda: grupos de imagens ── */}
        <div className={styles.guardarLeft}>

          <div className={styles.profileGroupsRow}>
            {/* Grupo: Estatísticas PvP */}
            <div className={styles.uploadGroup}>
              <h4 className={styles.uploadGroupTitle}>ESTATÍSTICAS DO PVP</h4>
              <ProfileImageSlot
                label="PERFIL PVP"
                image={pvpImage}
                onChange={handlePvpChange}
              />
            </div>

            {/* Grupo: Estatísticas PvE */}
            <div className={styles.uploadGroup}>
              <h4 className={styles.uploadGroupTitle}>ESTATÍSTICAS DO PVE</h4>
              <ProfileImageSlot
                label="PERFIL PVE"
                image={pveImage}
                onChange={handlePveChange}
              />
            </div>
          </div>

          {/* Grupo: Imagem dos Desafios */}
          <div className={`${styles.uploadGroup} ${styles.uploadGroupDesafios}`}>
            <div className={styles.uploadGroupHeader}>
              <h4 className={styles.uploadGroupTitle}>IMAGEM DOS DESAFIOS</h4>
              {images.length > 0 && (
                <div className={styles.stat}>
                  <span className={styles.statValue}>{images.length}</span>
                  <span className={styles.statLabel}>imagens</span>
                </div>
              )}
            </div>

            <div className={styles.desafiosScrollArea}>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={handleInputChange}
              />

              <DropZone
                isDragging={isDragging}
                hasImages={images.length > 0}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
              />

              <AnimatePresence mode="wait">
                {images.length > 0 ? (
                  <motion.div
                    key="previews"
                    className={styles.previewSection}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12 }}
                    transition={{ duration: 0.22 }}
                  >
                    <div className={styles.previewHeader}>
                      <span className={styles.previewCount}>
                        {images.length} imagem{images.length !== 1 ? 's' : ''} selecionada{images.length !== 1 ? 's' : ''}
                      </span>
                      <div className={styles.previewActions}>
                        <button className={styles.clearBtn} onClick={handleClearAll}>REMOVER TODAS</button>
                      </div>
                    </div>

                    <motion.div className={styles.previewGrid} layout>
                      <AnimatePresence mode="popLayout">
                        {images.map((img) => (
                          <ImageCard key={img.id} image={img} onRemove={handleRemove} />
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    className={styles.emptyDesafios}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    Nenhuma imagem dos desafios foi anexada ainda
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>{/* /uploadGroup: Imagem dos Desafios */}
        </div>{/* /guardarLeft */}

        {/* ── Coluna direita: como usar (sempre visível) ── */}
        <div className={styles.guardarRight}>
          <div className={styles.instructions}>
            <h4 className={styles.instructionsTitle}>COMO USAR</h4>


            <div className={styles.videoContainer}>
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                title="Tutorial Warface Desafios"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className={styles.videoIframe}
              ></iframe>
            </div>
          </div>

          <div className={styles.processingInfo}>
            <div className={styles.processingIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <p className={styles.processingText}>
              O processamento é automático e o tempo depende da quantidade de imagens.
              Ao finalizar, seus desafios e status de PvP/PvE serão preenchidos na aba de Perfil.
            </p>
            {userStats !== undefined && (
              <div className={styles.totalUploads}>
                Total de imagens enviadas: <strong>{userStats.total_images}</strong>
              </div>
            )}
          </div>
          <div className={styles.submitWrapper}>
            <div className={styles.processWrapper}>
              <button
                className={`${styles.submitBtn} ${(isSuccess && images.length === 0 && !pvpImage && !pveImage) ? styles.submitBtnSuccess : ''}`}
                disabled={(images.length === 0 && !pvpImage && !pveImage) || isPending}
                onClick={handleUpload}
                style={{
                  opacity: ((images.length === 0 && !pvpImage && !pveImage) || isPending) ? 0.5 : 1,
                  cursor: ((images.length === 0 && !pvpImage && !pveImage) || isPending) ? 'not-allowed' : 'pointer'
                }}
              >
                {isPending ? 'ENVIANDO...' : (isSuccess && images.length === 0 && !pvpImage && !pveImage) ? 'ENVIADO COM SUCESSO!' : 'ENVIAR IMAGENS PARA O PROCESSAMENTO'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}


// ── Perfil: tipos e dados (populados via faker) ────────────────────────────────


interface ClassStat {
  name: string
  color: string
  em: number | null
  winRate: number | null
  hours: number
}

interface ModeStats {
  em: number | null
  winRate: number | null
  matches: number | null
  missionEasy: number
  missionMedium: number
  missionHard: number
  hours: number
  bestRankRp: number
  bestRankName: string
  classes: ClassStat[]
}

// ── Perfil: componentes auxiliares ────────────────────────────────────────────

function DonutChart({ classes, totalHours }: { classes: ClassStat[]; totalHours: number }) {
  const r = 52, cx = 65, cy = 65
  const circ = 2 * Math.PI * r

  if (!totalHours) {
    return (
      <svg width="130" height="130" className={styles.donutSvg}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth="11" />
      </svg>
    )
  }

  let cumulative = 0
  return (
    <svg width="130" height="130" className={styles.donutSvg}>
      {classes.map((cls) => {
        const dashLen = (cls.hours / totalHours) * circ
        const offset = cumulative
        cumulative += dashLen
        return (
          <circle
            key={cls.name}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={cls.color}
            strokeWidth="11"
            strokeDasharray={`${dashLen} ${circ - dashLen}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90, ${cx}, ${cy})`}
          />
        )
      })}
    </svg>
  )
}

const MISSION_LEVELS = [
  { label: 'Fácil', color: '#4caf82' },
  { label: 'Normal', color: '#c8960a' },
  { label: 'Difícil', color: '#e8332a' },
] as const

function StatColumn({ title, stats, mode }: { title: string; stats: ModeStats; mode: 'pvp' | 'pve' }) {
  const fmtNum = (n: number | null) => n === null ? '—' : n.toLocaleString('pt-BR')
  const fmtMis = (n: number) => n > 0 ? n.toLocaleString('pt-BR') : '—'

  return (
    <div className={styles.statColumn}>
      <div className={styles.statColumnTitle}>{title}</div>

      <div className={styles.statColumnBody}>
        {/* Esquerda: métricas numéricas */}
        <div className={styles.statLeft}>
          <div className={styles.metricItem}>
            <span className={styles.bigStatLabel}>Eliminações / Mortes (K/D)</span>
            <span className={styles.bigStatValue}>{fmtNum(stats.em)}</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.bigStatLabel}>Índice de vitórias</span>
            <span className={styles.bigStatValue}>
              {stats.winRate === null ? '—' : `${Math.floor(stats.winRate)}%`}
            </span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.bigStatLabel}>Partidas jogadas</span>
            <span className={styles.bigStatValue}>{fmtNum(stats.matches)}</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.bigStatLabel}>Tempo total</span>
            <span className={styles.bigStatValue}>{stats.hours ? `${stats.hours.toLocaleString('pt-BR')}h` : '—'}</span>
          </div>

          {mode === 'pvp' && (
            <div className={`${styles.metricItem} ${styles.metricItemFull}`}>
              <span className={styles.bigStatLabel}>Melhor classificação em partidas rankeadas</span>
              <div className={styles.bestRankDisplay}>
                <span className={styles.bestRankRp}>{stats.bestRankRp}</span>
                <span className={styles.bestRankRpUnit}>RP —</span>
                <span className={styles.bestRankName}>{stats.bestRankName}</span>
              </div>
            </div>
          )}

          {mode === 'pve' && (
            <div className={styles.missionBlock}>
              <span className={styles.bigStatLabel}>Missões concluídas</span>
              <div className={styles.missionRow}>
                {MISSION_LEVELS.map(({ label, color }, i) => {
                  const val = [stats.missionEasy, stats.missionMedium, stats.missionHard][i]
                  return (
                    <div key={label} className={styles.missionItem}>
                      <span className={styles.missionDiffLabel} style={{ color }}>{label}</span>
                      <span className={styles.missionValue}>{fmtMis(val)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Direita: donut + tabela de classes */}
        <div className={styles.statRight}>
          <div className={styles.donutWrap}>
            <DonutChart classes={stats.classes} totalHours={stats.hours} />
            <div className={styles.donutCenter}>
              <span className={styles.donutHours}>
                {stats.hours ? `${stats.hours.toLocaleString('pt-BR')}h` : '—'}
              </span>
              <span className={styles.donutLabel}>no jogo</span>
            </div>
          </div>

          <table className={styles.classTable}>
            <thead>
              <tr>
                <th></th>
                <th>Elim./Mortes</th>
                <th>Taxa de vitória</th>
                <th>Tempo</th>
              </tr>
            </thead>
            <tbody>
              {Array.isArray(stats.classes) && stats.classes.map((cls) => (
                <tr key={cls.name}>
                  <td style={{ color: cls.color }}>{cls.name}</td>
                  <td>{cls.em === null ? '—' : cls.em.toFixed(1)}</td>
                  <td>{cls.winRate === null ? '—' : `${Math.floor(cls.winRate)}%`}</td>
                  <td>{cls.hours ? `${cls.hours}h` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

// ── Conquistas favoritas ───────────────────────────────────────────────────────

type AchSlotType = 'marca' | 'insignia' | 'fita'

interface AchSlot { type: AchSlotType; item: Item | null }

// 3 linhas × 6 colunas: [marca, marca, insignia, insignia, fita, fita]
const ROW_PATTERN: AchSlotType[] = ['marca', 'marca', 'insignia', 'insignia', 'fita', 'fita']
const ROWS = 3

const FAV_STORAGE_KEY = 'wf_fav_achievements'

function buildSlots(): AchSlot[] {
  return Array.from({ length: ROWS }, () => ROW_PATTERN.map((type) => ({ type, item: null }))).flat()
}

function loadSlots(userId: number): AchSlot[] {
  const base = buildSlots()
  if (!userId) return base
  try {
    const raw = localStorage.getItem(`${FAV_STORAGE_KEY}_${userId}`)
    if (!raw) return base
    const saved: (Item | null)[] = JSON.parse(raw)
    return base.map((slot, i) => ({ ...slot, item: saved[i] ?? null }))
  } catch {
    return base
  }
}

const ACH_CATEGORY: Record<AchSlotType, Category> = {
  marca: 'marcas',
  insignia: 'insignias',
  fita: 'fitas',
}

function FavoriteAchievements({ userStats }: { userStats: any }) {
  const user = useAuthStore((s) => s.user)
  const userId = user?.id || 0
  
  const marcas = useMarcas()
  const insignias = useInsignias()
  const fitas = useFitas()
  
  const [slots, setSlots] = useState<AchSlot[]>(() => loadSlots(userId))
  const [pickerOpen, setPickerOpen] = useState<number | null>(null)

  useEffect(() => {
    if (userId) {
      localStorage.setItem(`${FAV_STORAGE_KEY}_${userId}`, JSON.stringify(slots.map((s) => s.item)))
    }
  }, [slots, userId])

  function getItems(type: AchSlotType): Item[] {
    const category = ACH_CATEGORY[type]
    const owned = userStats.stats?.[`my_${category}`] || []
    const ownedSet = new Set(owned)
    const all = type === 'marca' ? marcas : type === 'insignia' ? insignias : fitas
    return all.filter(item => ownedSet.has(item.filename))
  }

  function selectItem(idx: number, item: Item) {
    setSlots((prev) => prev.map((s, i) => i === idx ? { ...s, item } : s))
    setPickerOpen(null)
  }

  return (
    <div className={styles.achievSection}>
      <h4 className={styles.achievTitle}>MINHAS CONQUISTAS FAVORITAS</h4>
      <div className={styles.achievGrid}>
        {slots.map((slot, i) => (
          <button
            key={i}
            className={`${styles.achievSlot} ${styles[`achievSlot_${slot.type}` as keyof typeof styles]}`}
            onClick={() => setPickerOpen(i)}
            title={slot.item?.name ?? `Adicionar ${slot.type}`}
          >
            {slot.item ? (
              <img src={slot.item.url} alt={slot.item.name} className={styles.achievImg} />
            ) : (
              <span className={styles.achievEmpty}>+</span>
            )}
          </button>
        ))}
      </div>

      {pickerOpen !== null && (
        <ListModal
          category={ACH_CATEGORY[slots[pickerOpen].type]}
          items={getItems(slots[pickerOpen].type)}
          selectedFilename={slots[pickerOpen].item?.filename ?? null}
          onSelect={(item) => selectItem(pickerOpen, item as Item)}
          onClose={() => setPickerOpen(null)}
        />
      )}
    </div>
  )
}

// ── Rank Tracker ──────────────────────────────────────────────────────────────

const VISIBLE_COUNT = 15
const HALF = Math.floor(VISIBLE_COUNT / 2) // 7 — usuário sempre no centro

type SlotKind = 'past' | 'current' | 'future' | 'empty'

interface RankSlot {
  absIdx: number
  kind: SlotKind
  patente: { name: string; filename: string; url: string } | null
}

function RankTracker({ userRankIdx }: { userRankIdx: number }) {
  const patentes = usePatentes()

  if (!patentes.length) return null

  const centerIdx = Math.max(0, (userRankIdx || 1) - 1)
  const absCenter = Math.min(centerIdx, patentes.length - 1)

  const slots: RankSlot[] = Array.from({ length: VISIBLE_COUNT }, (_, i) => {
    const absIdx = absCenter - HALF + i
    const patente = absIdx >= 0 && absIdx < patentes.length ? patentes[absIdx] : null
    let kind: SlotKind
    if (absIdx < 0 || absIdx >= patentes.length) kind = 'empty'
    else if (absIdx < absCenter) kind = 'past'
    else if (absIdx === absCenter) kind = 'current'
    else kind = 'future'
    return { absIdx, kind, patente }
  })

  const kindClass: Record<SlotKind, string> = {
    past: '',
    current: styles.rankItemCurrent,
    future: styles.rankItemFuture,
    empty: styles.rankItemEmpty,
  }

  return (
    <div className={styles.rankTracker}>
      <div className={styles.rankTrackerHeader}>
        <span className={styles.rankTrackerTitle}>RANK ATUAL</span>
        <span className={styles.rankTrackerBadge}>
          Rank {absCenter + 1} · {patentes[absCenter]?.name ?? ''}
        </span>
      </div>

      <div className={styles.rankCarouselWrap}>
        <div className={styles.rankCarousel}>
          {slots.map((slot, i) => (
            <div
              key={i}
              className={`${styles.rankItem} ${kindClass[slot.kind]}`}
              title={slot.patente ? `Rank ${slot.absIdx + 1} — ${slot.patente.name}` : '—'}
            >
              <span className={styles.rankNum}>
                {slot.kind !== 'empty' ? slot.absIdx + 1 : ''}
              </span>
              <div className={styles.rankDiamondOuter}>
                <div className={styles.rankDiamond}>
                  {slot.patente && (
                    <img src={slot.patente.url} alt={slot.patente.name} className={styles.rankImg} />
                  )}
                </div>
                {slot.kind === 'empty' && (
                  <svg className={styles.rankEmptyX} viewBox="0 0 24 24" fill="none">
                    <line x1="7" y1="7" x2="17" y2="17" stroke="#2a3848" strokeWidth="1.2" strokeLinecap="round" />
                    <line x1="17" y1="7" x2="7" y2="17" stroke="#2a3848" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Aba: Perfil ───────────────────────────────────────────────────────────────

function PerfilTab() {
  const { data: userStats } = useUserStats()

  if (!userStats) return (
    <div className={styles.tabContent}>
      <div className={styles.loadingStats}>Carregando estatísticas...</div>
    </div>
  )

  const emptyStats: ModeStats = {
    em: null,
    winRate: null,
    matches: null,
    missionEasy: 0,
    missionMedium: 0,
    missionHard: 0,
    hours: 0,
    bestRankRp: 0,
    bestRankName: 'Desafiante',
    classes: [],
  }

  const pvpStats: ModeStats = {
    ...emptyStats,
    em: userStats.stats.pvp_em || null,
    winRate: userStats.stats.pvp_win_rate || null,
    matches: userStats.stats.pvp_matches || null,
    hours: userStats.stats.pvp_hours || 0,
    bestRankRp: userStats.stats.pvp_best_rank_rp || 0,
    bestRankName: userStats.stats.pvp_best_rank_name || 'Desafiante',
    classes: (userStats.stats.pvp_classes as any) || [],
  }

  const pveStats: ModeStats = {
    ...emptyStats,
    em: userStats.stats.pve_em || null,
    winRate: userStats.stats.pve_win_rate || null,
    matches: userStats.stats.pve_matches || null,
    hours: userStats.stats.pve_hours || 0,
    missionEasy: userStats.stats.pve_mission_easy || 0,
    missionMedium: userStats.stats.pve_mission_medium || 0,
    missionHard: userStats.stats.pve_mission_hard || 0,
    classes: (userStats.stats.pve_classes as any) || [],
  }

  return (
    <div className={styles.tabContent}>
      <div className={styles.profileColumns}>
        <StatColumn title="PVP" stats={pvpStats} mode="pvp" />
        <StatColumn title="PVE" stats={pveStats} mode="pve" />
      </div>
      <RankTracker userRankIdx={userStats.stats.game_rank_idx || 0} />
      <FavoriteAchievements userStats={userStats} />
    </div>
  )
}

// ── Aba: Meus Desafios ────────────────────────────────────────────────────────

function MeusDesafiosTab({ onGoToGuardar: _ }: { onGoToGuardar: () => void }) {
  const { data: userStats } = useUserStats()
  const rawMarcas = useMarcas()
  const rawInsignias = useInsignias()
  const rawFitas = useFitas()
  const isLoading = useItemsLoading()

  const mainFilter = useBannerStore((s) => s.mainFilter)
  const armasFilter = useBannerStore((s) => s.armasFilter)
  const colorFilter = useBannerStore((s) => s.colorFilter)
  const searchTerm = useBannerStore((s) => s.searchTerm)
  const hideEmpty = useBannerStore((s) => s.hideEmpty)

  // Filtrar as listas globais baseadas no que o usuário possui no perfil
  const myMarcasRaw = useMemo(() => {
    if (!userStats?.stats?.my_marcas || !rawMarcas.length) return []
    const ownedSet = new Set(userStats.stats.my_marcas)
    return rawMarcas.filter(item => ownedSet.has(item.filename))
  }, [rawMarcas, userStats])

  const myInsigniasRaw = useMemo(() => {
    if (!userStats?.stats?.my_insignias || !rawInsignias.length) return []
    const ownedSet = new Set(userStats.stats.my_insignias)
    return rawInsignias.filter(item => ownedSet.has(item.filename))
  }, [rawInsignias, userStats])

  const myFitasRaw = useMemo(() => {
    if (!userStats?.stats?.my_fitas || !rawFitas.length) return []
    const ownedSet = new Set(userStats.stats.my_fitas)
    return rawFitas.filter(item => ownedSet.has(item.filename))
  }, [rawFitas, userStats])

  // Aplicar filtros de busca/categoria/cor
  const myMarcas = useMemo(() => applyFilters(myMarcasRaw, 'marcas', mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty),
    [myMarcasRaw, mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty])

  const myInsignias = useMemo(() => applyFilters(myInsigniasRaw, 'insignias', mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty),
    [myInsigniasRaw, mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty])

  const myFitas = useMemo(() => applyFilters(myFitasRaw, 'fitas', mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty),
    [myFitasRaw, mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty])

  return (
    <div className={styles.desafiosTab}>
      <div className={styles.desafiosNote}>
        <span>As conquistas abaixo serão preenchidas após processar suas capturas de tela.</span>
      </div>

      <div className={styles.desafiosToolbar}>
        <FilterBar />
        <ColorFilterBar />
        <SearchBar />
      </div>

      <div className={styles.desafiosLists}>
        <ListColumn category="marcas" items={myMarcas} columnIndex={0} isLoading={isLoading} />
        <ListColumn category="insignias" items={myInsignias} columnIndex={1} isLoading={isLoading} />
        <ListColumn category="fitas" items={myFitas} columnIndex={2} isLoading={isLoading} />
      </div>
    </div>
  )
}

// ── Aba: Meus Chamados ────────────────────────────────────────────────────────

function TicketCard({ ticket, active, onClick }: { ticket: any, active: boolean, onClick: () => void }) {
  return (
    <div 
      className={`${styles.ticketSmallCard} ${active ? styles.ticketCardActive : ''}`}
      onClick={onClick}
    >
      <div className={styles.ticketCardHeader}>
        <span className={styles.ticketId}>#{ticket.id}</span>
        <span className={`${styles.statusDot} ${styles['status-' + ticket.status]}`}>
          {ticket.status === 'waiting' && '🕒'}
          {ticket.status === 'in_progress' && '⚙️'}
          {ticket.status === 'resolved' && '✓'}
          {ticket.status === 'unsolved' && '✕'}
        </span>
      </div>
      <div className={styles.ticketSubject}>{ticket.name}</div>
      <div className={styles.ticketDate}>{new Date(ticket.created_at).toLocaleDateString()}</div>
      {ticket.unread_count > 0 && (
        <span className={styles.unreadBadge}>{ticket.unread_count}</span>
      )}
    </div>
  )
}

function MyTicketsTab() {
  const { data: tickets = [], isLoading } = useTickets()
  const { mutate: createTicket, isPending: creating } = useCreateTicket()
  const [isOpeningModal, setIsOpeningModal] = useState(false)
  const [selectedTicketId, setSelectedId] = useState<number | null>(null)
  const { data: detail } = useTicketDetail(selectedTicketId)
  const { mutate: reply, isPending: replying } = useReplyTicket()

  const [name, setName] = useState('')
  const [category, setCategory] = useState('revisao_pvp')
  const [msg, setMsg] = useState('')
  const [replyMsg, setReplyMsg] = useState('')

  const hasActiveTicket = useMemo(() => {
    return tickets.some(t => t.status === 'waiting' || t.status === 'in_progress')
  }, [tickets])

  const groupedTickets = useMemo(() => {
    return {
      in_progress: tickets.filter(t => t.status === 'in_progress'),
      waiting: tickets.filter(t => t.status === 'waiting'),
      closed: tickets.filter(t => t.status === 'resolved' || t.status === 'unsolved')
    }
  }, [tickets])

  const handleOpenTicket = () => {
    if (!name.trim() || !msg.trim()) return
    createTicket({ name, category, message: msg }, {
      onSuccess: () => {
        setIsOpeningModal(false)
        setName('')
        setCategory('revisao_pvp')
        setMsg('')
      },
      onError: (err: any) => {
        alert(err.message || 'Erro ao abrir chamado')
      }
    })
  }

  const handleReply = () => {
    if (!selectedTicketId || !replyMsg.trim()) return
    reply({ id: selectedTicketId, message: replyMsg }, {
      onSuccess: () => setReplyMsg('')
    })
  }

  if (isLoading) return <div className={styles.noUser}>Carregando chamados...</div>

  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
          <div>
            <h3 className={styles.sectionTitle}>MEUS CHAMADOS</h3>
            <p className={styles.sectionDesc}>Confira aqui suas solicitações de suporte e fale com os administradores.</p>
          </div>
          <button 
            className={`${styles.guardarAlertBtn} ${hasActiveTicket ? styles.btnDisabled : ''}`} 
            onClick={() => !hasActiveTicket && setIsOpeningModal(true)}
            disabled={hasActiveTicket}
            style={hasActiveTicket ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            title={hasActiveTicket ? "Você já possui um chamado ativo" : ""}
          >
            {hasActiveTicket ? 'CHAMADO ATIVO' : 'ABRIR CHAMADO'}
          </button>
        </div>
      </div>

      <div className={styles.ticketsGrid}>
        <div className={styles.ticketsSideList}>
          {tickets.length === 0 ? (
            <p className={styles.noItemsMsg}>Você ainda não abriu nenhum chamado.</p>
          ) : (
            <>
              {groupedTickets.in_progress.length > 0 && (
                <div className={styles.ticketGroup}>
                  <div className={styles.groupHeader}>EM ATENDIMENTO</div>
                  {groupedTickets.in_progress.map(t => (
                    <TicketCard key={t.id} ticket={t} active={selectedTicketId === t.id} onClick={() => setSelectedId(t.id)} />
                  ))}
                </div>
              )}

              {groupedTickets.waiting.length > 0 && (
                <div className={styles.ticketGroup}>
                  <div className={styles.groupHeader}>AGUARDANDO</div>
                  {groupedTickets.waiting.map(t => (
                    <TicketCard key={t.id} ticket={t} active={selectedTicketId === t.id} onClick={() => setSelectedId(t.id)} />
                  ))}
                </div>
              )}

              {groupedTickets.closed.length > 0 && (
                <div className={styles.ticketGroup}>
                  <div className={styles.groupHeader}>HISTÓRICO / FECHADOS</div>
                  {groupedTickets.closed.map(t => (
                    <TicketCard key={t.id} ticket={t} active={selectedTicketId === t.id} onClick={() => setSelectedId(t.id)} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className={styles.ticketDetailView}>
          {selectedTicketId ? (
            detail && (
              <div className={styles.ticketConversa}>
                <div className={styles.conversaHeader}>
                  <div>
                    <h4>{detail.name}</h4>
                    <span style={{ fontSize: '10px', color: 'var(--orange)', fontWeight: 800 }}>
                      {({
                        revisao_pvp: 'REVISÃO PVP',
                        revisao_pve: 'REVISÃO PVE',
                        conquistas: 'CONQUISTAS',
                        migracao: 'MIGRAÇÃO WARCHAOS',
                        bug: 'REPORTAR BUG',
                        sugestao: 'SUGERIR MELHORIA'
                      } as any)[detail.category] || detail.category.toUpperCase()}
                    </span>
                  </div>
                  <span className={`${styles.statusBadge} ${styles['status-' + detail.status]}`}>
                    {detail.status === 'waiting' && 'AGUARDANDO'}
                    {detail.status === 'in_progress' && 'EM ATENDIMENTO'}
                    {detail.status === 'resolved' && 'RESOLVIDO'}
                    {detail.status === 'unsolved' && 'SEM SOLUÇÃO'}
                  </span>
                </div>
                <div className={styles.conversaBody}>
                  <div className={styles.msgBubble}>
                    <div className={styles.msgNick}>{detail.username} (Você)</div>
                    <div className={styles.msgContent}>{detail.message}</div>
                    <div className={styles.msgTime}>{new Date(detail.created_at).toLocaleString()}</div>
                  </div>
                  {detail.responses?.map(r => (
                    <div key={r.id} className={`${styles.msgBubble} ${r.is_staff_response ? styles.staffMsg : ''}`}>
                      <div className={styles.msgNick}>{r.is_staff_response ? 'ADMINISTRAÇÃO' : (r.user + ' (Você)')}</div>
                      <div className={styles.msgContent}>{r.message}</div>
                      <div className={styles.msgTime}>{new Date(r.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
                <div className={styles.conversaFooter}>
                  {detail.status !== 'resolved' && detail.status !== 'unsolved' ? (
                    <div className={styles.conversaInput}>
                      <textarea 
                        placeholder="Responda aqui..." 
                        value={replyMsg}
                        onChange={e => setReplyMsg(e.target.value)}
                      />
                      <button onClick={handleReply} disabled={replying}>ENVIAR</button>
                    </div>
                  ) : (
                    <div className={styles.closureNotice}>
                      <div className={styles.closureText}>
                        <span>Ticket Encerrado por</span>
                        <div className={styles.staffBadgeWrapper}>
                          <span className={`${styles.roleTag} ${styles['role-' + detail.assigned_to_role]}`}>
                            {detail.assigned_to_role === 'admin' ? 'ADMIN' : 'MOD'}
                          </span>
                          <span className={styles.staffName}>
                            {detail.assigned_to_nick || detail.assigned_to || 'Administração'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className={styles.emptyDetail}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <p>Selecione um chamado ao lado para ver a conversa</p>
            </div>
          )}
        </div>
      </div>

      {isOpeningModal && (
        <div className={styles.ticketModalOverlay}>
          <div className={styles.ticketModal}>
            <div className={styles.modalHeader}>
              <h3>ABRIR NOVO CHAMADO</h3>
              <button className={styles.closeBtn} onClick={() => setIsOpeningModal(false)}>✕</button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.modalField}>
                <label>Nome do Chamado</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Problema com importação" />
              </div>
              <div className={styles.modalField}>
                <label>Tipo do Chamado</label>
                <select 
                  value={category} 
                  onChange={e => setCategory(e.target.value)}
                  style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '10px', borderRadius: '6px' }}
                >
                  <option value="revisao_pvp">Revisão de dados PVP</option>
                  <option value="revisao_pve">Revisão de dados PVE</option>
                  <option value="conquistas">Minhas conquistas</option>
                  <option value="migracao">Migração parcial para o Warchaos</option>
                  <option value="bug">Reportar Bug</option>
                  <option value="sugestao">Sugerir melhorias</option>
                </select>
              </div>
              <div className={styles.modalField}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label>Solicitação</label>
                  <span style={{ fontSize: '10px', opacity: 0.5, color: msg.length > 1000 ? 'var(--orange)' : 'inherit' }}>
                    {msg.length}/1000
                  </span>
                </div>
                <textarea 
                  value={msg} 
                  onChange={e => setMsg(e.target.value)} 
                  placeholder="Descreva sua solicitação detalhadamente..."
                  maxLength={1000}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.cancelBtn} onClick={() => setIsOpeningModal(false)}>CANCELAR</button>
              <button className={styles.confirmBtn} onClick={handleOpenTicket} disabled={creating || msg.length > 1000 || !name.trim()}>
                ABRIR CHAMADO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



function WarchaosTab() {
  const user = useAuthStore((s) => s.user)
  const [showModal, setShowModal] = useState(false)
  const [hasAccount, setHasAccount] = useState(false)
  
  // States for migration modal
  const [wcUser, setWcUser] = useState('')
  const [wcNick, setWcNick] = useState('')

  const { mutate: requestMigration, isPending } = useRequestWarchaosMigration()

  const handleConfirmMigration = () => {
    if (!wcUser.trim() || !wcNick.trim()) return
    requestMigration({ warchaos_user: wcUser, warchaos_nick: wcNick })
    setShowModal(false)
  }

  return (
    <div className={`${styles.tabContent} ${styles.tabContentCentered}`}>
      <AnimatePresence>
        {showModal && (
          <motion.div 
            className={styles.ticketModalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={styles.ticketModal}
              initial={{ scale: 0.95, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 16 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.modalHeader}>
                <h3>SOLICITAR MIGRAÇÃO</h3>
                <button className={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
              </div>

              <div className={styles.modalBody} style={{ gap: '12px' }}>
                <p className={styles.migrationModalText}>
                  Preencha abaixo com os dados da sua conta <strong>destino</strong> no WarChaos.
                </p>

                <div className={styles.modalForm}>
                  <div className={styles.modalInputGroup}>
                    <label>Seu USUÁRIO (login) no WarChaos</label>
                    <input 
                      className={styles.modalInput} 
                      value={wcUser} 
                      onChange={e => setWcUser(e.target.value)}
                      placeholder="Somente o seu usuário (NUNCA informe sua senha)"
                    />
                    <span style={{ fontSize: '10px', color: 'var(--orange)', fontWeight: 600 }}>IMPORTANTE: Nunca informe sua senha para ninguém!</span>
                  </div>

                  <div className={styles.modalInputGroup}>
                    <label>Seu NICK (apelido) no WarChaos</label>
                    <input 
                      className={styles.modalInput} 
                      value={wcNick} 
                      onChange={e => setWcNick(e.target.value)}
                      placeholder="Seu nome dentro de jogo no WarChaos"
                    />
                  </div>
                </div>

                <div className={styles.migrationWarning}>
                  <span className={styles.migrationWarningHeader}>Importante</span>
                  <span className={styles.migrationWarningText}>
                    A migração contempla exclusivamente os <strong>desafios</strong> catalogados no WarBanner. Certifique-se de que os dados acima estão corretos, pois após o envio eles não podem ser mudados.
                  </span>
                </div>

                <p className={styles.migrationModalText} style={{ fontWeight: 600, textAlign: 'center' }}>
                  Confirmar solicitação para a conta acima?
                </p>
              </div>

              <div className={styles.modalFooter}>
                <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  CANCELAR
                </button>
                <button 
                  className={styles.migrationModalBtn} 
                  onClick={handleConfirmMigration} 
                  disabled={isPending || !wcUser.trim() || !wcNick.trim()}
                >
                  {isPending ? 'PROCESSANDO...' : 'CONFIRMAR DADOS'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={styles.warchaosContainer}>
        <div className={styles.warchaosInfo}>
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: 'var(--orange)', letterSpacing: '0.05em' }}>
            O servidor privado de Warface feito pela comunidade!
          </h2>
          
          <div style={{ fontSize: '12px', color: 'var(--text2)', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p>
              O <strong>WarChaos</strong> é um <u>servidor privado</u>* de Warface feito pela comunidade, mantido pela comunidade e para a comunidade. Lá são mantidas vivas as memórias do game lançado em 2013 pelos próprios jogadores. Com o <a href="https://pc.wfclutch.com/pt/news/1239331.html" target="_blank" rel="noreferrer" style={{ color: 'var(--orange)', textDecoration: 'underline' }}>encerramento dos servidores oficiais</a> do Warface Clutch, o WarChaos surge como a principal alternativa para manter viva a nossa paixão.
            </p>
            <p>
              Com competitivo ativo, eventos regulares, streams constantes e apoio total de youtubers, o WarChaos é hoje o maior servidor privado do Warface em atividade.
            </p>
          </div>

          <div className={styles.warchaosFeatures}>
            <div className={styles.featureItem}><span className={styles.featureBullet}>•</span> Mecânicas inteiramente novas como o sistema de prestígio e Mercado de Armas Contrabandeadas no site.</div>
            <div className={styles.featureItem}><span className={styles.featureBullet}>•</span> Cash facilitado e com preço muito abaixo</div>
            <div className={styles.featureItem}><span className={styles.featureBullet}>•</span> Skins remasterizadas e itens exclusivos</div>
            <div className={styles.featureItem}><span className={styles.featureBullet}>•</span> Rotação rápida da loja e itens antes indisponíveis</div>
            <div className={styles.featureItem}><span className={styles.featureBullet}>•</span> Comunicação direta com Devs e Suporte ativo</div>
            <div className={styles.featureItem}><span className={styles.featureBullet}>•</span> Eventos aumentados e suporte da comunidade</div>
          </div>

          <p style={{ fontSize: '11px', color: 'var(--text2)', opacity: 0.8, lineHeight: '1.5' }}>
            Junte-se já a comunidade do WarChaos e venha fazer parte da fagulha que manterá o Warface vivo. Ao solicitar a migração aqui, seus dados extraídos serão enviados para validação pela equipe do WarChaos.
          </p>

          <div className={styles.warchaosLinks}>
            <a href="https://wf.warchaos.com.br/" target="_blank" rel="noreferrer" className={`${styles.warchaosLink} ${styles.linkSite}`}>
              <img src="https://www.google.com/s2/favicons?sz=32&domain=wf.warchaos.com.br" alt="" style={{ width: '16px', height: '16px' }} />
              SITE DO WARCHAOS
            </a>
            <a href="https://discord.gg/warchaos" target="_blank" rel="noreferrer" className={`${styles.warchaosLink} ${styles.linkDiscord}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-.032.027C.533 9.048-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.862-1.295 1.192-1.996a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.125-.094.252-.192.37-.29a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .077.01c.12.098.246.196.372.29a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.874.894.077.077 0 0 0-.041.107c.33.701.73 1.366 1.192 1.996a.077.077 0 0 0 .084.028 19.836 19.836 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.182 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
              </svg>
              DISCORD DO WARCHAOS
            </a>
            <a href="https://wf.warchaos.com.br/account/register?ref=1bc32fd6d8b0" target="_blank" rel="noreferrer" className={`${styles.warchaosLink} ${styles.linkRegister}`}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="16" y1="11" x2="22" y2="11"/>
              </svg>
              CRIAR CONTA NO WARCHAOS*
            </a>
          </div>

          <div style={{ fontSize: '9px', color: 'var(--text2)', opacity: 0.5, marginTop: '12px', fontStyle: 'italic', display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', width: '100%' }}>
            <p>
              * Ao criar sua conta através do botão acima, você estará usando o link de afiliado do desenvolvedor deste site.
            </p>
            <p>
              * O WarChaos é um servidor privado criado inteiramente pela comunidade de Warface, não possuindo relação alguma com o Warface oficial da MyGames. 
              A migração através deste site não garante que a totalidade dos seus dados serão migrados, tratando-se de um projeto independente da comunidade 
              sem vínculos oficiais com a Crytek, My.Games ou Warface Clutch.
            </p>
          </div>

          {!user?.warchaos_migrado && !user?.warchaos_solicitou && (
            <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text2)', fontWeight: 600, opacity: 0.8 }}>
                Já criou sua conta no WarChaos? Solicite a migração dos dados para o servidor privado 
                e mantenha viva a sua conta pós encerramento dos servidores oficiais do Warface.
              </p>
              
              <label className={styles.modalCheckbox}>
                <input type="checkbox" checked={hasAccount} onChange={e => setHasAccount(e.target.checked)} />
                <span>Já tenho conta no WarChaos e quero solicitar migração</span>
              </label>
            </div>
          )}

          <div className={styles.warchaosBtnWrapper}>
            {user?.warchaos_migrado ? (
              <div className={`${styles.warchaosStatus} ${styles.statusDone}`}>
                <span>✅</span> DADOS MIGRADOS
              </div>
            ) : user?.warchaos_solicitou ? (
              <div className={`${styles.warchaosStatus} ${styles.statusWaiting}`} style={{ flexDirection: 'column', gap: '4px', padding: '12px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>⏳</span> AGUARDANDO MIGRAÇÃO DOS DADOS
                </div>
                {user.warchaos_solicitou_at && (
                  <span style={{ fontSize: '10px', opacity: 0.7, fontWeight: 500 }}>
                    Solicitada dia {new Date(user.warchaos_solicitou_at).toLocaleDateString('pt-BR')} para {user.warchaos_nick} ({user.warchaos_user})
                  </span>
                )}
              </div>
            ) : (
              <button 
                className={styles.warchaosBtn} 
                onClick={() => setShowModal(true)}
                disabled={isPending || !hasAccount}
              >
                {isPending ? (
                  'SOLICITANDO...'
                ) : (
                  <>
                    SOLICITAR MIGRAÇÃO PARA O WARCHAOS
                    {!hasAccount && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '8px' }}>
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    )}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className={styles.warchaosVideo}>
           <iframe 
              src="https://www.youtube.com/embed/7etfQUoVza4" 
              title="WarChaos" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
           />
        </div>
      </div>
    </div>
  )
}

// ── Sub-nav do Warface ────────────────────────────────────────────────────────

const WARFACE_TABS: { id: WarfaceTab; label: string }[] = [
  { id: 'perfil', label: 'PERFIL' },
  { id: 'desafios', label: 'MEUS DESAFIOS' },
  { id: 'chamados', label: 'MEUS CHAMADOS' },
]

interface WarfaceSectionProps {
  activeTab: WarfaceTab
  setActiveTab: (t: WarfaceTab) => void
}

function WarfaceSection({ activeTab, setActiveTab }: WarfaceSectionProps) {
  const daysLeft = useMemo(() => {
    const closingDate = new Date('2026-05-27T03:00:00Z')
    const now = new Date()
    const diff = closingDate.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [])

  return (
    <div className={styles.subSection}>
      <div className={styles.warfaceAlert}>
        <span className={styles.warningBadge}>
          {daysLeft > 0 ? "Encerramento do Warface" : "Central de Suporte do WarBanner"}
        </span>
        <p className={styles.warfaceAlertText}>
          {daysLeft > 0 
            ? `O servidor do Warface (MYGAMES) será encerrado em ${daysLeft} dias. Preserve seus dados aqui.`
            : 'Os servidores oficiais foram encerrados. Esta é a Central de Suporte do WarBanner.'
          }
        </p>
        <button className={styles.guardarAlertBtn} onClick={() => setActiveTab(daysLeft > 0 ? 'guardar' : 'chamados')}>
          {daysLeft > 0 ? 'GUARDAR MEUS DADOS' : 'ABRIR CHAMADO'}
        </button>
      </div>

      <div className={styles.subTabBar}>
        {WARFACE_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.subTab} ${activeTab !== 'guardar' && activeTab === tab.id ? styles.subTabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        <motion.div
          key={activeTab}
          className={styles.tabAnimWrapper}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          {activeTab === 'guardar' && <GuardarDadosTab />}
          {activeTab === 'perfil' && <PerfilTab />}
          {activeTab === 'desafios' && <MeusDesafiosTab onGoToGuardar={() => setActiveTab('guardar')} />}
          {activeTab === 'chamados' && <MyTicketsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ── Pagina principal ──────────────────────────────────────────────────────────

const GAME_TABS: { id: GameTab; label: string }[] = [
  { id: 'warface', label: 'WARFACE' },
  { id: 'warchaos', label: 'WARCHAOS' },
]

export function GuardarWarfacePage() {
  const user = useAuthStore((s) => s.user)
  const panelBg = usePanelBg()

  const [gameTab, setGameTab] = useState<GameTab>('warface')
  const [activeTab, setActiveTab] = useState<WarfaceTab>('perfil')

  if (!user) return <Navigate to="/login" replace />

  return (
    <motion.main
      style={{ flex: 1, display: 'flex', flexDirection: 'column', background: panelBg, position: 'relative', zIndex: 1, borderRadius: 8, overflow: 'hidden', margin: '0 8px' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      {/* Abas de jogo (nivel 1) */}
      <div className={styles.gameTabBar}>
        {GAME_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.gameTab} ${gameTab === tab.id ? styles.gameTabActive : ''}`}
            onClick={() => setGameTab(tab.id)}
          >
            {tab.label}
            <div className={`${styles.gameTabUnderline} ${gameTab === tab.id ? styles.gameTabUnderlineActive : ''}`} />
          </button>
        ))}
      </div>

      {/* Conteudo do jogo selecionado */}
      <AnimatePresence mode="wait">
        <motion.div
          key={gameTab}
          className={styles.gameTabContent}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          {gameTab === 'warface' && (
            <WarfaceSection activeTab={activeTab} setActiveTab={setActiveTab} />
          )}
          {gameTab === 'warchaos' && (
            <WarchaosTab />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.main>
  )
}
