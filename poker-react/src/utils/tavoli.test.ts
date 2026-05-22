import { describe, it, expect } from 'vitest'
import { assegnaPostoIngresso, riequilibraTavoli, type Seduto } from './tavoli'

function mkSeduti(distribuzione: number[]): Seduto[] {
  let id = 1
  const result: Seduto[] = []
  distribuzione.forEach((n, tIdx) => {
    for (let p = 1; p <= n; p++) {
      result.push({ id_nome: id++, seat: { tavolo: tIdx + 1, posto: p } })
    }
  })
  return result
}

function contaPerTavolo(seduti: Seduto[]): number[] {
  const map = new Map<number, number>()
  for (const s of seduti) {
    if (s.seat) {
      map.set(s.seat.tavolo, (map.get(s.seat.tavolo) ?? 0) + 1)
    }
  }
  return [...map.values()].sort((a, b) => b - a)
}

function contaSpostamenti(prima: Seduto[], dopo: Seduto[]): number {
  const mapPrima = new Map(prima.filter(s => s.seat).map(s => [s.id_nome, s.seat!.tavolo]))
  let spostati = 0
  for (const s of dopo) {
    if (!s.seat) continue
    const tavoloPrima = mapPrima.get(s.id_nome)
    if (tavoloPrima !== undefined && tavoloPrima !== s.seat.tavolo) spostati++
  }
  return spostati
}

describe('riequilibraTavoli', () => {
  it('test 1 — 10 da zero → [5,5]', () => {
    const input: Seduto[] = Array.from({ length: 10 }, (_, i) => ({ id_nome: i + 1, seat: null }))
    const out = riequilibraTavoli(input)
    expect(contaPerTavolo(out)).toEqual([5, 5])
  })

  it('test 2 — 23 da zero → [8,8,7]', () => {
    const input: Seduto[] = Array.from({ length: 23 }, (_, i) => ({ id_nome: i + 1, seat: null }))
    const out = riequilibraTavoli(input)
    expect(contaPerTavolo(out)).toEqual([8, 8, 7])
  })

  it('test 3 — 18 da zero → [9,9]', () => {
    const input: Seduto[] = Array.from({ length: 18 }, (_, i) => ({ id_nome: i + 1, seat: null }))
    const out = riequilibraTavoli(input)
    expect(contaPerTavolo(out)).toEqual([9, 9])
  })

  it('test 4 — 19 da zero → [7,6,6]', () => {
    const input: Seduto[] = Array.from({ length: 19 }, (_, i) => ({ id_nome: i + 1, seat: null }))
    const out = riequilibraTavoli(input)
    expect(contaPerTavolo(out)).toEqual([7, 6, 6])
  })

  it('test 6 — 8/8/3 (n=19) → nessun tavolo ≤3, esattamente 1 spostamento', () => {
    const input = mkSeduti([8, 8, 3])
    const out = riequilibraTavoli(input)
    const dist = contaPerTavolo(out)
    expect(dist.every(c => c > 3)).toBe(true)
    expect(contaSpostamenti(input, out)).toBe(1)
  })

  it('test 7 — 4/4/4 (n=12) → [6,6], spostati ≤40% (≤4)', () => {
    const input = mkSeduti([4, 4, 4])
    const out = riequilibraTavoli(input)
    expect(contaPerTavolo(out)).toEqual([6, 6])
    expect(contaSpostamenti(input, out)).toBeLessThanOrEqual(4)
  })

  it('test 8 — 9/9/2 (n=20) → 3 tavoli [7,7,6], spostamenti minimi', () => {
    const input = mkSeduti([9, 9, 2])
    const out = riequilibraTavoli(input)
    const dist = contaPerTavolo(out)
    expect(dist).toEqual([7, 7, 6])
    // il tavolo da 2 viene smistato: 2 spostamenti minimi
    expect(contaSpostamenti(input, out)).toBeLessThanOrEqual(4)
  })
})

describe('assegnaPostoIngresso', () => {
  it('test 5 — 9 seduti al tavolo 1 + ingresso → [9,1], 0 spostamenti', () => {
    const input = mkSeduti([9])
    const out = assegnaPostoIngresso(input, 100)
    expect(contaPerTavolo(out)).toEqual([9, 1])
    expect(contaSpostamenti(input, out)).toBe(0)
  })
})
