import { useState, useEffect } from 'react';
import type { School, StandardRecord } from '../types/standard';
import { lookupStandards, trustLabel } from '../lib/standards/lookup';
import { ENGLISH_2022_COURSES } from '../lib/english/templates';
import { Search, Plus, Check, BookOpen } from 'lucide-react';

interface StandardSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (standard: StandardRecord) => void;
  selectedCodes: string[];
  schoolLevel: School;
  defaultSubject?: string;
}

export default function StandardSelectModal({
  isOpen,
  onClose,
  onSelect,
  selectedCodes,
  schoolLevel,
  defaultSubject,
}: StandardSelectModalProps) {
  const [keyword, setKeyword] = useState('');
  const [subject, setSubject] = useState(defaultSubject || '공통영어1');
  const [results, setResults] = useState<StandardRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const runSearch = async (targetSubject?: string, targetKeyword?: string) => {
    setLoading(true);
    try {
      const subj = targetSubject !== undefined ? targetSubject : subject;
      const kw = targetKeyword !== undefined ? targetKeyword : keyword;
      const list = await lookupStandards({
        school: schoolLevel,
        subject: subj.trim() || undefined,
        keyword: kw.trim() || undefined,
      });
      setResults(list.slice(0, 40));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      const nextSubj = defaultSubject || '공통영어1';
      setSubject(nextSubj);
      runSearch(nextSubj, keyword);
    }
  }, [isOpen, defaultSubject, schoolLevel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden border border-gray-100">
        {/* 헤더 */}
        <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">2022 개정 성취기준 연계</h2>
              <p className="text-xs text-gray-500">공통영어·영어Ⅰ/Ⅱ 등 공식 성취기준을 검색하여 연결합니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-white transition-colors"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* 빠른 영어과 과목 칩 */}
        {schoolLevel === '고' && (
          <div className="px-4 pt-3 pb-1 flex flex-wrap gap-1.5 bg-slate-50/70 border-b border-gray-100">
            {['공통영어1', '공통영어2', '영어Ⅰ', '영어Ⅱ', '영어 독해와 작문', '영어 발표와 토론', '심화 영어'].map(
              (c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setSubject(c);
                    runSearch(c, keyword);
                  }}
                  className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                    subject === c
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {c}
                </button>
              )
            )}
          </div>
        )}

        {/* 검색 필터 바 */}
        <div className="p-3 sm:p-4 border-b border-gray-100 bg-white flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            list="modal-english-courses"
            placeholder="과목/교과 (예: 공통영어1, 영어)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full sm:w-40 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <datalist id="modal-english-courses">
            {ENGLISH_2022_COURSES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="키워드 검색 (예: 발표, 요약, 논리, 매체)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && runSearch()}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={() => runSearch()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm shrink-0"
          >
            검색
          </button>
        </div>

        {/* 결과 목록 */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5">
          {loading ? (
            <div className="py-12 text-center text-gray-400 text-sm">성취기준 데이터를 조회 중입니다...</div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              검색 결과가 없습니다. 과목명을 비우거나 다른 키워드로 검색해보세요.
            </div>
          ) : (
            results.map((r) => {
              const isSelected = selectedCodes.includes(r.code);
              return (
                <div
                  key={`${r.code}-${r.course}-${r.subject}`}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        [{r.code}]
                      </span>
                      <span className="text-xs font-medium text-gray-600">{r.course || r.subject}</span>
                      <span className="text-xs text-gray-400">· {r.grade_band}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelect(r)}
                      disabled={isSelected}
                      className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white cursor-default'
                          : 'bg-gray-100 hover:bg-blue-600 hover:text-white text-gray-700'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          연계됨
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          추가
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-800 leading-relaxed font-normal">
                    {r.statement || '(진술문 미수록)'}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-gray-400">
                    <span>{trustLabel(r)}</span>
                    {r.area && <span>· 영역: {r.area}</span>}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
