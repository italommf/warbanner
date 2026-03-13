import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'

type CanvasRef = RefObject<HTMLCanvasElement | null>
import { useBannerStore } from '@/store/bannerStore'
import { useItems } from '@/api/hooks'
import { useImageCache } from './useImageCache'
import type { ImgKey } from './useImageCache'
import type { Item } from '@/api/hooks'

export function useCanvasDraw(canvasRef: CanvasRef) {
  const nick      = useBannerStore((s) => s.nick)
  const clan      = useBannerStore((s) => s.clan)
  const marcas    = useBannerStore((s) => s.marcas)
  const insignias = useBannerStore((s) => s.insignias)
  const fitas     = useBannerStore((s) => s.fitas)
  const patentes  = useBannerStore((s) => s.patentes)
  const noFrame   = useBannerStore((s) => s.noFrame)
  const rankLevel = useBannerStore((s) => s.rankLevel)
  const { data }  = useItems()
  const imgCache  = useImageCache()

  // Stable ref to draw so effects don't stale-close over it
  const drawRef = useRef<() => void>(() => {})

  function draw() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width   // 520
    const H = canvas.height  // 110

    ctx.clearRect(0, 0, W, H)

    if (!noFrame) {
      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, W, H)
      bgGrad.addColorStop(0,   '#0e1e34')
      bgGrad.addColorStop(0.5, '#0a1525')
      bgGrad.addColorStop(1,   '#060e1c')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, W, H)

      ctx.strokeStyle = '#1e3048'
      ctx.lineWidth = 1
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1)
    }

    // Layer 1: FITA
    const fitaImg = imgCache.get('fitas')
    const fitaX = 60
    const fitaW = (W - 60) * 0.9
    const fitaH = (H - 6) * 0.9
    const fitaY = (H - fitaH) / 2
    if (fitaImg) {
      ctx.drawImage(fitaImg, fitaX, fitaY, fitaW, fitaH)
    }

    const insigniaCX = fitaX
    const insigniaCY = fitaY + fitaH / 2

    // Layer 2: INSÍGNIA
    const insigniaImg = imgCache.get('insignias')
    const insW = 84, insH = 84
    const insX = insigniaCX - insW / 2
    const insY = insigniaCY - insH / 2
    if (insigniaImg) {
      ctx.drawImage(insigniaImg, insX, insY, insW, insH)
    }

    // Layer 3: MARCA
    const marcaImg = imgCache.get('marcas')
    if (marcaImg) {
      const mSize = 72 * 1.15 // 82.8
      ctx.drawImage(marcaImg, insigniaCX - mSize/2, insigniaCY - mSize/2, mSize, mSize)
    }

    // Layer 4: PATENTE
    const patenteImg = imgCache.get('patentes')
    const patX = insigniaCX + insW / 2 + 6
    const patSize = 39.6
    const patY = insigniaCY - patSize / 2
    if (patenteImg) {
      ctx.drawImage(patenteImg, patX, patY, patSize, patSize)
    }

    // Texto
    const textX = patX + (patenteImg ? patSize + 13 : 17)
    const clanUpper = (clan || '').toUpperCase()

    ctx.shadowColor = '#000000'
    ctx.shadowBlur = 3.2
    ctx.shadowOffsetX = 1.2
    ctx.shadowOffsetY = 1.2
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1.5

    const baseNick = nick || 'Nickname'
    const rankPart = rankLevel ? ` [${rankLevel}]` : ''

    if (clanUpper || !nick) {
      // Both exist or empty state
      ctx.font = '300 14.4px Warface, "Arial Narrow", Arial'
      ctx.fillStyle = clanUpper ? '#ffffff' : 'rgba(255,255,255,0.2)'
      const cText = clanUpper || 'Nome do clã'
      ctx.strokeText(cText, textX, insigniaCY - 6)
      ctx.fillText(cText, textX, insigniaCY - 6)

      ctx.font = '15.6px Warface, "Arial Narrow", Arial'
      const baseColor = nick ? '#ffffff' : 'rgba(255,255,255,0.2)'
      const rankColor = nick ? '#ffe1b2' : 'rgba(255, 225, 178, 0.4)'
      const yPos = insigniaCY + 15

      // Draw Base Nick
      ctx.fillStyle = baseColor
      ctx.strokeText(baseNick, textX, yPos)
      ctx.fillText(baseNick, textX, yPos)

      // Draw Rank if available
      if (rankPart) {
        const nickWidth = ctx.measureText(baseNick).width
        ctx.fillStyle = rankColor
        ctx.strokeText(rankPart, textX + nickWidth, yPos)
        ctx.fillText(rankPart, textX + nickWidth, yPos)
      }
    } else {
      // Only Nickname (Centered vertically)
      ctx.font = '15.6px Warface, "Arial Narrow", Arial'
      const yPos = insigniaCY + 5

      // Draw Base Nick
      ctx.fillStyle = '#ffffff'
      ctx.strokeText(baseNick, textX, yPos)
      ctx.fillText(baseNick, textX, yPos)

      // Draw Rank if available
      if (rankPart) {
        const nickWidth = ctx.measureText(baseNick).width
        ctx.fillStyle = '#ffe1b2'
        ctx.strokeText(rankPart, textX + nickWidth, yPos)
        ctx.fillText(rankPart, textX + nickWidth, yPos)
      }
    }

    // Reset shadow & stroke
    ctx.shadowColor = 'transparent'
    ctx.shadowBlur = 0
    ctx.shadowOffsetX = 0
    ctx.shadowOffsetY = 0
    ctx.strokeStyle = 'transparent'
    ctx.lineWidth = 0

  }

  drawRef.current = draw

  function syncCategory(key: ImgKey, selected: string | null, items: Item[]) {
    if (!selected) {
      imgCache.clear(key, () => drawRef.current())
      return
    }
    const item = items.find((x) => x.filename === selected)
    if (item) imgCache.load(key, item.url, () => drawRef.current())
  }

  useEffect(() => {
    syncCategory('marcas', marcas.selected, data?.marcas ?? [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marcas.selected, data?.marcas])

  useEffect(() => {
    syncCategory('insignias', insignias.selected, data?.insignias ?? [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insignias.selected, data?.insignias])

  useEffect(() => {
    syncCategory('fitas', fitas.selected, data?.fitas ?? [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitas.selected, data?.fitas])

  useEffect(() => {
    syncCategory('patentes', patentes.selected, data?.patentes ?? [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patentes.selected, data?.patentes])

  useEffect(() => {
    draw()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nick, clan, noFrame, rankLevel])

  // Aguardar fonte antes do primeiro draw
  useEffect(() => {
    document.fonts.ready.then(() => drawRef.current())
  }, [])
}
