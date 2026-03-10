import { motion } from 'framer-motion'
import { HistoryGrid } from '@/components/history/HistoryGrid'
import { useBannerStore } from '@/store/bannerStore'
import { VIDEO_EXT } from '@/App'

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
  if (VIDEO_EXT.test(bgImage)) {
    return meshGradient('8,13,21', '8,13,21', '8,13,21', '8,13,21', 0.50)
  }
  if (bgColors) {
    const { tl, tr, bl, br } = bgColors
    return meshGradient(tl, tr, bl, br)
  }
  return 'rgba(8, 13, 21, 0.80)'
}

export function HistoricoPage() {
  const panelBg = usePanelBg()
  return (
    <motion.main
      style={{ flex: 1, background: panelBg, position: 'relative', zIndex: 1, borderRadius: 8, overflowY: 'auto' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.1 }}
    >
      <HistoryGrid />
    </motion.main>
  )
}
