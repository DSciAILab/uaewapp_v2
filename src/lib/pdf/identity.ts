import type { jsPDF } from 'jspdf'
import { getDataUrl } from '@/lib/utils'

/**
 * The shared visual identity for every PDF the app prints.
 *
 * Before this module each screen built its own document inline, and they drifted:
 * five different header colours, four body font sizes, three date locales, and
 * three exports that saved under a fixed filename so downloading the same report
 * for two events silently overwrote the first one. The fix is not to tidy each
 * export -- it is to have one place that owns the identity, so a new screen
 * cannot invent a sixth look by accident.
 *
 * What is standard here: the header block, the footer, the page numbering, the
 * filename, and the table's base styling. What each report still decides for
 * itself: its columns, its widths, and any conditional tinting -- those are
 * report-specific and were never the problem.
 */

/** Near-black. Reads as the logo's own ink, and prints clean on a mono printer. */
export const BRAND_INK: [number, number, number] = [38, 38, 38]
const MUTED_INK = 120
const MARGIN_X = 14
const LOGO_PATH = '/brand/uaew-logo.jpg'

/**
 * Body/table defaults. Reports override columns, never the base.
 *
 * headStyles pins its own minCellHeight on purpose: reports raise the body's
 * minCellHeight to fit a photo, and without this the header band inherits that
 * height too and prints as a thick black slab with the labels floating at the
 * top of it.
 */
export const REPORT_TABLE_STYLES = {
  styles: { fontSize: 8, valign: 'top' as const, cellPadding: 2 },
  headStyles: {
    fillColor: BRAND_INK,
    textColor: 255,
    fontSize: 9,
    minCellHeight: 9,
    valign: 'middle' as const,
  },
}

/**
 * The logo, as a data URL, or null when it cannot be loaded.
 *
 * Null is a supported outcome, not a failure: the header simply renders without
 * the mark and every report still prints. A missing asset must never cost the
 * operator the document they came for.
 */
export async function loadBrandLogo(): Promise<string | null> {
  try {
    return await getDataUrl(LOGO_PATH)
  } catch {
    return null
  }
}

export interface ReportHeaderOptions {
  /** "UAE Warriors 72" — shown before the document title. */
  eventName: string
  /** "Medical Clearance Report" — what this document is. */
  documentTitle: string
  /** Who pressed print. Falls back to their email, then to a neutral dash. */
  printedBy?: string | null
  /**
   * The one-line breakdown of what follows: total plus the split that matters
   * for this report. Each report decides its own counts -- what is standard is
   * that the line exists and sits here.
   */
  breakdown?: string
  /** From loadBrandLogo(). Omit or pass null to render without the mark. */
  logoDataUrl?: string | null
}

/** Where the table body begins on every page, below the header block. */
export const REPORT_BODY_TOP = 36

/**
 * The autoTable options that put the header on EVERY page.
 *
 * Spread this into the table config instead of drawing the header yourself:
 *
 *   autoTable(doc, { ...repeatingHeader(doc, headerOptions), head, body })
 *
 * A report is read one page at a time -- someone holding page 3 at the medical
 * desk needs to know which event and which document it belongs to just as much
 * as the person holding page 1. The footer already carries the document name and
 * page number; this puts the full identity block up top too.
 */
export function repeatingHeader(doc: jsPDF, options: ReportHeaderOptions) {
  return {
    startY: REPORT_BODY_TOP,
    margin: { top: REPORT_BODY_TOP },
    // autoTable fires this for every page it opens, including the first.
    didDrawPage: () => {
      drawReportHeader(doc, options)
    },
  }
}

/**
 * Draws the standard header and returns the Y coordinate the table should start
 * at. Prefer repeatingHeader() -- this is the single-page primitive it builds on.
 */
export function drawReportHeader(doc: jsPDF, options: ReportHeaderOptions): number {
  const { eventName, documentTitle, printedBy, breakdown, logoDataUrl } = options

  const logoWidth = 30
  let textX = MARGIN_X

  if (logoDataUrl) {
    try {
      // Keep the mark's aspect ratio: it is 404x299, and stretching it to a
      // square visibly distorts the falcon.
      const logoHeight = logoWidth * (299 / 404)
      const fmt = logoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
      // Stable alias: the header now draws on every page, and without this the
      // same logo is embedded once per page and the file grows with the roster.
      doc.addImage(logoDataUrl, fmt, MARGIN_X, 10, logoWidth, logoHeight, 'uaew-brand-logo')
      textX = MARGIN_X + logoWidth + 6
    } catch {
      // A broken image must not take the whole report down with it.
      textX = MARGIN_X
    }
  }

  doc.setFontSize(14)
  doc.setTextColor(0)
  doc.setFont('helvetica', 'bold')
  doc.text(`${eventName} | ${documentTitle}`.toUpperCase(), textX, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(MUTED_INK)
  doc.text(`${formatStamp(new Date())}  |  Printed by: ${printedBy || '—'}`, textX, 22)

  if (breakdown) {
    doc.setFontSize(9)
    doc.setTextColor(0)
    doc.text(breakdown, textX, 28)
  }

  doc.setTextColor(0)
  return 36
}

/**
 * Stamps every page with the document label and "Page N of M".
 *
 * MUST be called after the table is drawn: the total page count does not exist
 * until autoTable has finished paginating. None of the previous exports had page
 * numbers at all, which is fine on screen and useless on paper -- a printed
 * multi-page report that gets dropped cannot be put back in order.
 */
export function drawReportFooters(doc: jsPDF, documentLabel: string): void {
  const pageCount = doc.getNumberOfPages()
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()

  for (let page = 1; page <= pageCount; page++) {
    doc.setPage(page)
    doc.setFontSize(8)
    doc.setTextColor(MUTED_INK)
    doc.setFont('helvetica', 'normal')
    doc.text(documentLabel, MARGIN_X, pageHeight - 8)
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - MARGIN_X, pageHeight - 8, { align: 'right' })
  }
  doc.setTextColor(0)
}

const CORNER_INK: Record<string, [number, number, number]> = {
  RED: [220, 38, 38],
  BLUE: [37, 99, 235],
}

/** Minimal shape of the autoTable cell hook data the draw helpers need. */
interface CellBox {
  x: number
  y: number
  width: number
  height: number
}

/**
 * The athlete's photo, round, ringed in their corner colour.
 *
 * The ring carries the corner so the table does not need a whole column to say
 * "RED" -- on a printed sheet the colour is read instantly and the column was
 * costing width that the notes and history actually need.
 *
 * Falls back to a square photo with a square ring if the PDF engine refuses the
 * circular clip. Losing the round crop is cosmetic; losing the photo is not.
 */
export function drawAthletePhoto(
  doc: jsPDF,
  cell: CellBox,
  options: { dataUrl?: string | null; corner?: string | null }
): void {
  const { dataUrl, corner } = options
  const ring = corner ? CORNER_INK[corner] : undefined
  const size = Math.min(cell.height, cell.width) - 3
  if (size <= 0) return

  const x = cell.x + (cell.width - size) / 2
  const y = cell.y + (cell.height - size) / 2
  const cx = x + size / 2
  const cy = y + size / 2
  const r = size / 2

  if (dataUrl) {
    const fmt = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG'
    let clipped = false
    try {
      const d = doc as unknown as {
        saveGraphicsState: () => void
        restoreGraphicsState: () => void
        circle: (x: number, y: number, r: number, style?: string | null) => void
        clip: () => void
        discardPath?: () => void
      }
      d.saveGraphicsState()
      d.circle(cx, cy, r, null)
      d.clip()
      d.discardPath?.()
      doc.addImage(dataUrl, fmt, x, y, size, size)
      d.restoreGraphicsState()
      clipped = true
    } catch {
      clipped = false
    }
    if (!clipped) {
      try {
        doc.addImage(dataUrl, fmt, x, y, size, size)
      } catch {
        return
      }
    }
  }

  if (ring) {
    doc.setDrawColor(ring[0], ring[1], ring[2])
    doc.setLineWidth(0.7)
    doc.circle(cx, cy, r, 'S')
    doc.setDrawColor(0)
    doc.setLineWidth(0.2)
  }
}

/**
 * Name in bold, event code beside it, and the person's detail line beneath in a
 * smaller, quieter type.
 *
 * Drawn by hand rather than handed to autoTable because a table cell carries one
 * style for all of its text, and the whole point here is that the name outranks
 * the detail. Callers must leave the cell's own text empty and reserve the
 * height via minCellHeight.
 */
export function drawAthleteCell(
  doc: jsPDF,
  cell: CellBox,
  options: { name: string; eventCode?: string | null; detail?: string | null }
): void {
  const { name, eventCode, detail } = options
  const padding = 2
  const maxWidth = cell.width - padding * 2
  let cursorY = cell.y + padding + 3

  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0)
  const nameLines = doc.splitTextToSize(name, eventCode ? maxWidth - 14 : maxWidth) as string[]

  // Measure the first line while the bold face is still active. Measuring after
  // switching to the smaller face reports a narrower name than is drawn, and the
  // code lands on top of it.
  const firstLineWidth = doc.getTextWidth(nameLines[0] || '')

  for (const line of nameLines) {
    doc.text(line, cell.x + padding, cursorY)
    cursorY += 3.4
  }

  if (eventCode) {
    // Sits on the name's first line, to its right: it identifies the person, so
    // it belongs with the name and not down among the logistics.
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(MUTED_INK)
    doc.text(eventCode, cell.x + padding + firstLineWidth + 2, cell.y + padding + 3)
  }

  if (detail) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(MUTED_INK)
    for (const line of doc.splitTextToSize(detail, maxWidth) as string[]) {
      doc.text(line, cell.x + padding, cursorY)
      cursorY += 2.9
    }
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(0)
}

/**
 * "uaew72-medical-clearance-2026-07-19.pdf"
 *
 * Always event + document + date. This is what stops two events, or two
 * different templates, from landing on the same name in the downloads folder.
 */
export function buildReportFilename(eventName: string, documentName: string, when: Date = new Date()): string {
  return `${eventSlug(eventName)}-${documentSlug(documentName)}-${when.toISOString().slice(0, 10)}.pdf`
}

/**
 * A name given as a literal ('fighter-stats') passes through untouched, so this
 * is a no-op for Medical and Stats. It exists for callers that name a document
 * from database text: a task called "Blood Test" would otherwise reach the
 * filesystem with a space in it, and one called "Weigh-in / Medical" would
 * carry a path separator into the filename.
 */
function documentSlug(value: string): string {
  return (value || '')
    // Strip accents first, so "Ação" degrades to "acao" and not to "a-o".
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'report'
}

/** "UAE Warriors 72" -> "uaew72"; anything else degrades to a plain slug. */
export function eventSlug(eventName: string): string {
  const numbered = eventName?.match(/uae\s*warriors\s*(\d+)/i)
  if (numbered) return `uaew${numbered[1]}`
  return (eventName || 'event').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'event'
}

/**
 * One timestamp format across every report. The old exports used pt-BR on
 * Medical, en-GB on Stats and the browser default everywhere else, so three
 * documents printed from the same laptop disagreed about what day it was.
 */
function formatStamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
