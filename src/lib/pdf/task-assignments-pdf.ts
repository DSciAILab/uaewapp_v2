import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { EventTask } from '@/types/task';
import { ASSIGNMENT_STATUS_LABELS, type TaskAssignment } from '@/lib/services/task-assignments';
import type { FightCardPosition } from '@/lib/services/fight-card-positions';
import { getDataUrl, getFighterPhotoUrl } from '@/lib/utils';
import {
  loadBrandLogo,
  repeatingHeader,
  drawReportFooters,
  buildReportFilename,
  drawAthleteCell,
  drawAthletePhoto,
  REPORT_TABLE_STYLES,
} from '@/lib/pdf/identity';
import { getWhereaboutsMap } from '@/lib/pdf/whereabouts';

/**
 * The task's own clipboard sheet (UAE-98: moved here from the Task Assignments
 * sheet so the full-page task view prints the same document), on the identity
 * Medical and Fighter Stats already use, so the three read as one system.
 *
 * The caller passes only the people who still have to do the task: 'exempt'
 * never needed it and 'cancelled' left the event, so neither will ever be
 * filled in. See `printableAssignments` in the task page.
 */

/**
 * Row height in mm for each version of the sheet.
 *
 * NORMAL is the clipboard sheet: tall enough for a pen. LABEL is the same
 * document with 4cm rows, so a printed sample label can be stuck beside the
 * athlete it belongs to — Blood Test needs to pair a tube label with a name,
 * and 15mm leaves nowhere to put it. Only the height changes: same columns,
 * same order, same filters, because the two sheets get read side by side and
 * any other difference would be a second thing to reconcile.
 */
const ROW_MM = { normal: 15, label: 40 } as const;
export type TaskSheetVariant = keyof typeof ROW_MM;

export interface PrintTaskSheetOptions {
  task: EventTask;
  eventId: string;
  eventName: string | null;
  printedBy?: string | null;
  /** Already filtered and ordered as on screen, minus exempt/cancelled. */
  assignments: TaskAssignment[];
  positionOf: (a: TaskAssignment) => FightCardPosition;
  variant?: TaskSheetVariant;
}

/** Builds and downloads the PDF. Throws on failure; the caller toasts. */
export async function printTaskAssignmentsSheet({
  task,
  eventId,
  eventName,
  printedBy,
  assignments,
  positionOf,
  variant = 'normal',
}: PrintTaskSheetOptions): Promise<void> {
  const ordered = assignments;

  const [logoDataUrl, whereabouts, photoEntries] = await Promise.all([
    loadBrandLogo(),
    getWhereaboutsMap(eventId),
    Promise.all(
      ordered.map(async (a) => {
        const url = getFighterPhotoUrl(a.enrollment?.person.appadmin_fighter_id);
        if (!url) return [a.id, null] as const;
        try {
          return [a.id, await getDataUrl(url)] as const;
        } catch {
          return [a.id, null] as const;
        }
      })
    ),
  ]);
  const photoMap = new Map(photoEntries);

  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });

  const done = ordered.filter((a) => a.status === 'completed').length;
  const headerOptions = {
    eventName: eventName || 'Event',
    documentTitle: task.name,
    printedBy,
    breakdown: `${ordered.length} people · ${done} done · ${ordered.length - done} open`,
    logoDataUrl,
  };

  // Columns are described rather than hardcoded because the two sheets do
  // not have the same ones: the label sheet drops 'Done'. With positional
  // arrays, removing a column silently shifts every index after it and the
  // photo starts being drawn into the name's cell.
  const isLabel = variant === 'label';
  const columns = [
    { key: 'order', label: '#', width: 10, halign: 'center' as const },
    // The tick box is for the clipboard. The label sheet has a label stuck
    // where it would go, and nobody ticks a sheet they are labelling.
    ...(isLabel ? [] : [{ key: 'done', label: 'Done', width: 14, halign: 'center' as const }]),
    // The photo grows 50% on the label sheet, so its column has to grow with
    // it — drawAthletePhoto clamps to the cell, so a wider circle in a 14mm
    // column would just be silently cropped back to 14mm.
    { key: 'photo', label: 'Photo', width: isLabel ? 20 : 14, halign: 'center' as const },
    { key: 'person', label: 'Person', width: 62 },
    { key: 'status', label: 'Status', width: 28 },
    { key: 'notes', label: 'Notes', width: 'auto' as const },
  ];
  const colIndex = (key: string) => columns.findIndex((c) => c.key === key);
  const iPhoto = colIndex('photo');
  const iPerson = colIndex('person');

  autoTable(doc, {
    ...repeatingHeader(doc, headerOptions),
    head: [columns.map((c) => c.label)],
    body: ordered.map((a) =>
      columns.map((c) => {
        switch (c.key) {
          case 'order': return String(positionOf(a).fightOrder ?? '-');
          // Open rows are blank to tick on paper. Rows already marked done
          // in the app carry the tick, otherwise the sheet shows a finished
          // person as outstanding and the staff redo work already recorded.
          case 'done': return a.status === 'completed' ? 'X' : '';
          // What the app says right now, so the clipboard and the record
          // can be compared without opening the app.
          case 'status': return ASSIGNMENT_STATUS_LABELS[a.status] || '';
          // photo and person are drawn by hand in didDrawCell; notes is
          // written on paper.
          default: return '';
        }
      })
    ),
    // Same taller rows as Fighter Stats: an empty cell has to fit a pen.
    // The label sheet goes to 4cm so a sample label fits beside the row.
    styles: { ...REPORT_TABLE_STYLES.styles, valign: 'middle', minCellHeight: ROW_MM[variant] },
    // A row split across a page break has nowhere to stick a label. By
    // default autoTable happily cuts one in half — measured on 26 athletes
    // at 4cm, four rows came out as 28.78+11.22 and 17.56+22.44mm. 'avoid'
    // pushes the whole row to the next page instead: 26 rows of exactly
    // 40mm over 6 pages rather than 5 pages with four unusable rows.
    rowPageBreak: 'avoid',
    headStyles: REPORT_TABLE_STYLES.headStyles,
    columnStyles: Object.fromEntries(
      columns.map((c, i) => [
        i,
        { cellWidth: c.width, ...(c.halign ? { halign: c.halign } : {}) },
      ])
    ),
    didParseCell: (data) => {
      if (data.section === 'body' && data.cell.text.join('') === '') data.cell.text = [''];
    },
    didDrawCell: (data) => {
      if (data.section !== 'body') return;
      const a = ordered[data.row.index];
      if (!a) return;
      try {
        if (data.column.index === iPhoto) {
          drawAthletePhoto(doc, data.cell, {
            dataUrl: photoMap.get(a.id),
            corner: positionOf(a).corner,
            // 50% up from the 11mm the normal sheet prints, stated as a
            // measurement so widening the column cannot change it again.
            sizeMm: isLabel ? 16.5 : undefined,
          });
        } else if (data.column.index === iPerson) {
          drawAthleteCell(doc, data.cell, {
            name: a.enrollment?.person.event_name || a.enrollment?.person.compiled_name || '',
            eventCode: a.enrollment?.event_code ?? null,
            detail: whereabouts.get(a.enrollment_id),
            // Name and room read from a distance on the label sheet, and
            // centred so they sit beside the label rather than above it.
            nameFontSize: isLabel ? 10 : 8,
            verticalAlign: isLabel ? 'middle' : 'top',
          });
        }
      } catch (err) {
        console.warn('[task sheet pdf] cell draw failed:', err);
      }
    },
  });

  drawReportFooters(doc, `${eventName || 'Event'} — ${task.name}`);
  // The two sheets are printed in the same session and land in the same
  // downloads folder, so the label version has to say so in its name —
  // otherwise the second one arrives as "…(1).pdf" and nobody knows which
  // is which without opening both.
  doc.save(
    buildReportFilename(
      eventName || 'Event',
      variant === 'label' ? `${task.name} labels` : task.name
    )
  );
}
