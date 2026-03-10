import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useMusicStore } from '@/store/musicStore'
import type { MusicTrack } from '@/store/musicStore'

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null)

  const { data: tracks } = useQuery<MusicTrack[]>({
    queryKey: ['music'],
    queryFn: () => fetch('/api/music/').then((r) => r.json()),
    staleTime: Infinity,
    retry: false,
  })

  const { queue, currentIndex, isPlaying, isMuted, playKey, volume, loadAndPlay, next } = useMusicStore()
  const currentTrack = queue[currentIndex]

  // Carrega faixas e inicia autoplay
  useEffect(() => {
    if (tracks && tracks.length && !queue.length) {
      loadAndPlay(tracks)
    }
  }, [tracks, queue.length, loadAndPlay])

  // Troca de faixa
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    audio.currentTime = 0
    audio.muted = isMuted
    audio.volume = volume
    if (isPlaying) {
      audio.play().catch(() => {
        const onInteract = () => {
          if (isPlaying) audio.play().catch(() => { })
        }
        document.addEventListener('click', onInteract, { once: true })
        document.addEventListener('keydown', onInteract, { once: true })
      })
    }
  }, [playKey])

  // Play / Pause
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !currentTrack) return
    if (isPlaying) audio.play().catch(() => { })
    else audio.pause()
  }, [isPlaying, currentTrack])

  // Volume
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [volume])

  // Mute
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = isMuted
    }
  }, [isMuted])

  if (!queue.length) return null

  return (
    <audio ref={audioRef} src={currentTrack?.url ?? ''} onEnded={next} preload="auto" />
  )
}
