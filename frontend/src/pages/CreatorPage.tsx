import { useMemo } from 'react'
import { BannerCanvas } from '@/components/canvas/BannerCanvas'
import { PatenteSelector } from '@/components/patente/PatenteSelector'
import { FilterBar, ColorFilterBar } from '@/components/filter/FilterBar'
import { ListColumn } from '@/components/lists/ListColumn'
import { useMarcas, useInsignias, useFitas, useItemsLoading } from '@/api/hooks'
import type { Item } from '@/api/hooks'
import { useBannerStore } from '@/store/bannerStore'
import type { FilterCategory, MainFilter, ArmasFilter, ColorFilter } from '@/store/bannerStore'
import { VIDEO_EXT } from '@/App'
import styles from './CreatorPage.module.css'

// Palavras-chave para sub-filtro de armas por tier de eliminações
const ARMAS_KW: Record<string, string[]> = {
  '10k':  ['10000', '10k', '_10_'],
  '5k':   ['5000', '5k', '_5_'],
  '2.5k': ['2500', '25k', '2500'],
  'ouro': ['gold', 'ouro'],
}

function applyFilters(
  items: Item[],
  category: FilterCategory,
  applyTo: FilterCategory[],
  mainFilter: MainFilter,
  armasFilter: ArmasFilter,
  colorFilter: ColorFilter,
): Item[] {
  if (!applyTo.includes(category)) return items

  let result = items

  if (mainFilter === 'armas') {
    result = result.filter((i) => /strip|stripe/i.test(i.filename))
    if (armasFilter !== 'todos') {
      const kws = ARMAS_KW[armasFilter] ?? []
      result = result.filter((i) => kws.some((kw) => i.filename.toLowerCase().includes(kw)))
    }
  } else if (mainFilter === 'pvp') {
    result = result.filter((i) => /pvp/i.test(i.filename))
  } else if (mainFilter === 'pve') {
    result = result.filter((i) => /pve/i.test(i.filename))
  }

  if (colorFilter !== 'todos') {
    result = result.filter((i) => (i.color ?? 'outro') === colorFilter)
  }

  return result
}

function meshGradient(tl: string, tr: string, bl: string, br: string, a = 0.70): string {
  return [
    `radial-gradient(ellipse at   0%   0%, rgba(${tl},${a}) 0%, transparent 70%)`,
    `radial-gradient(ellipse at 100%   0%, rgba(${tr},${a}) 0%, transparent 70%)`,
    `radial-gradient(ellipse at   0% 100%, rgba(${bl},${a}) 0%, transparent 70%)`,
    `radial-gradient(ellipse at 100% 100%, rgba(${br},${a}) 0%, transparent 70%)`,
    'rgba(8,13,21,0.82)',
  ].join(', ')
}

function usePanelBg(): string | undefined {
  const bgImage  = useBannerStore((s) => s.bgImage)
  const bgColors = useBannerStore((s) => s.bgColors)
  if (!bgImage) return undefined
  if (VIDEO_EXT.test(bgImage)) {
    return meshGradient('8,13,21', '8,13,21', '8,13,21', '8,13,21', 0.50)
  }
  if (bgColors) {
    const { tl, tr, bl, br } = bgColors
    return meshGradient(tl, tr, bl, br)
  }
  return 'rgba(8, 13, 21, 0.80)'
}

export function CreatorPage() {
  const rawMarcas    = useMarcas()
  const rawInsignias = useInsignias()
  const rawFitas     = useFitas()
  const isLoading    = useItemsLoading()

  const applyTo     = useBannerStore((s) => s.applyTo)
  const mainFilter  = useBannerStore((s) => s.mainFilter)
  const armasFilter = useBannerStore((s) => s.armasFilter)
  const colorFilter = useBannerStore((s) => s.colorFilter)
  const panelBg     = usePanelBg()

  const marcas    = useMemo(() => applyFilters(rawMarcas,    'marcas',    applyTo, mainFilter, armasFilter, colorFilter), [rawMarcas,    applyTo, mainFilter, armasFilter, colorFilter])
  const insignias = useMemo(() => applyFilters(rawInsignias, 'insignias', applyTo, mainFilter, armasFilter, colorFilter), [rawInsignias, applyTo, mainFilter, armasFilter, colorFilter])
  const fitas     = useMemo(() => applyFilters(rawFitas,     'fitas',     applyTo, mainFilter, armasFilter, colorFilter), [rawFitas,     applyTo, mainFilter, armasFilter, colorFilter])

  return (
    <main className={styles.main} style={panelBg ? { background: panelBg } : undefined}>
      <BannerCanvas />

      <div className={styles.controlsRow}>
        <PatenteSelector />
        <FilterBar />
        <ColorFilterBar />
      </div>

      <div className={styles.lists}>
        <ListColumn category="marcas"    items={marcas}    columnIndex={0} isLoading={isLoading} />
        <ListColumn category="insignias" items={insignias} columnIndex={1} isLoading={isLoading} />
        <ListColumn category="fitas"     items={fitas}     columnIndex={2} isLoading={isLoading} />
      </div>
    </main>
  )
}
