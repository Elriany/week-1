import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const SRC = path.resolve(__dirname, '../../..')

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(p, out)
    else if (p.endsWith('.vue') && !p.includes('__tests__')) out.push(p)
  }
  return out
}

/**
 * Every select and textarea needs an accessible name: an aria-label, an id
 * paired with a <label for>, or an enclosing <label> wrapper. A placeholder is
 * not a name — it disappears the moment the user types.
 */
describe('form control accessible names', () => {
  it('every <select> and <textarea> has one', () => {
    const offenders: string[] = []

    for (const file of walk(SRC)) {
      const template = fs.readFileSync(file, 'utf8').split('<script')[0] ?? ''
      const lines = template.split('\n')

      lines.forEach((line, i) => {
        const m = line.match(/<(select|textarea)\b/)
        if (!m) return

        let tag = ''
        for (let j = i; j < Math.min(i + 12, lines.length); j++) {
          tag += lines[j] + '\n'
          if (lines[j]!.includes('>')) break
        }
        const named = /aria-label|aria-labelledby|:id=|\sid=/.test(tag)

        let wrapped = false
        for (let j = i - 1; j >= Math.max(0, i - 6); j--) {
          if (/<label\b/.test(lines[j]!)) { wrapped = true; break }
          if (/<\/label>/.test(lines[j]!)) break
        }

        if (!named && !wrapped) {
          offenders.push(`${path.relative(SRC, file)}:${i + 1} <${m[1]}>`)
        }
      })
    }

    expect(offenders).toEqual([])
  })

  // The ticket description field carried tickets.notes.placeholder, which reads
  // "Add a note..." on a field that is not a note.
  it('does not reuse the note placeholder on a description field', () => {
    for (const file of walk(SRC)) {
      const src = fs.readFileSync(file, 'utf8')
      const template = src.split('<script')[0] ?? ''
      if (!/v-model="[a-zA-Z.]*[Ff]orm\.description"/.test(template)) continue
      const block = template.slice(
        Math.max(0, template.search(/v-model="[a-zA-Z.]*[Ff]orm\.description"/) - 200),
      ).slice(0, 500)
      expect(block).not.toContain('tickets.notes.placeholder')
    }
  })
})
