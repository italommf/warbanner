// Renders a banner from composition fields (no stored PNG needed).
// Used for display in HistoryCard / ComunidadePage and for download.

export interface BannerComposition {
  nick: string
  clan: string
  marca: string
  insignia: string
  fita: string
  patente: string
  rank_level?: string
  hide_empty?: boolean
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

  // Handle patent filename transformation if it's in 'patente_NN' format
  let patFile = banner.patente
  if (patFile && patFile.startsWith('patente_')) {
    const idx = patFile.split('_')[1]
    patFile = `Rank_${idx.padStart(2, '0')}.png`
  } else if (patFile && !patFile.endsWith('.png')) {
    // Fallback if it's just a number
    patFile = `Rank_${patFile.padStart(2, '0')}.png`
  }

  const [fitaImg, insigniaImg, marcaImg, patenteImg] = await Promise.all([
    banner.fita ? loadImage(`/media/desafios/fitas/${banner.fita}`) : Promise.resolve(null),
    banner.insignia ? loadImage(`/media/desafios/insignias/${banner.insignia}`) : Promise.resolve(null),
    banner.marca ? loadImage(`/media/desafios/marcas/${banner.marca}`) : Promise.resolve(null),
    patFile ? loadImage(`/media/site/patentes/${patFile}`) : Promise.resolve(null),
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
  if (marcaImg) {
    const mSize = 72 * 1.15 // 82.8
    ctx.drawImage(marcaImg, insigniaCX - mSize/2, insigniaCY - mSize/2, mSize, mSize)
  }

  const patX = insigniaCX + insW / 2 + 6
  const patSize = 39.6
  if (patenteImg) ctx.drawImage(patenteImg, patX, insigniaCY - patSize / 2, patSize, patSize)

  const textX = patX + (patenteImg ? patSize + 13 : 17)
  const clanText = banner.clan || ''

  // Apply Shadow & stroke settings
  ctx.shadowColor = '#000000'
  ctx.shadowBlur = 3.2
  ctx.shadowOffsetX = 1.2
  ctx.shadowOffsetY = 1.2
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.5

  const baseNick = banner.nick || 'Nickname'
  const rankPart = banner.rank_level ? ` [${banner.rank_level}]` : ''

  if (clanText || !banner.nick) {
    // Both exist or empty state
    ctx.font = '100 13.4px "archivo", sans-serif'
    ctx.fillStyle = clanText ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.2)'
    const cText = clanText || 'Nome do clã'
    ctx.strokeText(cText, textX, insigniaCY - 6)
    ctx.fillText(cText, textX, insigniaCY - 6)

    ctx.font = '400 15.6px "archivo", sans-serif'
    const baseColor = banner.nick ? '#ffffff' : 'rgba(255,255,255,0.2)'
    const rankColor = banner.nick ? '#ffe1b2' : 'rgba(255, 225, 178, 0.4)'
    const yPos = insigniaCY + 15

    // Draw Base Nick
    ctx.fillStyle = baseColor
    ctx.strokeText(baseNick, textX, yPos)
    ctx.fillText(baseNick, textX, yPos)

    if (rankPart) {
      const nickWidth = ctx.measureText(baseNick).width
      ctx.fillStyle = rankColor
      ctx.strokeText(rankPart, textX + nickWidth, yPos)
      ctx.fillText(rankPart, textX + nickWidth, yPos)
    }
  } else {
    // Only Nickname
    ctx.font = '400 15.6px "archivo", sans-serif'
    const yPos = insigniaCY + 5
    ctx.fillStyle = '#ffffff'
    ctx.strokeText(baseNick, textX, yPos)
    ctx.fillText(baseNick, textX, yPos)

    if (rankPart) {
      const nickWidth = ctx.measureText(baseNick).width
      ctx.fillStyle = '#ffe1b2'
      ctx.strokeText(rankPart, textX + nickWidth, yPos)
      ctx.fillText(rankPart, textX + nickWidth, yPos)
    }
  }

  return canvas.toDataURL('image/png')
}
