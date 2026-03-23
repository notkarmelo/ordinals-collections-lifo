import { readFile } from 'node:fs/promises'

const INSCRIPTION_ID_RE = /^[a-f0-9]{64}i\d+$/
const SLUG_RE = /^[a-z0-9_-]+$/

const collectionsPath = new URL('../collections.json', import.meta.url).pathname
const collections = JSON.parse(await readFile(collectionsPath, 'utf8'))
const existingSlugs = new Set(collections.map(e => e.slug))

const body = await new Promise(resolve => {
  let data = ''
  process.stdin.on('data', chunk => { data += chunk })
  process.stdin.on('end', () => resolve(data))
})

const sections = {}
let currentKey = null
for (const line of body.split('\n')) {
  const match = line.match(/^### (.+)$/)
  if (match) {
    currentKey = match[1].trim()
    sections[currentKey] = ''
  } else if (currentKey) {
    sections[currentKey] += line + '\n'
  }
}

for (const key of Object.keys(sections)) {
  sections[key] = sections[key].trim()
}

const name = sections['Collection Name'] || ''
const type = sections['Collection Type'] || ''
const rawIds = sections['Inscription ID(s)'] || ''
const slug = sections['Slug'] || ''

const errors = []

if (!name) errors.push('Collection Name is required')
if (!['gallery', 'parent'].includes(type)) errors.push(`Invalid type: "${type}" (must be gallery or parent)`)
if (!slug) {
  errors.push('Slug is required')
} else if (!SLUG_RE.test(slug)) {
  errors.push(`Invalid slug: "${slug}" (lowercase letters, numbers, hyphens, underscores only)`)
} else if (existingSlugs.has(slug)) {
  errors.push(`Slug "${slug}" already exists in collections.json`)
}

const ids = rawIds.split('\n').map(l => l.trim()).filter(Boolean)
if (ids.length === 0) {
  errors.push('At least one inscription ID is required')
} else {
  for (const id of ids) {
    if (!INSCRIPTION_ID_RE.test(id)) {
      errors.push(`Invalid inscription ID: "${id}"`)
    }
  }
}

if (type === 'gallery' && ids.length > 1) {
  errors.push(`Gallery type expects a single inscription ID, got ${ids.length}`)
}

let entry = null
if (errors.length === 0) {
  entry = { name: name.trim(), type, slug }
  if (type === 'gallery') {
    entry.id = ids[0]
  } else {
    entry.ids = ids
  }
}

console.log(JSON.stringify({ entry, errors }))
