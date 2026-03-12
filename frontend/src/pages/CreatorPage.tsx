import { useMemo } from 'react'
import { BannerCanvas } from '@/components/canvas/BannerCanvas'
import { PatenteSelector } from '@/components/patente/PatenteSelector'
import { FilterBar, ColorFilterBar, SearchBar } from '@/components/filter/FilterBar'
import { ListColumn } from '@/components/lists/ListColumn'
import { useMarcas, useInsignias, useFitas, useItemsLoading } from '@/api/hooks'
import type { Item } from '@/api/hooks'
import { useBannerStore } from '@/store/bannerStore'
import type { MainFilter, ArmasFilter, ColorFilter } from '@/store/bannerStore'
import { VIDEO_EXT } from '@/App'
import { applyFilters } from '@/utils/challenges'
import styles from './CreatorPage.module.css'

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
  const bgImage = useBannerStore((s) => s.bgImage)
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
  const rawMarcas = useMarcas()
  const rawInsignias = useInsignias()
  const rawFitas = useFitas()
  const isLoading = useItemsLoading()

  const mainFilter = useBannerStore((s) => s.mainFilter)
  const armasFilter = useBannerStore((s) => s.armasFilter)
  const colorFilter = useBannerStore((s) => s.colorFilter)
  const searchTerm = useBannerStore((s) => s.searchTerm)
  const hideEmpty = useBannerStore((s) => s.hideEmpty)
  const panelBg = usePanelBg()

  const marcas = useMemo(() => applyFilters(rawMarcas, 'marcas', mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty),
    [rawMarcas, mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty])

  const insignias = useMemo(() => applyFilters(rawInsignias, 'insignias', mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty),
    [rawInsignias, mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty])

  const fitas = useMemo(() => applyFilters(rawFitas, 'fitas', mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty),
    [rawFitas, mainFilter, armasFilter, colorFilter, searchTerm, hideEmpty])

  return (
    <main className={styles.main} style={panelBg ? { background: panelBg } : undefined}>
      <BannerCanvas />

      <div className={styles.controlsRow}>
        <PatenteSelector />
        <FilterBar />
        <ColorFilterBar />
        <SearchBar />
      </div>

      <div className={styles.lists}>
        <ListColumn category="marcas" items={marcas} columnIndex={0} isLoading={isLoading} />
        <ListColumn category="insignias" items={insignias} columnIndex={1} isLoading={isLoading} />
        <ListColumn category="fitas" items={fitas} columnIndex={2} isLoading={isLoading} />
      </div>
    </main>
  )
}
