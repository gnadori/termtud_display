import type { CalendarEvent, EventCategory } from '../types';

export type ParsedCsvEvent = Omit<CalendarEvent, 'id' | 'createdAt'>;

export interface CsvImportResult {
  events: ParsedCsvEvent[];
  skippedRows: number;
}

export const SAMPLE_CSV_CONTENT = `\uFEFFdatum;ido;esemeny;helyszin;tantargy
2026-11-18;14:30;Természettudományi műhely: Mérések szenzorokkal;204-es labor;termeszettudomany
2026-11-20;15:00;Fizika OKTV felkészítő;Fizika előadó;fizika
2026-11-24;14:15;Kémia kísérleti délután;Kémia labor;kemia
2026-12-02;13:30;Biológia szakkör: Mikroszkópia;Biológia szertár;biologia
2026-12-10;16:00;Földrajz verseny elődöntő;112-es terem;verseny
`;

function normalizeCategory(raw: string | undefined): EventCategory {
  const val = (raw || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (val.includes('termeszet') || val === 'tt') return 'termeszettudomany';
  if (val.includes('fizik')) return 'fizika';
  if (val.includes('kemi')) return 'kemia';
  if (val.includes('biolog')) return 'biologia';
  if (val.includes('foldrajz')) return 'foldrajz';
  if (val.includes('verseny')) return 'verseny';
  return 'egyeb';
}

function normalizeDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().replace(/\.$/, '').replace(/\./g, '-').replace(/\//g, '-');
  const match = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function normalizeTime(raw: string | undefined): string {
  if (!raw) return '08:00';
  const match = raw.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '08:00';
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

export function parseEventsCsv(text: string): CsvImportResult {
  const cleanText = text.replace(/^\uFEFF/, '');
  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { events: [], skippedRows: 0 };
  }

  // Elválasztó automatikus felismerése (; vagy ,)
  const firstLine = lines[0];
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0)
      ? ';'
      : ',';

  const firstCols = splitCsvLine(firstLine, delimiter).map((c) =>
    c
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
  );

  const hasHeader =
    firstCols.some((c) => c.includes('datum') || c.includes('date')) &&
    firstCols.some((c) => c.includes('esemeny') || c.includes('title') || c.includes('nev'));

  const startRow = hasHeader ? 1 : 0;

  let dateIdx = 0;
  let timeIdx = 1;
  let titleIdx = 2;
  let locationIdx = 3;
  let categoryIdx = 4;

  if (hasHeader) {
    const findCol = (names: string[], fallback: number) => {
      const idx = firstCols.findIndex((c) => names.some((n) => c.includes(n)));
      return idx >= 0 ? idx : fallback;
    };
    dateIdx = findCol(['datum', 'date'], 0);
    timeIdx = findCol(['ido', 'time'], 1);
    titleIdx = findCol(['esemeny', 'title', 'nev'], 2);
    locationIdx = findCol(['helyszin', 'location', 'terem'], 3);
    categoryIdx = findCol(['tantargy', 'kategoria', 'category'], 4);
  }

  const events: ParsedCsvEvent[] = [];
  let skippedRows = 0;

  for (let i = startRow; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delimiter);
    const date = normalizeDate(cols[dateIdx]);
    const title = (cols[titleIdx] || '').trim();

    if (!date || !title) {
      skippedRows++;
      continue;
    }

    events.push({
      date,
      time: normalizeTime(cols[timeIdx]),
      title,
      location: (cols[locationIdx] || '').trim(),
      category: normalizeCategory(cols[categoryIdx]),
    });
  }

  return { events, skippedRows };
}
