import type { StandardRecord, VerifyFinding, VerifyTag } from '../../types/standard';
import { loadStandardsDb } from './client';

// scripts/verify.py 포팅 (TypeScript). 원본: bobthecodebuilder88/kr-curriculum-2022 (MIT)
// 판정 원칙: 정규화 후 원문이 그대로 포함되면 정상. 아니면 유사도(ALTERED 임계값)로
// '인용을 시도했다가 고쳐 쓴 자리'를 구분한다. 산문(단순 코드 언급)은 무고하지 않는다.

const WINDOW = 400;
const LEVEL_WINDOW = 1200;
const ALTERED = 0.55;
const HEAD_SLACK = 12;
const EVIDENCE_MIN = 12;
const MIN_CLAIM = 15;
const MIN_LEVEL_CLAIM = 10;

const NORM_RE = /[\s\u00b7\u22c5\uff65\u318d\u30fb]+/g;
const CLOSERS = ']})\u3015\u3011\uff3d|`';
const HEAD_JUNK_RE = /^[\s\]\)\}\u3015\u3011\uff3d|`:\uff1a*>\u00b7\u22c5\uff65\u318d]+/;
const META_WORDS = ['\uc131\ucde8\uae30\uc900', '\uc131\ucde8\uc218\uc900', '\ucc28\uc2dc', '\ub2e8\uc6d0', '\uc9c0\ub3c4\uc548', '\uad50\uc0ac', '\ud559\uc0dd', '\ubaa8\ub461',
  '\uad50\uacfc\uc11c', '\ud559\uc2b5\uc9c0', '\ud65c\ub3d9\uc9c0', '\ud559\uc2b5\ubaa9\ud45c', '\ud3c9\uac00\uacc4\ud68d', '\uc9c0\ud544\ud3c9\uac00', '\uc218\ud589\ud3c9\uac00',
  '\ud615\uc131\ud3c9\uac00', '\ucd1d\uad04\ud3c9\uac00', '\ucc44\uc810', '\ub8e8\ube0c\ub9ad', '\ud53c\ub4dc\ubc31', '\uc720\uc758\uc810', '\uc900\ube44\ubb3c'];
const LEVEL_LINE_RE = /(?:^|[^A-Za-z])([A-Ea-e])\s*(?:\uc218\uc900|\ub4f1\uae09)\s*[:\uff1a]\s*(\S.*)/;

// 코드 정규식 (2단/3단). 원본 pipeline/codes.py 규칙을 옮김.
const ABBR = '[\uac00-\ud7a3]{1,4}(?:\\([\uac00-\ud7a3]{1,4}\\))?(?:[\u2160\u2161]|I{1,2})?';
const ABBR3 = '[\uac00-\ud7a3]{1,4}(?:[\u2160\u2161]|I{1,2})|[\uac00-\ud7a3]{2}\\d';
const DASH = '[-\u2013\u2014\u2012\u2212]';
const CLOSE_LIKE = '[\\]\\)\\}\u3015\u3011\uff3d|]';
const THREE_RE = new RegExp('(1[02])(' + ABBR3 + ')' + DASH + '(\\d{2})' + DASH + '(\\d{2})', 'g');
const TWO_RE = new RegExp('(10|12|[2469])(' + ABBR + ')(\\d{2})' + DASH + '(\\d{2})(' + CLOSE_LIKE + ')?', 'g');
const THIRD_GROUP_RE = new RegExp('^' + DASH + '\\d{2}');

interface CodeHit { code: string; start: number; end: number; }

function findCodes(text: string): CodeHit[] {
  const found: CodeHit[] = [];
  THREE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = THREE_RE.exec(text))) {
    found.push({ code: m[1] + m[2] + '-' + m[3] + '-' + m[4], start: m.index, end: m.index + m[0].length });
  }
  const taken = found.map((f) => [f.start, f.end] as const);
  TWO_RE.lastIndex = 0;
  while ((m = TWO_RE.exec(text))) {
    const s = m.index;
    if (taken.some(([a, b]) => a <= s && s < b)) continue;
    if (m[5] === undefined) {
      const rest = text.slice(m.index + m[0].length);
      if (THIRD_GROUP_RE.test(rest)) continue;
    }
    found.push({ code: m[1] + m[2] + m[3] + '-' + m[4], start: s, end: m.index + m[0].length });
  }
  found.sort((a, b) => a.start - b.start);
  return found;
}
function norm(s: string | null | undefined): string {
  return (s ?? '').normalize('NFC').replace(NORM_RE, '');
}

interface StatementIndexEntry { s: string; code: string; }

// 정규화 진술문의 앞머리(EVIDENCE_MIN자) -> [(정규화 진술문, 코드)]
// 인용 자리에 '다른 성취기준의 문장'이 통째로 들어앉은 경우를 잡는다.
function buildStatementIndex(db: Map<string, StandardRecord[]>): Map<string, StatementIndexEntry[]> {
  const idx = new Map<string, StatementIndexEntry[]>();
  for (const recs of db.values()) {
    for (const r of recs) {
      const s = norm(r.statement);
      if (s.length >= EVIDENCE_MIN) {
        const key = s.slice(0, EVIDENCE_MIN);
        const list = idx.get(key);
        if (list) list.push({ s, code: r.code });
        else idx.set(key, [{ s, code: r.code }]);
      }
    }
  }
  return idx;
}

function head(window: string): string {
  return window.replace(HEAD_JUNK_RE, '');
}

// 코드가 문장에 조사로 붙어 있지 않고 따로 떨어져 있는가.
function standsApart(window: string): boolean {
  let rest = window;
  while (rest.length && CLOSERS.includes(rest[0])) rest = rest.slice(1);
  if (!rest) return false;
  return !/[0-9A-Za-z\uac00-\ud7a3]/.test(rest[0]);
}

// 인용 자리에 놓인 완결된 서술문. 인용 형식이 아니면 null.
function slotSentence(window: string): string | null {
  if (!standsApart(window)) return null;
  const seg = head(window).split('\n', 1)[0].trim();
  if (seg.endsWith('\u2026') || seg.endsWith('...')) return null;
  const body = seg.replace(/[\s.\u3002\u300d\u300f\u201d\u2019"'|*)\]}]+$/, '');
  if (!body.endsWith('\ub2e4')) return null;
  if (META_WORDS.some((w) => seg.includes(w))) return null;
  return norm(seg).length >= MIN_CLAIM ? seg : null;
}

// 인용 자리에 다른 성취기준의 진술문이 그대로 들어 있으면 그 코드를 돌려준다.
function quotedElsewhere(
  headText: string,
  code: string,
  sindex: Map<string, StatementIndexEntry[]>,
): { code: string; statement: string } | null {
  const limit = Math.min(HEAD_SLACK, headText.length);
  for (let i = 0; i <= limit; i++) {
    const key = headText.slice(i, i + EVIDENCE_MIN);
    const entries = sindex.get(key);
    if (!entries) continue;
    for (const { s, code: code2 } of entries) {
      if (code2 !== code && headText.startsWith(s, i)) {
        return { code: code2, statement: s };
      }
    }
  }
  return null;
}

// Python difflib.SequenceMatcher.ratio()의 재귀적 최장 공통 부분열 알고리즘을 포팅.
function sequenceMatcherRatio(a: string, b: string): number {
  function countMatches(x: string, y: string): number {
    if (!x.length || !y.length) return 0;
    let best = 0, bestI = 0, bestJ = 0;
    const dp: number[] = new Array((x.length + 1) * (y.length + 1)).fill(0);
    const cols = y.length + 1;
    for (let i = 1; i <= x.length; i++) {
      for (let j = 1; j <= y.length; j++) {
        if (x[i - 1] === y[j - 1]) {
          const v = dp[(i - 1) * cols + (j - 1)] + 1;
          dp[i * cols + j] = v;
          if (v > best) { best = v; bestI = i; bestJ = j; }
        }
      }
    }
    if (best === 0) return 0;
    const left = countMatches(x.slice(0, bestI - best), y.slice(0, bestJ - best));
    const right = countMatches(x.slice(bestI), y.slice(bestJ));
    return best + left + right;
  }
  if (!a.length && !b.length) return 1;
  const m2 = countMatches(a, b);
  return (2 * m2) / (a.length + b.length);
}
type StatementCheck = { tag: 'MISMATCH' | 'WARN'; message: string } | null;

function matchStatement(rec: StandardRecord, window: string): { exact: boolean; ratio: number } {
  const s = norm(rec.statement);
  if (!s) return { exact: false, ratio: -1 };
  if (norm(window).includes(s)) return { exact: true, ratio: 1 };
  const h = norm(head(window));
  return { exact: false, ratio: sequenceMatcherRatio(s, h.slice(0, s.length)) };
}

function checkStatement(
  rec: StandardRecord,
  window: string,
  sindex: Map<string, StatementIndexEntry[]>,
): StatementCheck {
  const { exact, ratio } = matchStatement(rec, window);
  if (exact) {
    if (rec.statement_verified !== true) {
      const src = rec.statement_verified === false
        ? '두 출처가 서로 다른 문장을 싣고 있다'
        : '대조할 독립 출처가 없어 교차검증하지 못했다';
      return {
        tag: 'WARN',
        message: '인용은 데이터셋 원문과 일치하나 그 원문이 미검증: ' + src + '. 공식 문서에 쓰기 전 고시본 확인 권장',
      };
    }
    return null;
  }
  if (ratio >= ALTERED) {
    return { tag: 'MISMATCH', message: '\uc9c4\uc220\ubb38\uc774 \uc6d0\ubb38\uacfc \ub2e4\ub984' };
  }
  const other = quotedElsewhere(norm(head(window)), rec.code, sindex);
  if (other) {
    return {
      tag: 'MISMATCH',
      message: '\uc778\uc6a9\ub41c \ubb38\uc7a5\uc740 [' + other.code + ']\uc758 \uc9c4\uc220\ubb38\uc774\ub2e4 \u2014 \ucf54\ub4dc\ub97c \uc798\ubabb \ubd99\uc600\uac70\ub098 \uc9c4\uc220\ubb38\uc744 \uc798\ubabb \uac00\uc838\uc654\ub2e4',
    };
  }
  if (slotSentence(window)) {
    return {
      tag: 'MISMATCH',
      message: '\ucf54\ub4dc \ubc14\ub85c \ub4a4\uac00 \uc6d0\ubb38\uc774 \uc544\ub2cc \ubb38\uc7a5\uc774\ub2e4(2015 \uac1c\uc815 \uc9c4\uc220\ubb38\uc774\uac70\ub098 \uc9c0\uc5b4\ub0b8 \ubb38\uc7a5). \uc778\uc6a9\uc774\ub77c\uba74 \uae00\uc790\uae4c\uc9c0 \uc6d0\ubb38\uacfc \uac19\uc544\uc57c \ud558\uace0, \uc9c0\ub3c4 \uba54\ubaa8\ub77c\uba74 \ucf54\ub4dc\uc5d0 \ubd99\uc774\uc9c0 \ub9d0\uace0 \uc904\uc744 \ub098\ub220 \uc801\uc5b4\ub77c',
    };
  }
  return null;
}

interface LevelFinding { tag: 'LVLNONE' | 'LVLMISS' | 'LVLDIFF'; grade: string; message: string; }

function checkLevels(rec: StandardRecord, region: string): LevelFinding[] {
  const out: LevelFinding[] = [];
  const levels = rec.levels ?? {};
  for (const line of region.split('\n')) {
    const m = LEVEL_LINE_RE.exec(line);
    if (!m) continue;
    const grade = m[1].toUpperCase();
    const claim = m[2].trim();
    if (norm(claim).length < MIN_LEVEL_CLAIM) continue;
    const gradeKey = grade as keyof typeof levels;
    if (Object.keys(levels).length === 0) {
      out.push({ tag: 'LVLNONE', grade, message: '\uc774 \uc131\ucde8\uae30\uc900\uc5d0\ub294 \uc131\ucde8\uc218\uc900\uc774 \uc218\ub85d\ub3fc \uc788\uc9c0 \uc54a\uc544 \uc778\uc6a9\uc744 \uac80\uc99d\ud560 \uc218 \uc5c6\ub2e4. \uc6d0\ubb38 \uc131\ucde8\uc218\uc900\ud45c\ub97c \ud655\uc778\ud558\ub77c' });
    } else if (!levels[gradeKey]) {
      const has = Object.keys(levels).sort().join('\u00b7');
      out.push({ tag: 'LVLMISS', grade, message: '\uc774 \uc131\ucde8\uae30\uc900\uc5d0 ' + grade + '\uc218\uc900 \uc11c\uc220\ubb38\uc774 \uc5c6\ub2e4 (\uc218\ub85d\ub41c \ub4f1\uae09: ' + has + '). \ub4f1\uae09\uc744 \uc9c0\uc5b4\ub0b4\uc9c0 \ub9c8\ub77c' });
    } else if (!norm(claim).includes(norm(levels[gradeKey]))) {
      const swapped = Object.entries(levels).find(
        ([g, t]) => g !== grade && t && norm(claim).includes(norm(t)),
      );
      const why = swapped ? ' \u2014 \uc2e4\uc81c\ub85c\ub294 ' + swapped[0] + '\uc218\uc900 \uc11c\uc220\ubb38\uc774\ub2e4' : '';
      out.push({
        tag: 'LVLDIFF',
        grade,
        message: grade + '\uc218\uc900 \uc11c\uc220\ubb38\uc774 \uc6d0\ubb38\uacfc \ub2e4\ub984' + why + '\n  \uc6d0\ubb38: ' + levels[gradeKey],
      });
    }
  }
  return out;
}
/**
 * 문서 텍스트에서 성취기준 인용을 검증한다. school을 지정하면 학교급 일관성도 본다.
 * WARN_ONLY_TAGS에 속한 태그는 경고, 나머지는 문제(exit 1에 해당)로 취급한다.
 */
/**
 * 데이터베이스 맵을 직접 전달받아 텍스트 속 성취기준 인용을 검증한다. (Node.js 테스트 및 독립 실행 지원)
 */
export function verifyTextWithDb(
  text: string,
  db: Map<string, StandardRecord[]>,
  school?: 'M' | 'E' | 'H' | '초' | '중' | '고'
): VerifyFinding[] {
  const sindex = buildStatementIndex(db);
  const normalizedText = text.replace(/\u0000/g, '').normalize('NFC');
  const codes = findCodes(normalizedText);
  const out: VerifyFinding[] = [];
  const said = new Set<string>();

  const say = (key: string, tag: VerifyTag, code: string, where: string, message: string) => {
    if (!said.has(key)) {
      said.add(key);
      out.push({ tag, code, where, message });
    }
  };

  codes.forEach((hit, i) => {
    const recs = db.get(hit.code);
    if (!recs || recs.length === 0) {
      say('FAKE:' + hit.code, 'FAKE', hit.code, '',
        '\uc774 \ub370\uc774\ud130\uc14b\uc5d0 \uc5c6\ub294 \ucf54\ub4dc. \uc9c0\uc5b4\ub0b8 \ucf54\ub4dc\uc774\uac70\ub098, \uc774 \ub370\uc774\ud130\uc14b\uc774 \ub2e4\ub8e8\uc9c0 \uc54a\ub294 \uacfc\ubaa9(\uc804\ubb38 \uad50\uacfc\u00b7\uad50\uc591 \ub4f1)\uc774\ub2e4. \uc6d0\ubb38 \uace0\uc2dc\ubcf8\uc73c\ub85c \ud655\uc778\ud558\uae30 \uc804\uc5d0\ub294 \uc778\uc6a9\ud558\uc9c0 \ub9c8\ub77c');
      return;
    }
    const nextStart = i + 1 < codes.length ? codes[i + 1].start : normalizedText.length;
    const window = normalizedText.slice(hit.end, Math.min(nextStart, hit.end + WINDOW));
    const region = normalizedText.slice(hit.end, Math.min(nextStart, hit.end + LEVEL_WINDOW));

    const rec = recs.reduce((best, r) => {
      const a = matchStatement(r, window);
      const b = matchStatement(best, window);
      const aScore = (a.exact ? 1 : 0) + a.ratio + (r.statement !== null ? 0.001 : 0);
      const bScore = (b.exact ? 1 : 0) + b.ratio + (best.statement !== null ? 0.001 : 0);
      return aScore >= bScore ? r : best;
    }, recs[0]);
    const where = recs.length > 1 ? ' (' + rec.subject + ')' : '';

    if (school && !recs.some((r) => r.school === school)) {
      say('LEVEL:' + hit.code, 'LEVEL', hit.code, '',
        recs[0].school + ' \uc131\ucde8\uae30\uc900\uc778\ub370 \ubb38\uc11c\ub294 ' + school + ' \ub300\uc0c1');
    }

    if (rec.statement === null) {
      say('NOSTMT:' + hit.code, 'NOSTMT', hit.code, where,
        '\ucf54\ub4dc\ub294 \uc2e4\uc7ac\ud558\ub098 \uc6d0\ubb38 \uc190\uc0c1\uc73c\ub85c \uc9c4\uc220\ubb38 \ubbf8\uc218\ub85d. \uc778\uc6a9\ubb38\uc744 \uac80\uc99d\ud560 \uc218 \uc5c6\uc73c\ub2c8 \uc6d0\ubb38 \uace0\uc2dc\ubcf8\uc744 \ud655\uc778\ud558\ub77c');
    } else {
      const hitResult = checkStatement(rec, window, sindex);
      if (hitResult) {
        const msg = hitResult.message + (hitResult.tag === 'MISMATCH' ? '\n  \uc6d0\ubb38: ' + rec.statement : '');
        say(hitResult.tag + ':' + hit.code, hitResult.tag, hit.code, where, msg);
      }
    }

    for (const lvl of checkLevels(rec, region)) {
      say(lvl.tag + ':' + hit.code + ':' + lvl.grade, lvl.tag, hit.code, where, lvl.message);
    }
  });

  return out;
}

/**
 * 문서 텍스트에서 성취기준 인용을 검증한다. school을 지정하면 학교급 일관성도 본다.
 * WARN_ONLY_TAGS에 속한 태그는 경고, 나머지는 문제(exit 1에 해당)로 취급한다.
 */
export async function verifyDocument(text: string, school?: 'M' | 'E' | 'H' | '초' | '중' | '고'): Promise<VerifyFinding[]> {
  const db = await loadStandardsDb();
  return verifyTextWithDb(text, db, school);
}

export function isProblem(finding: VerifyFinding): boolean {
  return finding.tag !== 'WARN' && finding.tag !== 'LVLNONE';
}

const LABEL: Record<VerifyTag, string> = {
  FAKE: 'FAKE',
  MISMATCH: 'MISMATCH',
  NOSTMT: 'NOSTMT',
  LEVEL: 'LEVEL',
  WARN: 'WARN',
  LVLDIFF: 'LVLDIFF',
  LVLMISS: 'LVLMISS',
  LVLNONE: 'LVLNONE',
};

export function formatFindingsText(findings: VerifyFinding[]): string {
  return findings
    .map((f) => LABEL[f.tag] + ' [' + f.code + ']' + f.where + ' \u2014 ' + f.message)
    .join('\n');
}
