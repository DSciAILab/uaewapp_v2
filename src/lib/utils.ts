import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(time: string): string {
  return time.slice(0, 5) // HH:MM
}

export function normalizeName(name: string): string {
  if (!name) return ''
  return name
    .trim()
    .replace(/[\u0000-\u001F\u007F-\u009F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Normalizes an appadmin_fighter_id for identity comparison.
 * Returns '' when there is no usable id, so callers can skip id matching.
 * Spreadsheets export numeric id cells as "255.0", which must compare equal
 * to the "255" stored in the database.
 */
export function normalizeFighterId(id: unknown): string {
  if (id === null || id === undefined) return ''
  const raw = String(id).trim()
  if (!raw) return ''
  return /^\d+\.0+$/.test(raw) ? raw.split('.')[0] : raw
}

export function cleanName(name: string): string {
  if (!name) return ''
  // Remove redundant parentheses like "Name (Name)"
  const match = name.match(/^(.*?)\s*\((.*?)\)$/)
  if (match && match[1].trim() === match[2].trim()) {
    return match[1].trim()
  }
  return name
}

export function getDisplayName(person: { event_name?: string | null, compiled_name?: string | null }): string {
  if (person.event_name) return person.event_name
  const baseName = person.compiled_name || person.compiled_name || 'Unknown'
  return cleanName(baseName)
}

export function getFighterPhotoUrl(fighterId: string | number | null | undefined): string {
  if (!fighterId) return ''
  const idStr = String(fighterId).trim()
  
  // If company number (starts with PS) or contains any other letters, don't build photo link
  if (idStr.toUpperCase().startsWith('PS') || /[a-zA-Z]/.test(idStr)) {
    return ''
  }

  const remoteUrl = `https://appadmin.uaewarriors.com/imagecdn/FighterDP?fighterId=${idStr}`
  return `/api/proxy-image?url=${encodeURIComponent(remoteUrl)}`
}

export async function getDataUrl(url: string): Promise<string | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      console.warn(`Failed to load image: ${url} (Status: ${response.status})`)
      return null
    }

    const blob = await response.blob()
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = () => resolve(null)
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      console.warn('Image load timed out:', url)
    } else {
      console.warn('Failed to load image for PDF:', url)
    }
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

export function generateEventCode(roleCode: string, sequence: number): string {
  return `${roleCode}.${sequence.toString().padStart(3, '0')}`
}
