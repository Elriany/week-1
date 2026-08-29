import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const SRC = path.resolve(__dirname, '../..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

const files = walk(SRC)

function definedTokens(): Set<string> {
  const defined = new Set<string>()
  for (const f of files.filter((f) => f.endsWith('.css'))) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/^\s*(--[a-zA-Z0-9-]+)\s*:/gm)) {
      defined.add(m[1] as string)
    }
  }
  return defined
}

function usedTokens(): Map<string, string[]> {
  const used = new Map<string, string[]>()
  for (const f of files.filter((f) => /\.(vue|css)$/.test(f))) {
    for (const m of fs.readFileSync(f, 'utf8').matchAll(/var\((--[a-zA-Z0-9-]+)/g)) {
      const name = m[1] as string
      const list = used.get(name) ?? []
      list.push(path.relative(SRC, f))
      used.set(name, list)
    }
  }
  return used
}

describe('design tokens', () => {
  // An undefined custom property is invalid at computed-value time: the browser
  // discards the WHOLE declaration. `border: 1px solid var(--undefined)` leaves
  // the element with no border at all, which is how every input in this app
  // lost its border without a single test or typecheck noticing.
  it('every var(--token) used by a component is defined', () => {
    const defined = definedTokens()
    const used = usedTokens()

    const missing = [...used.entries()]
      .filter(([name]) => !defined.has(name))
      .map(([name, where]) => `${name} (used in ${[...new Set(where)].join(', ')})`)

    expect(missing).toEqual([])
  })

  it('--color-primary-rgb matches --color-primary', () => {
    const css = fs.readFileSync(path.join(SRC, 'assets/main.css'), 'utf8')

    const hex = css.match(/--color-primary:\s*#([0-9a-fA-F]{6})/)?.[1]
    const rgb = css.match(/--color-primary-rgb:\s*([0-9]+),\s*([0-9]+),\s*([0-9]+)/)
    expect(hex).toBeDefined()
    expect(rgb).not.toBeNull()

    const fromHex = [
      parseInt(hex!.slice(0, 2), 16),
      parseInt(hex!.slice(2, 4), 16),
      parseInt(hex!.slice(4, 6), 16),
    ]
    const declared = [Number(rgb![1]), Number(rgb![2]), Number(rgb![3])]

    // CSS cannot derive channels from a hex custom property, so these are kept
    // in sync by hand. A mismatch renders focus rings in the previous blue.
    expect(declared).toEqual(fromHex)
  })

  it('no component hardcodes a hex colour', () => {
    const offenders: string[] = []
    for (const f of files.filter((f) => f.endsWith('.vue'))) {
      const hits = fs.readFileSync(f, 'utf8').match(/#[0-9a-fA-F]{3,8}\b/g)
      if (hits) offenders.push(`${path.relative(SRC, f)}: ${hits.join(' ')}`)
    }
    expect(offenders).toEqual([])
  })

  it('no component uses a physical directional property', () => {
    const PHYSICAL =
      /(margin|padding|border)-(left|right)\s*:|text-align:\s*(left|right)\b/g
    const offenders: string[] = []
    for (const f of files.filter((f) => /\.(vue|css)$/.test(f))) {
      const hits = fs.readFileSync(f, 'utf8').match(PHYSICAL)
      if (hits) offenders.push(`${path.relative(SRC, f)}: ${hits.join(' ')}`)
    }
    expect(offenders).toEqual([])
  })

  it('defines a :focus-visible rule', () => {
    const css = fs.readFileSync(path.join(SRC, 'assets/main.css'), 'utf8')
    expect(css).toMatch(/:focus-visible\s*\{/)
  })

  // base.css was the Vue scaffold theme. Its prefers-color-scheme: dark block
  // repainted part of the UI while every BaseCard stayed hardcoded white, so
  // the machine's OS setting decided whether the app looked broken.
  it('ships no prefers-color-scheme override', () => {
    for (const f of files.filter((f) => /\.(vue|css)$/.test(f))) {
      expect(fs.readFileSync(f, 'utf8')).not.toMatch(/prefers-color-scheme/)
    }
  })
})
