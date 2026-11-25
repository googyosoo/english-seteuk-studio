import { useState } from 'react';
import { useSeteukStore } from './store/useSeteukStore';
import StudioView from './components/StudioView';
import StandardLookupPanel from './components/StandardLookupPanel';
import StandardVerifierPanel from './components/StandardVerifierPanel';
import SettingsModal from './components/SettingsModal';
import StudentManagerModal from './components/StudentManagerModal';
import { exportSeteukToCsv, exportSeteukToXlsx } from './lib/utils/export';
import {
  Sparkles,
  Users,
  Settings,
  Download,
  FileSpreadsheet,
  BookOpen,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

type MainTab = 'studio' | 'standards';

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>('studio');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [exportToast, setExportToast] = useState<string | null>(null);

  const { students, drafts, settings } = useSeteukStore();

  const notifyExport = (msg: string) => {
    setExportToast(msg);
    setTimeout(() => setExportToast(null), 2600);
  };

  const handleExportCsv = () => {
    const count = exportSeteukToCsv(students, drafts);
    notifyExport(
      count > 0
        ? `CSV 내보내기 완료 (${count}건)`
        : '저장된 세특 초안이 없어 빈 양식(헤더)만 저장했습니다.'
    );
  };

  const handleExportXlsx = () => {
    const count = exportSeteukToXlsx(students, drafts);
    notifyExport(
      count > 0
        ? `엑셀(.xlsx) 내보내기 완료 (${count}건)`
        : '저장된 세특 초안이 없어 빈 양식(헤더)만 저장했습니다.'
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-x-hidden">
      {/* 1. 상단 글로벌 네비게이션 바 (390px 모바일 대응) */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-0 sm:h-16 flex flex-wrap items-center justify-between gap-2">
          {/* 브랜드 로고 및 타이틀 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-md shadow-blue-500/20 shrink-0">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-extrabold text-slate-900 text-sm sm:text-base tracking-tight whitespace-nowrap">
                  영어 세특 스페셜
                </span>
                <span className="text-[10px] sm:text-[11px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 whitespace-nowrap">
                  2022 개정 성취기준
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium hidden lg:block">
                말하기·쓰기 산출물 기반 · 고시 3,294건 원문 대조 · Gemini 무료(BYOK) · PII 로컬 격리
              </p>
            </div>
          </div>

          {/* 우측 유틸리티 버튼 */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 sm:order-3">
            <button
              onClick={() => setShowGuide((v) => !v)}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                showGuide
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:text-blue-700'
              }`}
              title="수업 사용 안내"
              aria-label="수업 사용 안내"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">사용법</span>
            </button>

            <button
              onClick={() => setIsStudentModalOpen(true)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm"
              title="학생 목록 관리"
              aria-label="학생 관리"
            >
              <Users className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">학생 ({students.length})</span>
            </button>

            <button
              onClick={handleExportXlsx}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 bg-white border border-emerald-200 rounded-xl transition-all shadow-sm"
              title="작성된 세특 엑셀(.xlsx) 다운로드"
              aria-label="엑셀 내보내기"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span className="hidden md:inline">엑셀</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-blue-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm"
              title="작성된 세특 CSV 다운로드"
              aria-label="CSV 내보내기"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">CSV</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shadow-sm ${
                settings.apiKey
                  ? 'bg-white border-slate-200 text-slate-700 hover:text-blue-700'
                  : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
              }`}
              title="Gemini API 설정"
              aria-label="API 설정"
            >
              <Settings className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {settings.apiKey ? '설정' : 'API 키'}
              </span>
            </button>
          </div>

          {/* 네비게이션 탭 (모바일에서는 두 번째 줄 전체 폭 사용) */}
          <div className="w-full sm:w-auto sm:order-2 flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('studio')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'studio'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              세특 스튜디오
            </button>
            <button
              onClick={() => setActiveTab('standards')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'standards'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              성취기준 도구
            </button>
          </div>
        </div>
      </header>

      {/* 내보내기 알림 토스트 */}
      {exportToast && (
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 pt-3">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium px-4 py-2.5 rounded-xl flex items-center justify-between">
            <span>{exportToast}</span>
            <button onClick={() => setExportToast(null)} className="font-bold ml-3">✕</button>
          </div>
        </div>
      )}

      {/* 수업 사용 안내 배너 */}
      {showGuide && (
        <div className="max-w-7xl w-full mx-auto px-3 sm:px-6 pt-4">
          <div className="bg-white border border-indigo-200 rounded-2xl p-4 shadow-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-indigo-950">교사용 수업·생활기록부 활용 안내 (4단계)</h2>
              <button
                onClick={() => setShowGuide(false)}
                className="text-xs text-slate-400 hover:text-slate-700 px-2 py-0.5"
              >
                닫기 ✕
              </button>
            </div>
            <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs text-slate-700">
              <li className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-blue-700 block mb-1">1. 과목·활동 유형 선택</strong>
                2022 개정 영어과 과목(공통영어1/2, 영어Ⅰ/Ⅱ 등)을 고르고, 발표·에세이·토론·프로젝트 관찰 템플릿으로 수업 기록을 남깁니다.
              </li>
              <li className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-blue-700 block mb-1">2. 비식별 AI 초안 생성</strong>
                우측 상단 [설정]에 본인 Gemini 무료 키(BYOK)를 입력하면, 학생 실명·학번을 자동 가명화한 뒤 세특 초안을 생성합니다.
              </li>
              <li className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-blue-700 block mb-1">3. 바이트·금지어·원문 검증</strong>
                에디터에서 NEIS 바이트(1,500B), 기재금지 표현(어학시험·상호명·주어 서술), 성취기준 고시 원문 일치 여부를 실시간 확인합니다.
              </li>
              <li className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                <strong className="text-blue-700 block mb-1">4. 엑셀(.xlsx) · CSV 일괄 저장</strong>
                검증이 끝난 초안은 상단 [엑셀] 또는 [CSV] 버튼으로 내려받아 NEIS 업로드 전 최종 검토 자료로 보관할 수 있습니다.
              </li>
            </ol>
          </div>
        </div>
      )}

      {/* 2. 메인 컨텐츠 영역 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6">
        {activeTab === 'studio' ? (
          <StudioView
            onOpenStudentModal={() => setIsStudentModalOpen(true)}
            onOpenSettingsModal={() => setIsSettingsOpen(true)}
          />
        ) : (
          <div className="space-y-5">
            <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-blue-700 shrink-0" />
              <div className="text-xs text-blue-900 leading-relaxed">
                <strong>2022 개정 교육과정 성취기준 3,294건</strong> (초 611 · 중 704 · 고 1,979, 고교 영어 209건 포함)을 검색하거나,
                작성한 수업지도안·세특 문서를 붙여넣어 인용된 코드와 고시 원문 일치 여부를 전수 검증합니다.
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <StandardLookupPanel />
              <StandardVerifierPanel />
            </div>
          </div>
        )}
      </main>

      {/* 3. 푸터 */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>학생 개인식별정보(PII) 브라우저 로컬 격리 · AI 전송 전 자동 가명화 · 허위 성취기준 차단</span>
          </div>
          <span>데이터 출처: 교육부 고시 제2022-33호 (kr-curriculum-2022)</span>
        </div>
      </footer>

      {/* 모달 */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <StudentManagerModal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} />
    </div>
  );
}
