import React, { useState, useEffect } from 'react';
import { useSeteukStore } from '../store/useSeteukStore';
import type { School } from '../types/standard';
import type { GeminiFreeModel } from '../types/seteuk';
import { ENGLISH_2022_COURSES } from '../lib/english/templates';
import { Key, Eye, EyeOff, ExternalLink, ShieldCheck, CheckCircle2, Trash2 } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSeteukStore();
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState<GeminiFreeModel>(
    settings.model === 'gemini-1.5-flash' ? 'gemini-2.5-flash' : settings.model
  );
  const [schoolLevel, setSchoolLevel] = useState<School>(settings.schoolLevel);
  const [defaultSubject, setDefaultSubject] = useState(settings.defaultSubject);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey(settings.apiKey);
      setModel(settings.model === 'gemini-1.5-flash' ? 'gemini-2.5-flash' : settings.model);
      setSchoolLevel(settings.schoolLevel);
      setDefaultSubject(settings.defaultSubject);
      setSavedNotice(false);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({
      apiKey: apiKey.trim(),
      model,
      schoolLevel,
      defaultSubject: defaultSubject.trim() || '공통영어1',
    });
    setSavedNotice(true);
    setTimeout(() => {
      setSavedNotice(false);
      onClose();
    }, 600);
  };

  const handleClearKey = () => {
    setApiKey('');
    updateSettings({ apiKey: '' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden border border-gray-100">
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-indigo-50/50 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-sm">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-gray-900">앱 환경 설정 (BYOK)</h2>
              <p className="text-xs text-gray-500">개인 Gemini 무료 등급 API 키 및 기본 과목 설정</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-white/80 transition-colors"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Gemini API Key */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                Gemini API Key (본인 키)
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">무료 등급</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium hover:underline"
              >
                Google AI Studio 발급
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy... (직접 발급한 무료 API 키 입력)"
                className="w-full border border-gray-300 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                aria-label={showKey ? '키 숨기기' : '키 보기'}
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="flex items-start justify-between gap-2 text-xs text-gray-500 pt-1">
              <div className="flex items-start gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>API 키는 외부 서버에 저장되지 않고 현재 브라우저의 <strong>localStorage</strong>에만 보관됩니다. 공용 PC에서는 사용 후 키를 삭제하세요.</span>
              </div>
              {apiKey && (
                <button
                  type="button"
                  onClick={handleClearKey}
                  className="shrink-0 flex items-center gap-1 text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  삭제
                </button>
              )}
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-800">Gemini 무료 등급 모델</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setModel('gemini-2.5-flash')}
                className={`border rounded-xl p-3 text-left transition-all ${
                  model === 'gemini-2.5-flash'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 text-blue-900 font-semibold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-sm">gemini-2.5-flash</div>
                <div className="text-xs text-gray-500 font-normal mt-0.5">자연스러운 문장 구성 (추천)</div>
              </button>
              <button
                type="button"
                onClick={() => setModel('gemini-2.5-flash-lite')}
                className={`border rounded-xl p-3 text-left transition-all ${
                  model === 'gemini-2.5-flash-lite'
                    ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-500/20 text-blue-900 font-semibold'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-sm">gemini-2.5-flash-lite</div>
                <div className="text-xs text-gray-500 font-normal mt-0.5">빠른 응답 · 넉넉한 무료 한도</div>
              </button>
            </div>
          </div>

          {/* School Level & Default Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-800">기본 학교급</label>
              <select
                value={schoolLevel}
                onChange={(e) => setSchoolLevel(e.target.value as School)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="고">고등학교</option>
                <option value="중">중학교</option>
                <option value="초">초등학교</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-800">기본 영어 과목</label>
              <input
                type="text"
                list="english-courses-list"
                value={defaultSubject}
                onChange={(e) => setDefaultSubject(e.target.value)}
                placeholder="예: 공통영어1"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="english-courses-list">
                {ENGLISH_2022_COURSES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all flex items-center gap-1.5"
            >
              {savedNotice ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  저장 완료!
                </>
              ) : (
                '설정 저장'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
