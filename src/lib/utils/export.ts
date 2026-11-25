import type { Student, SeteukDraft } from '../../types/seteuk';
import { AREA_METAS } from '../../types/seteuk';
import { isProblem } from '../standards/verify';
import { checkNeisForbidden } from './neisForbidden';

const HEADER_ROW = [
  '학번',
  '성명',
  '영역',
  '과목명',
  '세특 내용',
  '글자수(공백포함)',
  'NEIS 바이트',
  '성취기준 검증',
  '기재금지 표현',
  '작성일시',
];

function buildExportRows(
  students: Student[],
  drafts: Record<string, SeteukDraft>
): string[][] {
  const rows: string[][] = [HEADER_ROW];

  students.forEach((student) => {
    Object.values(drafts)
      .filter((d) => d.studentId === student.id && d.content.trim())
      .forEach((draft) => {
        const areaLabel = AREA_METAS[draft.area]?.label || draft.area;
        const subject = draft.subjectName || '-';

        let verifyStatus = '미인용/정상';
        if (draft.verifiedFindings && draft.verifiedFindings.length > 0) {
          const problems = draft.verifiedFindings.filter(isProblem);
          verifyStatus =
            problems.length > 0
              ? `오류 (${problems.map((p) => p.tag).join(', ')})`
              : '검증 완료';
        }

        const forbidden = checkNeisForbidden(draft.content, student.name);
        const forbiddenStatus =
          forbidden.length > 0
            ? `주의 ${forbidden.length}건 (${forbidden.map((f) => f.matched).join(', ')})`
            : '이상 없음';

        const dateStr = new Date(draft.updatedAt).toLocaleDateString('ko-KR');

        rows.push([
          student.studentNumber,
          student.name,
          areaLabel,
          subject,
          draft.content,
          String(draft.charCount),
          String(draft.byteCount),
          verifyStatus,
          forbiddenStatus,
          dateStr,
        ]);
      });
  });

  return rows;
}

/** CSV 수식 인젝션(=, +, -, @ 시작 셀) 방어 */
function escapeCsvCell(val: string | number): string {
  let str = String(val ?? '');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  return `"${str.replace(/"/g, '""')}"`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSeteukToCsv(
  students: Student[],
  drafts: Record<string, SeteukDraft>
): number {
  const rows = buildExportRows(students, drafts);
  const csvContent =
    '\uFEFF' + rows.map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `세특작성기록_${new Date().toISOString().slice(0, 10)}.csv`);
  return rows.length - 1;
}

/* ---------- 순수 TypeScript 무의존성 OOXML(.xlsx) 생성기 (Store ZIP) ---------- */

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colLetter(idx: number): string {
  let s = '';
  let n = idx + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipStore(entries: Array<{ name: string; data: Uint8Array }>): Uint8Array {
  const enc = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.name);
    const data = entry.data;
    const crc = crc32(data);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    const lv = new DataView(localHeader.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true); // UTF-8 flag
    lv.setUint16(8, 0, true); // Store (no compression)
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    localHeader.set(nameBytes, 30);

    localParts.push(localHeader, data);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cv = new DataView(centralHeader.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    centralHeader.set(nameBytes, 46);

    centralParts.push(centralHeader);
    offset += localHeader.length + data.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalLen = offset + centralSize + eocd.length;
  const result = new Uint8Array(totalLen);
  let pos = 0;
  for (const p of [...localParts, ...centralParts, eocd]) {
    result.set(p, pos);
    pos += p.length;
  }
  return result;
}

export function exportSeteukToXlsx(
  students: Student[],
  drafts: Record<string, SeteukDraft>
): number {
  const rows = buildExportRows(students, drafts);
  const enc = new TextEncoder();

  const sheetRowsXml = rows
    .map((row, rIdx) => {
      const cells = row
        .map((val, cIdx) => {
          const ref = `${colLetter(cIdx)}${rIdx + 1}`;
          const isNumeric = rIdx > 0 && (cIdx === 5 || cIdx === 6) && /^\d+$/.test(val);
          if (isNumeric) {
            return `<c r="${ref}"><v>${val}</v></c>`;
          }
          const safe = /^[=+\-@\t\r]/.test(val) ? `'${val}` : val;
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(safe)}</t></is></c>`;
        })
        .join('');
      return `<row r="${rIdx + 1}">${cells}</row>`;
    })
    .join('');

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <cols>
    <col min="1" max="1" width="10" customWidth="1"/>
    <col min="2" max="2" width="14" customWidth="1"/>
    <col min="3" max="3" width="14" customWidth="1"/>
    <col min="4" max="4" width="16" customWidth="1"/>
    <col min="5" max="5" width="72" customWidth="1"/>
    <col min="6" max="7" width="14" customWidth="1"/>
    <col min="8" max="9" width="22" customWidth="1"/>
    <col min="10" max="10" width="14" customWidth="1"/>
  </cols>
  <sheetData>${sheetRowsXml}</sheetData>
</worksheet>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="세특작성기록" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

  const zipBytes = buildZipStore([
    { name: '[Content_Types].xml', data: enc.encode(contentTypesXml) },
    { name: '_rels/.rels', data: enc.encode(relsXml) },
    { name: 'xl/workbook.xml', data: enc.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(workbookRelsXml) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheetXml) },
  ]);

  const blob = new Blob([zipBytes as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, `세특작성기록_${new Date().toISOString().slice(0, 10)}.xlsx`);
  return rows.length - 1;
}
