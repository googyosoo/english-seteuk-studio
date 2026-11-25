import { useState } from 'react';
import type { School, VerifyFinding } from '../types/standard';
import { verifyDocument, isProblem } from '../lib/standards/verify';

const SAMPLE = '- [10공영1-02-01] 실물, 그림, 사진, 도표 등을 활용하여 내용을 설명한다.\n- [12영Ⅰ-99-99] 지어낸 성취기준 테스트 문장이다.\n';

const TAG_STYLE: Record<string, string> = {
  FAKE: 'bg-red-100 text-red-700',
  MISMATCH: 'bg-red-100 text-red-700',
  NOSTMT: 'bg-yellow-100 text-yellow-700',
  LEVEL: 'bg-yellow-100 text-yellow-700',
  LVLDIFF: 'bg-red-100 text-red-700',
  LVLMISS: 'bg-red-100 text-red-700',
  WARN: 'bg-gray-100 text-gray-600',
  LVLNONE: 'bg-gray-100 text-gray-600',
};

export default function StandardVerifierPanel() {
  const [text, setText] = useState(SAMPLE);
  const [school, setSchool] = useState<School | ''>('고');
  const [findings, setFindings] = useState<VerifyFinding[] | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const result = await verifyDocument(text, (school || undefined) as School | undefined);
      setFindings(result);
    } finally {
      setLoading(false);
    }
  };

  const problemCount = findings?.filter(isProblem).length ?? 0;

  return (
    <section className="bg-white rounded-xl shadow p-5 space-y-4">
      <h2 className="text-lg font-bold">인용 검증 (세특/수업지도안 문서)</h2>
      <p className="text-sm text-gray-500">
        문서에 인용된 성취기준 코드·문장·성취수준이 지어낸 것은 아닌지 검사합니다.
      </p>
      <textarea
        className="w-full border rounded-lg p-3 text-sm font-mono h-40"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <select
          className="border rounded px-2 py-1 text-sm"
          value={school}
          onChange={(e) => setSchool(e.target.value as School | '')}
        >
          <option value="">학교급 미지정</option>
          <option value="초">초등학교</option>
          <option value="중">중학교</option>
          <option value="고">고등학교</option>
        </select>
        <button
          className="bg-blue-600 text-white rounded px-4 py-1 text-sm font-medium disabled:opacity-50"
          onClick={run}
          disabled={loading}
        >
          {loading ? '검사 중...' : '검증하기'}
        </button>
      </div>
      {findings && (
        <div className="space-y-2">
          <p className="text-sm font-medium">
            {problemCount === 0 ? '문제 없음' : problemCount + '건 문제 발견'} (전체 {findings.length}건)
          </p>
          {findings.map((f, i) => (
            <div key={i} className="border rounded-lg p-3 text-sm">
              <span className={'inline-block px-2 py-0.5 rounded text-xs font-semibold mr-2 ' + (TAG_STYLE[f.tag] ?? '')}>
                {f.tag}
              </span>
              <span className="font-mono font-semibold">[{f.code}]{f.where}</span>
              <div className="mt-1 whitespace-pre-wrap text-gray-700">{f.message}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
