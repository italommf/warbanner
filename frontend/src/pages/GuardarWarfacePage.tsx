import { useState, useRef, useCallback, useEffect } from 'react'
import type { DragEvent, ChangeEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navigate } from 'react-router'
import { useAuthStore } from '@/store/authStore'
import { useBannerStore } from '@/store/bannerStore'
import { VIDEO_EXT } from '@/App'
import { useMarcas, useInsignias, useFitas, usePatentes, useItemsLoading, useUploadImages, useUserStats } from '@/api/hooks'
import type { Item } from '@/api/hooks'
import { ListModal } from '@/components/lists/ListModal'
import { ListColumn } from '@/components/lists/ListColumn'
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
type WarfaceTab = 'guardar' | 'perfil' | 'desafios'

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

  const { mutate: uploadImages, isPending, isSuccess, reset: resetUpload } = useUploadImages()

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

  const handleUpload = () => {
    const pvpFiles = pvpImage ? [pvpImage.file] : []
    const pveFiles = pveImage ? [pveImage.file] : []
    const desafioFiles = images.map(img => img.file)

    if (isPending) return

    // Upload PvP
    if (pvpFiles.length > 0) {
      uploadImages({ files: pvpFiles, type: 'pvp' })
    }
    // Upload PvE
    if (pveFiles.length > 0) {
      uploadImages({ files: pveFiles, type: 'pve' })
    }
    // Upload Desafios
    if (desafioFiles.length > 0) {
      uploadImages({ files: desafioFiles, type: 'desafios' })
    }

    if (pvpFiles.length > 0 || pveFiles.length > 0 || desafioFiles.length > 0) {
      setImages([])
      setPvpImage(null)
      setPveImage(null)
    }
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
              {stats.winRate === null ? '—' : `${stats.winRate.toFixed(2)}%`}
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
                  <td>{cls.winRate === null ? '—' : `${cls.winRate.toFixed(1)}%`}</td>
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

function loadSlots(): AchSlot[] {
  const base = buildSlots()
  try {
    const raw = localStorage.getItem(FAV_STORAGE_KEY)
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

function FavoriteAchievements() {
  const marcas = useMarcas()
  const insignias = useInsignias()
  const fitas = useFitas()
  const [slots, setSlots] = useState<AchSlot[]>(loadSlots)
  const [pickerOpen, setPickerOpen] = useState<number | null>(null)

  useEffect(() => {
    localStorage.setItem(FAV_STORAGE_KEY, JSON.stringify(slots.map((s) => s.item)))
  }, [slots])

  function getItems(type: AchSlotType): Item[] {
    if (type === 'marca') return marcas
    if (type === 'insignia') return insignias
    return fitas
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

  const centerIdx = Math.min(Math.max(userRankIdx, 0), patentes.length - 1)

  const slots: RankSlot[] = Array.from({ length: VISIBLE_COUNT }, (_, i) => {
    const absIdx = centerIdx - HALF + i
    const patente = absIdx >= 0 && absIdx < patentes.length ? patentes[absIdx] : null
    let kind: SlotKind
    if (absIdx < 0 || absIdx >= patentes.length) kind = 'empty'
    else if (absIdx < centerIdx) kind = 'past'
    else if (absIdx === centerIdx) kind = 'current'
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
          Rank {centerIdx + 1} · {patentes[centerIdx]?.name ?? ''}
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
      <FavoriteAchievements />
    </div>
  )
}

// ── Aba: Meus Desafios ────────────────────────────────────────────────────────

function MeusDesafiosTab({ onGoToGuardar: _ }: { onGoToGuardar: () => void }) {
  const isLoading = useItemsLoading()
  return (
    <div className={styles.desafiosTab}>
      <div className={styles.desafiosNote}>
        <span>As conquistas abaixo serão preenchidas após processar suas capturas de tela.</span>
      </div>
      <div className={styles.desafiosLists}>
        <ListColumn category="marcas" items={[]} columnIndex={0} isLoading={isLoading} />
        <ListColumn category="insignias" items={[]} columnIndex={1} isLoading={isLoading} />
        <ListColumn category="fitas" items={[]} columnIndex={2} isLoading={isLoading} />
      </div>
    </div>
  )
}

// ── Aba: Warchaos (placeholder) ───────────────────────────────────────────────

function WarchaosTab() {
  return (
    <div className={styles.tabContent}>
      <div className={styles.sectionHeader}>
        <div>
          <h3 className={styles.sectionTitle}>WARCHAOS</h3>
          <p className={styles.sectionDesc}>Salve seus dados do Warchaos antes do encerramento.</p>
        </div>
      </div>
      <div className={styles.comingSoonBox} style={{ marginTop: 0 }}>
        <span className={styles.comingSoonLabel}>EM BREVE</span>
        <p className={styles.comingSoonText}>
          Suporte ao Warchaos esta sendo preparado. Em breve voce podera importar
          capturas de tela da sua conta neste jogo tambem.
        </p>
      </div>
    </div>
  )
}

// ── Sub-nav do Warface ────────────────────────────────────────────────────────

const WARFACE_TABS: { id: WarfaceTab; label: string }[] = [
  { id: 'perfil', label: 'PERFIL' },
  { id: 'desafios', label: 'MEUS DESAFIOS' },
]

function WarfaceSection() {
  const [activeTab, setActiveTab] = useState<WarfaceTab>('perfil')

  return (
    <div className={styles.subSection}>
      <div className={styles.warfaceAlert}>
        <span className={styles.warningBadge}>ENCERRAMENTO DOS SERVIDORES</span>
        <p className={styles.warfaceAlertText}>
          Os servidores estao encerrando. Preserve suas conquistas importando
          capturas de tela da sua conta — seus dados ficarao salvos aqui para sempre.
        </p>
        <button className={styles.guardarAlertBtn} onClick={() => setActiveTab('guardar')}>
          GUARDAR MEUS DADOS
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
      <AnimatePresence>
        <motion.div
          key={gameTab}
          className={styles.gameTabContent}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          {gameTab === 'warface' && <WarfaceSection />}
          {gameTab === 'warchaos' && <WarchaosTab />}
        </motion.div>
      </AnimatePresence>
    </motion.main>
  )
}
