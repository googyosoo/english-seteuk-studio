import { useState } from 'react';
import type { School, StandardRecord } from '../types/standard';
import { lookupStandards, trustLabel } from '../lib/standards/lookup';

const SCHOOLS: School[] = ['초', '중', '고'];
const SCHOOL_LABEL: Record<School, string> = { '초': '초등학교', '중': '중학교', '고': '고등학교' };

export default function StandardLookupPanel() {
  const [school, setSchool] = useState<School | ''>('고');
  const [subject, setSubject] = useState('공통영어1');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<StandardRecord[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const found = await lookupStandards({
        school: school || undefined,
        subject: subject || undefined,
        keyword: keyword || undefined,
      });
      setResults(found.slice(0, 50));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow p-5 space-y-4">
      <h2 className="text-lg font-bold">성취기준 조회</h2>
      <p className="text-sm text-gray-500">
        2022 개정 교육과정 성취기준 3,294건에서 코드/진술문/성취수준(A~E)을 검색합니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={school}
          onChange={(e) => setSchool(e.target.value as School | '')}
        >
          <option value="">학교급 전체</option>
          {SCHOOLS.map((s) => (
            <option key={s} value={s}>{SCHOOL_LABEL[s]}</option>
          ))}
        </select>
        <input
          className="border rounded px-2 py-1 text-sm"
          placeholder="과목 (예: 공통영어1, 영어)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <input
          className="border rounded px-2 py-1 text-sm flex-1 min-w-[160px]"
          placeholder="키워드 (예: 발표, 요약, 논리)"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && runSearch()}
        />
        <button
          className="bg-blue-600 text-white rounded px-4 py-1 text-sm font-medium disabled:opacity-50"
          onClick={runSearch}
          disabled={loading}
        >
          {loading ? '검색 중...' : '검색'}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {results && (
        <div className="space-y-3 max-h-[420px] overflow-y-auto">
          <p className="text-xs text-gray-400">{results.length}건 표시 (최대 50건)</p>
          {results.map((r) => (
            <div key={r.school + r.subject + r.code} className="border rounded-lg p-3 text-sm">
              <div className="font-mono font-semibold text-blue-700">[{r.code}]</div>
              <div className="mt-1">{r.statement ?? '(진술문 미수록)'}</div>
              <div className="mt-1 text-xs text-gray-500">
                {r.school}·{r.subject}·{r.course} — {trustLabel(r)}
              </div>
              {Object.keys(r.levels ?? {}).length > 0 && (
                <ul className="mt-2 text-xs text-gray-600 list-disc list-inside">
                  {Object.entries(r.levels).map(([grade, text]) => (
                    <li key={grade}>{grade}수준: {text}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
