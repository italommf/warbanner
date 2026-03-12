import { useEffect, useState } from 'react'
import { buildBannerDataUrl } from './buildBannerDataUrl'
import type { BannerComposition } from './buildBannerDataUrl'

interface Props {
  banner:    BannerComposition
  withFrame?: boolean
  alt?:      string
  className?: string
  onClick?:  () => void
}

export function BannerImage({ banner, withFrame = true, alt, className, onClick }: Props) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    buildBannerDataUrl(banner, withFrame).then((url) => {
      if (!cancelled) setSrc(url)
    })
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [banner.fita, banner.insignia, banner.marca, banner.patente, banner.nick, banner.clan, withFrame])

  if (!src) {
    return <div className={className} style={{ background: 'var(--bg3)', aspectRatio: '520 / 110' }} />
  }

  return (
    <img
      src={src}
      alt={alt ?? `Banner de ${banner.nick}`}
      className={className}
      onClick={onClick}
    />
  )
}
