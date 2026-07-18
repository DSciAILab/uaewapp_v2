import { getDashboardMatrix } from './dashboard-matrix';

/**
 * Feeds the war-room dashboard (UAE-23).
 *
 * The war-room screen is the approved `dashboard.html` kept verbatim — it was
 * built to read Google Sheets, so it parses the gviz table shape
 * (`{cols:[{label}], rows:[{c:[{v}]}]}`). Rather than re-implement its 2,400
 * lines, we keep the file and swap its data source: this adapter renders our
 * database into the exact shape it already knows how to parse.
 *
 * Status vocabulary is the HTML's, not ours:
 *   done → 'Done' · pending → 'Requested' · in_progress → 'In Progress'
 *   not_requested → '---'
 *   undecided → NO ROW AT ALL — the HTML treats a missing entry as
 *   "pending (no entry)" and paints it in the alarm colour, which is exactly
 *   the "nobody decided yet" signal we want. Emitting a row would hide it.
 */

export interface GvizTable {
  cols: { label: string; type: string }[];
  rows: { c: ({ v: string | number | null } | null)[] }[];
}

const STATUS_TO_SHEET: Record<string, string | null> = {
  done: 'Done',
  pending: 'Requested',
  in_progress: 'In Progress',
  not_requested: '---',
  undecided: null, // omitted on purpose — see the note above
};

function cols(labels: string[]): GvizTable['cols'] {
  return labels.map((label) => ({ label, type: 'string' }));
}

export async function getWarRoomTables(
  eventId: string,
  /** Server-side client — RLS returns nothing without the user's session. */
  client?: Parameters<typeof getDashboardMatrix>[1]
): Promise<{
  fightCard: GvizTable;
  attendance: GvizTable;
  eventName: string;
}> {
  const matrix = await getDashboardMatrix(eventId, client);

  // The HTML looks these labels up by name, so they must match the sheet's.
  const fightCard: GvizTable = {
    cols: cols([
      '#', 'Event', 'Corner', 'Division', 'Name', 'Nickname',
      'Record', 'Nationality', 'Team', 'App ID', 'Event ID',
    ]),
    rows: matrix.rows.map((r) => ({
      c: [
        { v: r.fightOrder ?? null },
        { v: matrix.eventName },
        { v: r.corner ?? '' },
        { v: r.division ?? '' },
        { v: r.name },
        { v: '' },
        // Fight record is deliberately blank — UAEW does not track it.
        { v: '' },
        { v: r.nationality ?? '' },
        { v: '' },
        { v: r.photoUrl },
        { v: r.enrollmentId },
      ],
    })),
  };

  const attendanceRows: GvizTable['rows'] = [];
  let seq = 0;
  for (const r of matrix.rows) {
    for (const cell of Object.values(r.cells)) {
      const status = STATUS_TO_SHEET[cell.status];
      if (status === null || status === undefined) continue;
      seq += 1;
      attendanceRows.push({
        c: [
          { v: seq },
          { v: matrix.eventName },
          { v: r.enrollmentId },
          { v: r.name },
          { v: cell.taskName },
          { v: status },
        ],
      });
    }
  }

  const attendance: GvizTable = {
    cols: cols(['#', 'Event', 'ID', 'Name', 'Task', 'Status']),
    rows: attendanceRows,
  };

  return { fightCard, attendance, eventName: matrix.eventName };
}
