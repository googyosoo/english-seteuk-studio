import type { LookupFilter, StandardRecord } from '../../types/standard';
import { loadStandardsDb } from './client';

/**
 * scripts/lookup.py 포팅.
 * 성취기준을 코드/학교급/과목/과정/키워드로 검색한다.
 * code가 주어지면 다른 필터는 무시하고 그 코드의 전체 레코드를 반환한다(교과가 다르면 여러 건).
 */
export async function lookupStandards(filter: LookupFilter): Promise<StandardRecord[]> {
  const db = await loadStandardsDb();

  if (filter.code) {
    return db.get(filter.code) ?? [];
  }

  const normalizeText = (s?: string | null) => (s ?? '').replace(/\s+/g, '').toLowerCase();
  const subjectFilter = filter.subject ? normalizeText(filter.subject) : '';

  const all = Array.from(db.values()).flat();
  return all.filter((r) => {
    if (filter.school && r.school !== filter.school) return false;
    if (subjectFilter) {
      const subj = normalizeText(r.subject);
      const course = normalizeText(r.course);
      if (subj !== subjectFilter && course !== subjectFilter && !course.includes(subjectFilter)) {
        return false;
      }
    }
    if (filter.course && r.course !== filter.course) return false;
    if (filter.keyword) {
      const kw = filter.keyword.trim();
      const haystack = `${r.statement ?? ''} ${r.code ?? ''} ${r.course ?? ''}`;
      if (!haystack.includes(kw)) return false;
    }
    return true;
  });
}

/** 코드 목록에 해당하는 성취기준 레코드를 조회한다. */
export async function lookupStandardsByCodes(codes: string[]): Promise<StandardRecord[]> {
  if (!codes || codes.length === 0) return [];
  const db = await loadStandardsDb();
  const out: StandardRecord[] = [];
  for (const code of codes) {
    const recs = db.get(code);
    if (recs && recs.length > 0) {
      out.push(recs[0]);
    }
  }
  return out;
}

/** 신뢰 등급 표시. verify.py의 WARN 사유와 동일한 3단계. */
export function trustLabel(rec: StandardRecord): string {
  const src = rec.statement_source === '별책' ? '별책' : rec.statement_source;
  if (rec.statement_verified === true) return `교차검증됨·${src}`;
  if (rec.statement_verified === false) return `출처 불일치·${src}`;
  return `단일 출처·${src}`;
}

/** README의 --format md 출력과 동일한 형태의 마크다운 문자열을 만든다. */
export function formatLookupResultsMarkdown(records: StandardRecord[]): string {
  const lines: string[] = [];
  for (const r of records) {
    const where = `${r.school}·${r.subject}·${r.course}`;
    const statement = r.statement ?? '진술문 미수록';
    lines.push(`- **[${r.code}]** ${statement} (${where}) — ${trustLabel(r)}`);
    for (const grade of Object.keys(r.levels ?? {}).sort()) {
      lines.push(`  - ${grade}수준: ${r.levels[grade as keyof typeof r.levels]}`);
    }
  }
  return lines.join('\n');
}
