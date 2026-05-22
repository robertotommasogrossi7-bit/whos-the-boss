export interface Posto  { tavolo: number; posto: number }
export interface Seduto { id_nome: number; seat: Posto | null }

export function tavoliNecessari(n: number): number {
  return Math.max(1, Math.ceil(n / 9))
}

// ─── assegnazione ingresso (lazy, §5) ────────────────────────────────────────

export function assegnaPostoIngresso(seduti: Seduto[], idNuovo: number): Seduto[] {
  const others = seduti.filter(s => s.id_nome !== idNuovo)
  const nDopoIngresso = others.filter(s => s.seat !== null).length + 1
  const numTavoli = tavoliNecessari(nDopoIngresso)

  const countPerTavolo = new Map<number, number>()
  const postiUsati = new Map<number, Set<number>>()
  for (const s of others) {
    if (s.seat) {
      countPerTavolo.set(s.seat.tavolo, (countPerTavolo.get(s.seat.tavolo) ?? 0) + 1)
      if (!postiUsati.has(s.seat.tavolo)) postiUsati.set(s.seat.tavolo, new Set())
      postiUsati.get(s.seat.tavolo)!.add(s.seat.posto)
    }
  }
  for (let t = 1; t <= numTavoli; t++) {
    if (!countPerTavolo.has(t)) { countPerTavolo.set(t, 0); postiUsati.set(t, new Set()) }
  }

  let targetTavolo = 1, minCount = Infinity
  for (const [t, cnt] of countPerTavolo) {
    if (t <= numTavoli && cnt < minCount) { minCount = cnt; targetTavolo = t }
  }

  const usati = postiUsati.get(targetTavolo)!
  let posto = 1
  while (usati.has(posto)) posto++

  return [...others, { id_nome: idNuovo, seat: { tavolo: targetTavolo, posto } }]
}

// ─── riequilibrio ottimale (§4, §7–§10) ──────────────────────────────────────

export function riequilibraTavoli(seduti: Seduto[]): Seduto[] {
  const n = seduti.length
  if (n === 0) return []

  const numTavoli = tavoliNecessari(n)
  const base = Math.floor(n / numTavoli)
  const extra = n % numTavoli
  // targetSizes[0] = largest slot, sorted desc
  const targetSizes = Array.from({ length: numTavoli }, (_, i) => base + (i < extra ? 1 : 0))

  const groups = new Map<number, number[]>()
  const pool: number[] = []
  for (const s of seduti) {
    if (s.seat) {
      if (!groups.has(s.seat.tavolo)) groups.set(s.seat.tavolo, [])
      groups.get(s.seat.tavolo)!.push(s.id_nome)
    } else {
      pool.push(s.id_nome)
    }
  }
  pool.sort((a, b) => a - b)

  // Tutti senza seat: assegna da zero
  if (groups.size === 0) {
    const allIds = seduti.map(s => s.id_nome).sort((a, b) => a - b)
    return assignFromScratch(allIds, numTavoli, targetSizes)
  }

  // Troppi tavoli: accorpa (§9)
  if (numTavoli < groups.size) {
    return breakTables(groups, pool, numTavoli, targetSizes)
  }

  const sizes = [...groups.values()].map(v => v.length)
  const hasEmergency = groups.size > 1 && sizes.some(s => s <= 2)
  const hasCritical  = groups.size > 1 && sizes.some(s => s === 3)

  // Pool di non seduti oppure tavolo ≤2: riequilibra completamente
  if (pool.length > 0 || hasEmergency) {
    return fullRebalance(groups, pool, numTavoli, targetSizes)
  }

  // Tavolo da 3: sposta 1 solo giocatore (§8 esempio)
  if (hasCritical) {
    return moveOneToCritical(groups)
  }

  // Nessuna violazione: tieni le assegnazioni attuali
  return buildResult(groups)
}

// ─── helpers interni ──────────────────────────────────────────────────────────

function assignFromScratch(ids: number[], numTavoli: number, targetSizes: number[]): Seduto[] {
  const result: Seduto[] = []
  let idx = 0
  for (let t = 0; t < numTavoli; t++) {
    for (let p = 0; p < targetSizes[t]!; p++) {
      result.push({ id_nome: ids[idx++]!, seat: { tavolo: t + 1, posto: p + 1 } })
    }
  }
  return result
}

function fullRebalance(
  groups: Map<number, number[]>,
  pool: number[],
  numTavoli: number,
  targetSizes: number[],
): Seduto[] {
  // Ordina gruppi per dimensione desc (tavolo asc per parità)
  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0])
  const extraPool = [...pool]

  const slots: { tNum: number; players: number[]; target: number }[] = []
  for (let i = 0; i < numTavoli; i++) {
    const target = targetSizes[i]!
    if (i < sorted.length) {
      const [tNum, players] = sorted[i]!
      slots.push({ tNum, players: players.slice(0, target), target })
      extraPool.push(...players.slice(target))
    } else {
      // Serve un tavolo nuovo (caso teorico con pool di non-seduti)
      const used = new Set([...groups.keys()])
      let newNum = 1
      while (used.has(newNum)) newNum++
      slots.push({ tNum: newNum, players: [], target: target })
    }
  }

  extraPool.sort((a, b) => a - b)
  let pi = 0
  for (const slot of slots) {
    while (slot.players.length < slot.target && pi < extraPool.length) {
      slot.players.push(extraPool[pi++]!)
    }
  }

  return buildSlots(slots)
}

function breakTables(
  groups: Map<number, number[]>,
  pool: number[],
  numTavoli: number,
  targetSizes: number[],
): Seduto[] {
  while (groups.size > numTavoli) {
    // Priorità: tavolo ≤2 (§9), poi più piccolo, poi numero più alto per parità
    let breakKey = -1, breakSize = Infinity

    for (const [k, v] of groups) {
      if (v.length <= 2) {
        if (breakKey === -1 || v.length < breakSize || (v.length === breakSize && k > breakKey)) {
          breakSize = v.length; breakKey = k
        }
      }
    }
    if (breakKey === -1) {
      for (const [k, v] of groups) {
        if (v.length < breakSize || (v.length === breakSize && k > breakKey)) {
          breakSize = v.length; breakKey = k
        }
      }
    }

    pool.push(...groups.get(breakKey)!)
    groups.delete(breakKey)
  }

  pool.sort((a, b) => a - b)

  const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0] - b[0])
  const slots: { tNum: number; players: number[]; target: number }[] = sorted.map(([tNum, players], i) => ({
    tNum, players: [...players], target: targetSizes[i]!,
  }))

  let pi = 0
  for (const slot of slots) {
    while (slot.players.length < slot.target && pi < pool.length) {
      slot.players.push(pool[pi++]!)
    }
  }

  return buildSlots(slots)
}

function moveOneToCritical(groups: Map<number, number[]>): Seduto[] {
  let critKey = -1, maxKey = -1, maxSize = -1
  for (const [k, v] of groups) {
    if (v.length === 3) critKey = k
    if (v.length > maxSize) { maxSize = v.length; maxKey = k }
  }

  if (critKey !== -1 && maxKey !== critKey) {
    const players = groups.get(maxKey)!
    const moved = players.splice(players.length - 1, 1)[0]!
    groups.get(critKey)!.push(moved)
  }

  return buildResult(groups)
}

function buildResult(groups: Map<number, number[]>): Seduto[] {
  const result: Seduto[] = []
  for (const [tNum, players] of groups) {
    const sorted = [...players].sort((a, b) => a - b)
    sorted.forEach((id, idx) => result.push({ id_nome: id, seat: { tavolo: tNum, posto: idx + 1 } }))
  }
  return result
}

function buildSlots(slots: { tNum: number; players: number[] }[]): Seduto[] {
  const result: Seduto[] = []
  for (const { tNum, players } of slots) {
    const sorted = [...players].sort((a, b) => a - b)
    sorted.forEach((id, idx) => result.push({ id_nome: id, seat: { tavolo: tNum, posto: idx + 1 } }))
  }
  return result
}
