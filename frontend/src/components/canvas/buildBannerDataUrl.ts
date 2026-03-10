// Renders a banner from composition fields (no stored PNG needed).
// Used for display in HistoryCard / ComunidadePage and for download.

export interface BannerComposition {
  nick: string
  clan: string
  marca: string
  insignia: string
  fita: string
  patente: string
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

export async function buildBannerDataUrl(
  banner: BannerComposition,
  withFrame = true,
): Promise<string> {
  const W = 520, H = 110

  const [fitaImg, insigniaImg, marcaImg, patenteImg] = await Promise.all([
    banner.fita ? loadImage(`/media/fitas/${banner.fita}`) : Promise.resolve(null),
    banner.insignia ? loadImage(`/media/insignias/${banner.insignia}`) : Promise.resolve(null),
    banner.marca ? loadImage(`/media/marcas/${banner.marca}`) : Promise.resolve(null),
    banner.patente ? loadImage(`/media/site/patentes/${banner.patente}`) : Promise.resolve(null),
  ])
  await document.fonts.ready

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  if (withFrame) {
    const bgGrad = ctx.createLinearGradient(0, 0, W, H)
    bgGrad.addColorStop(0, '#0e1e34')
    bgGrad.addColorStop(0.5, '#0a1525')
    bgGrad.addColorStop(1, '#060e1c')
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = '#1e3048'
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, W - 1, H - 1)
  }

  const fitaX = 60
  const fitaW = (W - 60) * 0.9
  const fitaH = (H - 6) * 0.9
  const fitaY = (H - fitaH) / 2
  if (fitaImg) ctx.drawImage(fitaImg, fitaX, fitaY, fitaW, fitaH)

  const insigniaCX = fitaX
  const insigniaCY = fitaY + fitaH / 2
  const insW = 84
  if (insigniaImg) ctx.drawImage(insigniaImg, insigniaCX - insW / 2, insigniaCY - insW / 2, insW, insW)
  if (marcaImg) ctx.drawImage(marcaImg, insigniaCX - 36, insigniaCY - 36, 72, 72)

  const patX = insigniaCX + insW / 2 + 6
  const patSize = 44
  if (patenteImg) ctx.drawImage(patenteImg, patX, insigniaCY - patSize / 2, patSize, patSize)

  const textX = patX + (patenteImg ? patSize + 8 : 12)
  const clanUpper = (banner.clan || '').toUpperCase()
  ctx.font = '300 12px Warface, "Arial Narrow", Arial'
  ctx.fillStyle = '#9aafc0'
  if (clanUpper) ctx.fillText(clanUpper, textX, insigniaCY - 4)
  ctx.font = '13px Warface, "Arial Narrow", Arial'
  ctx.fillStyle = '#c8d4e0'
  if (banner.nick) ctx.fillText(banner.nick, textX, insigniaCY + 13)

  return canvas.toDataURL('image/png')
}
