import { useState, useEffect, useMemo } from 'react';
import { useSeteukStore } from '../store/useSeteukStore';
import { AREA_METAS, type ActivityArea, type ActivityItem, type EnglishActivityType } from '../types/seteuk';
import { calculateNeisLength } from '../lib/utils/neisByte';
import { checkNeisForbidden, checkNeisEndingStyle } from '../lib/utils/neisForbidden';
import { generateSeteukWithGemini } from '../lib/ai/gemini';
import { verifyDocument, isProblem } from '../lib/standards/verify';
import { createAnonymizedPayload } from '../lib/privacy/masking';
import {
  ENGLISH_2022_COURSES,
  ENGLISH_ACTIVITY_TEMPLATES,
  getRecommendedCodes,
  getActivityTypeMeta,
  isEnglishCourse,
} from '../lib/english/templates';
import StandardSelectModal from './StandardSelectModal';
import {
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  Plus,
  Trash2,
  Edit2,
  BookOpen,
  Calendar,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  FileText,
  Eraser,
  Lock,
} from 'lucide-react';

interface StudioViewProps {
  onOpenStudentModal: () => void;
  onOpenSettingsModal: () => void;
}

export default function StudioView({ onOpenStudentModal, onOpenSettingsModal }: StudioViewProps) {
  const {
    students,
    activities,
    selectedStudentId,
    selectedArea,
    selectedSubject,
    settings,
    setSelectedArea,
    setSelectedSubject,
    addActivity,
    updateActivity,
    deleteActivity,
    saveDraft,
    getDraft,
    deleteDraft,
  } = useSeteukStore();

  const currentStudent = students.find((s) => s.id === selectedStudentId) || students[0];
  const areaMeta = AREA_METAS[selectedArea];
  const activeSubject = selectedArea === 'subject' ? selectedSubject : undefined;

  // 현재 학생 & 영역의 활동 목록
  const currentActivities = activities.filter(
    (a) =>
      a.studentId === currentStudent?.id &&
      a.area === selectedArea &&
      (selectedArea !== 'subject' || a.subjectName === selectedSubject)
  );

  // 현재 초안 텍스트 및 검증 결과
  const currentDraft = currentStudent ? getDraft(currentStudent.id, selectedArea, activeSubject) : undefined;
  const [text, setText] = useState(currentDraft?.content || '');
  const [findings, setFindings] = useState(currentDraft?.verifiedFindings || []);

  // 학생/영역/과목 전환 시 초안 동기화
  useEffect(() => {
    if (currentStudent) {
      const draft = getDraft(currentStudent.id, selectedArea, activeSubject);
      setText(draft?.content || '');
      setFindings(draft?.verifiedFindings || []);
    } else {
      setText('');
      setFindings([]);
    }
    setErrorMessage(null);
  }, [selectedStudentId, selectedArea, selectedSubject]);

  // 활동 작성/수정 폼 상태
  const [isAddingAct, setIsAddingAct] = useState(false);
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [actType, setActType] = useState<EnglishActivityType | undefined>('speaking');
  const [actTitle, setActTitle] = useState('');
  const [actContent, setActContent] = useState('');
  const [actDate, setActDate] = useState(new Date().toISOString().slice(0, 10));
  const [actStandards, setActStandards] = useState<string[]>([]);
  const [isStdModalOpen, setIsStdModalOpen] = useState(false);

  // AI 생성 및 UI 상태
  const [customNote, setCustomNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);

  // 실시간 글자수 & 바이트 & 기재금지 검사
  const neisLength = useMemo(() => calculateNeisLength(text), [text]);
  const isByteOver = neisLength.byteCount > areaMeta.maxBytes;
  const safeTargetLow = Math.max(900, areaMeta.maxBytes - 150);
  const safeTargetHigh = Math.max(1200, areaMeta.maxBytes - 20);
  const bytePercentage = Math.min(100, Math.round((neisLength.byteCount / areaMeta.maxBytes) * 100));

  const forbiddenMatches = useMemo(
    () => checkNeisForbidden(text, currentStudent?.name),
    [text, currentStudent?.name]
  );
  const endingCheck = useMemo(() => checkNeisEndingStyle(text), [text]);

  // 텍스트 변경 시 디바운스 자동 인용 검증
  useEffect(() => {
    if (!text.trim()) {
      if (findings.length > 0) setFindings([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await verifyDocument(text, settings.schoolLevel);
        setFindings(results);
        if (currentStudent) {
          saveDraft(currentStudent.id, selectedArea, text, activeSubject, results);
        }
      } catch {
        // 네트워크/로드 일시 오류 무시
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [text, settings.schoolLevel]);

  const handleTextChange = (newText: string) => {
    setText(newText);
    if (currentStudent) {
      saveDraft(currentStudent.id, selectedArea, newText, activeSubject, findings);
    }
  };

  const runVerify = async () => {
    if (!text.trim()) return;
    setIsVerifying(true);
    try {
      const results = await verifyDocument(text, settings.schoolLevel);
      setFindings(results);
      if (currentStudent) {
        saveDraft(currentStudent.id, selectedArea, text, activeSubject, results);
      }
    } finally {
      setIsVerifying(false);
    }
  };

  // 영어과 활동 유형 템플릿 적용
  const handleApplyTemplate = (type: EnglishActivityType) => {
    const tpl = getActivityTypeMeta(type);
    if (!tpl) return;
    setEditingActId(null);
    setIsAddingAct(true);
    setActType(type);
    setActTitle(tpl.sampleTitle);
    setActContent(tpl.memoTemplate);
    setActStandards(getRecommendedCodes(type, selectedSubject));
  };

  const handleStartEditActivity = (act: ActivityItem) => {
    setIsAddingAct(true);
    setEditingActId(act.id);
    setActType(act.activityType);
    setActTitle(act.title);
    setActContent(act.content);
    setActDate(act.date || new Date().toISOString().slice(0, 10));
    setActStandards(act.standardCodes || []);
  };

  const resetActivityForm = () => {
    setActTitle('');
    setActContent('');
    setActStandards([]);
    setEditingActId(null);
    setIsAddingAct(false);
  };

  const handleSubmitActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actTitle.trim() || !actContent.trim() || !currentStudent) return;

    if (editingActId) {
      updateActivity(editingActId, {
        activityType: selectedArea === 'subject' && isEnglishCourse(selectedSubject) ? actType : undefined,
        title: actTitle.trim(),
        content: actContent.trim(),
        date: actDate,
        standardCodes: actStandards,
      });
    } else {
      addActivity({
        studentId: currentStudent.id,
        area: selectedArea,
        subjectName: activeSubject,
        activityType: selectedArea === 'subject' && isEnglishCourse(selectedSubject) ? actType : undefined,
        title: actTitle.trim(),
        content: actContent.trim(),
        date: actDate,
        standardCodes: actStandards,
      });
    }
    resetActivityForm();
  };

  // Gemini AI 문구 생성
  const handleGenerateAI = async () => {
    if (!settings.apiKey) {
      setErrorMessage('Gemini API 키가 등록되지 않았습니다. 우측 상단 [설정]에서 본인 무료 API 키를 입력해주세요.');
      return;
    }
    if (!currentStudent) {
      setErrorMessage('먼저 학생을 선택하거나 등록해주세요.');
      return;
    }
    if (currentActivities.length === 0) {
      setErrorMessage('세특을 생성하려면 좌측에 최소 1개 이상의 관찰·활동 기록을 추가해주세요.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setPrivacyNotice(null);

    try {
      // 1. PII 마스킹 처리된 익명 페이로드 생성 (실명, 학번, 연락처 가명화)
      const anonymized = createAnonymizedPayload(
        currentStudent,
        areaMeta.label,
        currentActivities,
        activeSubject
      );

      // 추가 요청사항에도 혹시 학생 실명/학번이 들어갔으면 치환
      let safeCustom = customNote.trim();
      const rawName = currentStudent.name.replace(/\(예시\)/g, '').trim();
      if (rawName.length >= 2 && safeCustom.includes(rawName)) {
        safeCustom = safeCustom.split(rawName).join('해당 학생');
      }
      if (currentStudent.studentNumber.trim().length >= 3 && safeCustom.includes(currentStudent.studentNumber.trim())) {
        safeCustom = safeCustom.split(currentStudent.studentNumber.trim()).join('[학번]');
      }

      setPrivacyNotice(
        anonymized.maskedPiiCount > 0
          ? `AI 전송 전 개인정보(${anonymized.maskedKinds.join(', ')}) ${anonymized.maskedPiiCount}건을 자동 가명화했습니다.`
          : '학생 실명·학번을 제외하고 비식별 활동 내용만 Gemini에 전송했습니다.'
      );

      // 2. Gemini 무료 API 호출
      const result = await generateSeteukWithGemini({
        apiKey: settings.apiKey,
        model: settings.model,
        schoolLevel: settings.schoolLevel,
        area: selectedArea,
        subjectName: activeSubject,
        activities: anonymized.activities,
        customInstructions: safeCustom || undefined,
      });

      // 3. 결과 반영 및 저장
      setText(result.content);
      setFindings(result.findings);
      saveDraft(currentStudent.id, selectedArea, result.content, activeSubject, result.findings);
    } catch (err: any) {
      setErrorMessage(err.message || 'AI 세특 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearDraft = () => {
    setText('');
    setFindings([]);
    if (currentStudent) {
      deleteDraft(currentStudent.id, selectedArea, activeSubject);
    }
  };

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const problemFindings = findings.filter(isProblem);
  const showEnglishTemplates = selectedArea === 'subject' && isEnglishCourse(selectedSubject);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. 상단 학생 프로필 및 과목/영역 선택 바 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-3.5 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-gray-100">
          <div className="flex items-center justify-between sm:justify-start gap-3 min-w-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                {currentStudent?.name.slice(0, 1) || '학'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm sm:text-base font-bold text-gray-900 truncate">
                    {currentStudent?.name || '학생 미선택'}
                  </span>
                  {currentStudent && (
                    <>
                      <span className="text-xs font-mono font-medium px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700">
                        {currentStudent.studentNumber}
                      </span>
                      <span className="text-xs text-gray-500">{currentStudent.grade}학년</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5 truncate">{currentStudent?.memo || '특이사항 메모 없음'}</p>
              </div>
            </div>

            <button
              onClick={onOpenStudentModal}
              className="shrink-0 text-xs font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              학생 관리
            </button>
          </div>

          {selectedArea === 'subject' && (
            <div className="flex items-center gap-2 flex-wrap">
              <label htmlFor="subject-select" className="text-xs font-semibold text-gray-600 shrink-0">
                2022 과목:
              </label>
              <select
                id="subject-select"
                value={ENGLISH_2022_COURSES.includes(selectedSubject) ? selectedSubject : '__custom__'}
                onChange={(e) => {
                  if (e.target.value !== '__custom__') {
                    setSelectedSubject(e.target.value);
                  }
                }}
                className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {ENGLISH_2022_COURSES.map((course) => (
                  <option key={course} value={course}>
                    {course}
                  </option>
                ))}
                <option value="__custom__">직접 입력...</option>
              </select>
              <input
                type="text"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                placeholder="과목명 직접 입력"
                className="w-28 sm:w-32 border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {/* 영역 선택 탭 */}
        <div className="flex flex-wrap gap-1.5 pt-3.5">
          {(Object.keys(AREA_METAS) as ActivityArea[]).map((areaKey) => {
            const meta = AREA_METAS[areaKey];
            const isSelected = selectedArea === areaKey;
            return (
              <button
                key={areaKey}
                onClick={() => setSelectedArea(areaKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 에러 / 개인정보 보호 알림 바 */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!settings.apiKey && (
              <button
                onClick={onOpenSettingsModal}
                className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700"
              >
                키 입력하기
              </button>
            )}
            <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-700 font-bold">
              ✕
            </button>
          </div>
        </div>
      )}

      {privacyNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{privacyNotice}</span>
          </div>
          <button onClick={() => setPrivacyNotice(null)} className="text-emerald-600 font-bold">✕</button>
        </div>
      )}

      {/* 2. 메인 스튜디오 2열 레이아웃 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* 좌측 컬럼: 영어과 활동 유형 템플릿 & 관찰 기록 (5열) */}
        <div className="lg:col-span-5 min-w-0 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-3.5 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  관찰 및 산출물 기록
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">
                    {currentActivities.length}건
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {showEnglishTemplates
                    ? '영어 말하기·쓰기 산출물 템플릿을 눌러 빠르게 기록하세요.'
                    : '세특 작성의 근거가 되는 관찰 기록입니다.'}
                </p>
              </div>
              {!isAddingAct && (
                <button
                  onClick={() => {
                    setEditingActId(null);
                    setIsAddingAct(true);
                  }}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  활동 추가
                </button>
              )}
            </div>

            {/* 영어과 특화 활동 유형별 빠른 템플릿 */}
            {showEnglishTemplates && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-2.5 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  영어과 관찰 메모 템플릿 (2022 성취기준 자동 연계)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-1.5">
                  {ENGLISH_ACTIVITY_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.type}
                      type="button"
                      onClick={() => handleApplyTemplate(tpl.type)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold border transition-all hover:shadow-sm text-center ${tpl.badgeColor}`}
                    >
                      + {tpl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 활동 추가 / 수정 폼 */}
            {isAddingAct && (
              <form onSubmit={handleSubmitActivity} className="p-3 bg-blue-50/60 border border-blue-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900">
                    {editingActId ? '관찰 기록 수정' : '새 관찰 기록 등록'}
                  </span>
                  <button
                    type="button"
                    onClick={resetActivityForm}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    취소
                  </button>
                </div>

                {showEnglishTemplates && (
                  <div className="flex flex-wrap gap-1">
                    {ENGLISH_ACTIVITY_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.type}
                        type="button"
                        onClick={() => setActType(tpl.type)}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          actType === tpl.type
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white text-gray-600 border-gray-200'
                        }`}
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  placeholder="활동 제목 (예: 기후 위기 영어 프레젠테이션)"
                  value={actTitle}
                  onChange={(e) => setActTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white"
                  required
                />
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={actDate}
                    onChange={(e) => setActDate(e.target.value)}
                    className="border border-gray-300 rounded-lg px-2 py-1 text-xs bg-white text-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => setIsStdModalOpen(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg font-medium"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    성취기준 연계 ({actStandards.length})
                  </button>
                </div>

                {actStandards.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {actStandards.map((code) => (
                      <span
                        key={code}
                        className="inline-flex items-center gap-1 text-[11px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded"
                      >
                        [{code}]
                        <button
                          type="button"
                          onClick={() => setActStandards(actStandards.filter((c) => c !== code))}
                          className="hover:text-red-600 font-bold"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <textarea
                  rows={4}
                  placeholder="학생의 말하기·쓰기 산출물 특징, 어휘·담화 전략, 피드백 반영 과정을 입력하세요."
                  value={actContent}
                  onChange={(e) => setActContent(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 leading-relaxed"
                  required
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                  >
                    {editingActId ? '수정 저장' : '기록 저장'}
                  </button>
                </div>
              </form>
            )}

            {/* 활동 카드 목록 */}
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {currentActivities.length === 0 ? (
                <div className="py-10 text-center text-gray-400 text-xs border border-dashed border-gray-200 rounded-xl px-3">
                  등록된 관찰 기록이 없습니다.<br />
                  위의 템플릿 또는 [활동 추가] 버튼을 눌러 기록해주세요.
                </div>
              ) : (
                currentActivities.map((act) => {
                  const typeMeta = getActivityTypeMeta(act.activityType);
                  return (
                    <div
                      key={act.id}
                      className="p-3.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300 transition-all space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {typeMeta && (
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${typeMeta.badgeColor}`}>
                                {typeMeta.shortLabel}
                              </span>
                            )}
                            <h4 className="text-xs font-bold text-gray-900 leading-tight">{act.title}</h4>
                          </div>
                          {act.date && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-1">
                              <Calendar className="w-3 h-3" />
                              <span>{act.date}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            onClick={() => handleStartEditActivity(act)}
                            className="text-gray-300 hover:text-blue-600 p-1 rounded"
                            title="활동 수정"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteActivity(act.id)}
                            className="text-gray-300 hover:text-red-500 p-1 rounded"
                            title="활동 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-gray-700 leading-relaxed font-normal whitespace-pre-wrap">
                        {act.content}
                      </p>

                      {act.standardCodes && act.standardCodes.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {act.standardCodes.map((code) => (
                            <span
                              key={code}
                              className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 font-medium"
                            >
                              [{code}]
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 우측 컬럼: 세특 작성 및 실시간 검증 스튜디오 (7열) */}
        <div className="lg:col-span-7 min-w-0 space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200/80 p-3.5 sm:p-5 space-y-3.5">
            {/* 상단 툴바 */}
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex flex-wrap items-center gap-1.5">
                  생활기록부 문구 작성
                  <span className="text-xs text-gray-400 font-normal">
                    (한도 {areaMeta.maxBytes.toLocaleString()}B / 권장 {safeTargetLow.toLocaleString()}~{safeTargetHigh.toLocaleString()}B)
                  </span>
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={runVerify}
                  disabled={isVerifying || !text.trim()}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50"
                  title="성취기준 고시 원문 일치 재검증"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
                  검증
                </button>
                <button
                  onClick={handleClearDraft}
                  disabled={!text.trim()}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50"
                  title="초안 비우기"
                >
                  <Eraser className="w-3.5 h-3.5" />
                  비우기
                </button>
                <button
                  onClick={handleCopy}
                  disabled={!text.trim()}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all disabled:opacity-50"
                  title="클립보드 복사"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? '복사됨' : '복사'}
                </button>
                <button
                  onClick={handleGenerateAI}
                  disabled={isGenerating}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl shadow-sm transition-all disabled:opacity-50"
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? '생성 중...' : 'Gemini 세특 생성'}
                </button>
              </div>
            </div>

            {/* AI 추가 지침 (선택) */}
            <input
              type="text"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="AI 추가 요청 (선택) — 예: 발표 시 어휘 활용과 동료 피드백 수용 태도를 강조해 주세요"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs bg-slate-50/70 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {/* 텍스트 에디터 */}
            <div className="relative">
              <textarea
                rows={10}
                value={text}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="좌측 관찰 기록을 바탕으로 [Gemini 세특 생성]을 누르거나, 직접 세특 문구를 입력·수정하세요."
                className="w-full border border-gray-200 rounded-xl p-3.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-blue-500 font-sans resize-y"
              />
            </div>

            {/* 실시간 NEIS 글자수 / 바이트 게이지 바 */}
            <div className="space-y-1.5 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-gray-700">NEIS 규격 분량 (한글 3B · 영문/공백 1B · 줄바꿈 2B)</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-gray-500 font-mono">
                    {neisLength.charCount}자 (공백제외 {neisLength.charCountNoSpace}자)
                  </span>
                  <span className={`font-mono font-bold ${isByteOver ? 'text-red-600' : 'text-blue-700'}`}>
                    {neisLength.byteCount.toLocaleString()} / {areaMeta.maxBytes.toLocaleString()} Bytes
                  </span>
                </div>
              </div>

              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isByteOver ? 'bg-red-500' : bytePercentage > 88 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${bytePercentage}%` }}
                />
              </div>

              {isByteOver && (
                <div className="text-[11px] text-red-600 font-semibold flex items-center gap-1 pt-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  NEIS 입력 바이트 한도를 초과했습니다. 문구를 축약해주세요.
                </div>
              )}
            </div>

            {/* NEIS 기재금지 표현 & 문체 실시간 검사 */}
            <div className="border border-gray-100 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {forbiddenMatches.length > 0 || !endingCheck.ok ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  )}
                  <span className="text-xs font-bold text-gray-800">
                    NEIS 기재금지 표현 · 실명 · 종결어미 검사
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">교육부 기재요령 기준</span>
              </div>

              {!text.trim() ? (
                <div className="text-xs text-gray-400">
                  문구를 입력하면 어학시험(TOEIC 등), 교외수상, 상용 AI·플랫폼명(ChatGPT·파파고 등), 학생 실명·주어 서술을 실시간 탐지합니다.
                </div>
              ) : forbiddenMatches.length === 0 && endingCheck.ok ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>기재금지 표현, 실명 노출, 비격식 종결어미가 발견되지 않았습니다.</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {forbiddenMatches.map((m, idx) => (
                    <div
                      key={`${m.category}-${idx}`}
                      className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                        m.severity === 'error'
                          ? 'bg-red-50/80 border-red-200 text-red-900'
                          : 'bg-amber-50/80 border-amber-200 text-amber-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold text-[10px] text-white ${
                            m.severity === 'error' ? 'bg-red-600' : 'bg-amber-600'
                          }`}
                        >
                          {m.category}
                        </span>
                        <span className="font-bold">"{m.matched}"</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">{m.reason} → {m.suggestion}</p>
                    </div>
                  ))}
                  {!endingCheck.ok && endingCheck.issue && (
                    <div className="p-2.5 rounded-xl border bg-amber-50/80 border-amber-200 text-amber-900 text-xs">
                      <strong>문체 안내:</strong> {endingCheck.issue}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2022 개정 성취기준 인라인 검증 결과 섹션 */}
            <div className="border border-gray-100 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {problemFindings.length > 0 ? (
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  )}
                  <span className="text-xs font-bold text-gray-800">
                    2022 개정 성취기준 인용 검증 결과
                  </span>
                </div>
                <span className="text-[11px] text-gray-400">교육부 고시 3,294건 전수 대조</span>
              </div>

              {findings.length === 0 ? (
                <div className="text-xs text-gray-400 py-0.5">
                  문구에 성취기준 코드(예: [10공영1-02-01])가 포함되면 실시간으로 고시 원문 일치 여부를 대조합니다.
                </div>
              ) : problemFindings.length === 0 ? (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>인용된 모든 성취기준이 2022 개정 교육과정 고시 원문과 일치합니다. (FAKE/MISMATCH 없음)</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {problemFindings.map((finding, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-red-50/80 border border-red-200 rounded-xl text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono font-bold text-[10px]">
                            {finding.tag}
                          </span>
                          <span className="font-mono font-bold text-red-900">[{finding.code}]</span>
                          {finding.where && <span className="text-red-700">{finding.where}</span>}
                        </div>
                        <span className="text-[10px] text-red-500 font-semibold">인용 오류 감지</span>
                      </div>
                      <p className="text-red-800 whitespace-pre-wrap leading-relaxed">{finding.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 성취기준 선택 모달 */}
      <StandardSelectModal
        isOpen={isStdModalOpen}
        onClose={() => setIsStdModalOpen(false)}
        selectedCodes={actStandards}
        schoolLevel={settings.schoolLevel}
        defaultSubject={selectedSubject}
        onSelect={(standard) => {
          if (!actStandards.includes(standard.code)) {
            setActStandards([...actStandards, standard.code]);
          }
        }}
      />
    </div>
  );
}
