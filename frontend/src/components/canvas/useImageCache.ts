import { useRef, useCallback } from 'react'

export type ImgKey = 'marcas' | 'insignias' | 'fitas' | 'patentes'

export function useImageCache() {
  const cache = useRef<Partial<Record<ImgKey, HTMLImageElement>>>({})

  const load = useCallback(
    (key: ImgKey, url: string, onReady: () => void) => {
      const img = new Image()
      img.onload  = () => { cache.current[key] = img; onReady() }
      img.onerror = () => { delete cache.current[key]; onReady() }
      img.src = url
    },
    []
  )

  const clear = useCallback((key: ImgKey, onReady: () => void) => {
    delete cache.current[key]
    onReady()
  }, [])

  const get = useCallback((key: ImgKey) => cache.current[key], [])

  return { load, clear, get }
}
