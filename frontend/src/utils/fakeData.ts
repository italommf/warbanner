/**
 * Dados fictícios para preencher a UI antes do OCR ser implementado.
 * Todos os valores são gerados aleatoriamente com seed fixa para consistência.
 */
import { faker } from '@faker-js/faker'

faker.seed(42) // seed fixa: mesmos dados a cada reload

// ── Tipos re-exportados para uso externo ──────────────────────────────────────

export const CLASS_NAMES  = ['Fuzileiro', 'Médico', 'Engenheiro', 'Franco-atirador'] as const
export const CLASS_COLORS = ['#4dd0c4', '#4caf82', '#b8a86a', '#c8d4e0']             as const

export interface FakeClassStat {
  name:    string
  color:   string
  em:      number
  winRate: number
  hours:   number
}

export interface FakeModeStats {
  em:            number
  winRate:       number
  matches:       number
  missionEasy:   number
  missionMedium: number
  missionHard:   number
  hours:         number
  bestRankRp:    number
  bestRankName:  string
  classes:       FakeClassStat[]
}

export interface FakeChallenge {
  id:        string
  name:      string
  category:  string
  current:   number
  total:     number
  completed: boolean
}

// ── Geradores ─────────────────────────────────────────────────────────────────

const CHALLENGE_NAMES = [
  'Eliminar inimigos com fuzil de assalto',
  'Completar missões cooperativas',
  'Derrotar o chefe Anubis',
  'Sobreviver 10 rodadas no modo Batalha Campal',
  'Usar kit médico em aliados',
  'Eliminar 500 infectados',
  'Completar operação especial sem morrer',
  'Usar granada em 50 inimigos',
  'Vencer 100 partidas JxA',
  'Usar sniper para eliminar 200 inimigos',
  'Completar missão no modo Difícil',
  'Eliminar 1000 inimigos com pistola',
  'Reparar equipamentos 50 vezes',
  'Derrotar o chefe Priboy',
  'Jogar 200 partidas no modo Demolição',
  'Eliminar inimigos com faca corpo a corpo',
  'Completar todas as missões de uma temporada',
  'Vencer 50 partidas consecutivas',
  'Usar desfibrilador para reviver aliados',
  'Completar desafio diário 30 dias seguidos',
]

const CHALLENGE_CATEGORIES = [
  'Combate', 'Cooperativo', 'Chefes', 'Sobrevivência',
  'Suporte', 'Eliminação', 'Especial', 'Semanal',
]

function fakeClasses(totalHours: number): FakeClassStat[] {
  const weights = CLASS_NAMES.map(() => faker.number.float({ min: 0.05, max: 1 }))
  const sum = weights.reduce((a, b) => a + b, 0)
  return CLASS_NAMES.map((name, i) => ({
    name,
    color:   CLASS_COLORS[i],
    em:      faker.number.float({ min: 0.4, max: 6.0, fractionDigits: 2 }),
    winRate: faker.number.float({ min: 20,  max: 80,  fractionDigits: 1 }),
    hours:   Math.round((weights[i] / sum) * totalHours),
  }))
}

const PVP_RANK_TIERS = ['Bronze', 'Prata', 'Ouro', 'Platina', 'Diamante']
const PVP_RANK_DIVS  = ['I', 'II', 'III']

export function fakeModeStats(): FakeModeStats {
  const hours = faker.number.int({ min: 200, max: 1800 })
  const tier  = faker.helpers.arrayElement(PVP_RANK_TIERS)
  const div   = faker.helpers.arrayElement(PVP_RANK_DIVS)
  return {
    em:            faker.number.float({ min: 0.8, max: 5.5,  fractionDigits: 2 }),
    winRate:       faker.number.float({ min: 30,  max: 75,   fractionDigits: 2 }),
    matches:       faker.number.int({  min: 500,  max: 8000             }),
    missionEasy:   faker.number.int({  min: 200,  max: 2000             }),
    missionMedium: faker.number.int({  min: 100,  max: 1200             }),
    missionHard:   faker.number.int({  min: 20,   max: 600              }),
    hours,
    bestRankRp:   faker.number.int({ min: 0, max: 99 }),
    bestRankName: `${tier.toUpperCase()} ${div}`,
    classes: fakeClasses(hours),
  }
}

export function fakeChallenges(count = 24): FakeChallenge[] {
  return Array.from({ length: count }, (_, i) => {
    const total     = faker.helpers.arrayElement([100, 250, 500, 1000, 2000, 5000])
    const completed = faker.datatype.boolean(0.35)
    const current   = completed
      ? total
      : faker.number.int({ min: 0, max: total - 1 })
    return {
      id:        String(i),
      name:      faker.helpers.arrayElement(CHALLENGE_NAMES),
      category:  faker.helpers.arrayElement(CHALLENGE_CATEGORIES),
      current,
      total,
      completed,
    }
  })
}

// ── Instâncias pré-geradas (geradas uma única vez no import) ──────────────────

export const FAKE_PVP       = fakeModeStats()
export const FAKE_PVE       = fakeModeStats()
export const FAKE_CHALLENGES = fakeChallenges()
