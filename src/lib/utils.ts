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
    // Remover caracteres não imprimíveis (como BOM e outros controles)
    .replace(/[\u0000-\u001F\u007F-\u009F\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

export function getFighterPhotoUrl(fighterId: string | number | null | undefined): string {
  if (!fighterId) return ''
  const idStr = String(fighterId).trim()
  
  // If company number (starts with PS) or contains any other letters, don't build photo link
  if (idStr.toUpperCase().startsWith('PS') || /[a-zA-Z]/.test(idStr)) {
    return ''
  }

  return `https://appadmin.uaewarriors.com/imagecdn/FighterDP?fighterId=${idStr}`
}

export async function getDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn('Failed to load image for PDF:', url);
    return null;
  }
}

export function generateEventCode(roleCode: string, sequence: number): string {
  return `${roleCode}.${sequence.toString().padStart(3, '0')}`
}
