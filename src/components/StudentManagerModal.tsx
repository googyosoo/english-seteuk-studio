import React, { useState } from 'react';
import { useSeteukStore } from '../store/useSeteukStore';
import type { Student } from '../types/seteuk';
import { Users, UserPlus, Search, Trash2, Edit2, Check, ArrowRight } from 'lucide-react';

interface StudentManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StudentManagerModal({ isOpen, onClose }: StudentManagerModalProps) {
  const { students, selectedStudentId, selectStudent, addStudent, updateStudent, deleteStudent } = useSeteukStore();

  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 폼 상태
  const [studentNumber, setStudentNumber] = useState('');
  const [name, setName] = useState('');
  const [grade, setGrade] = useState(2);
  const [memo, setMemo] = useState('');

  if (!isOpen) return null;

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.studentNumber.includes(search)
  );

  const resetForm = () => {
    setStudentNumber('');
    setName('');
    setGrade(2);
    setMemo('');
    setIsAdding(false);
    setEditingId(null);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsAdding(true);
  };

  const handleStartEdit = (student: Student) => {
    setIsAdding(false);
    setEditingId(student.id);
    setStudentNumber(student.studentNumber);
    setName(student.name);
    setGrade(student.grade);
    setMemo(student.memo || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentNumber.trim() || !name.trim()) return;

    if (editingId) {
      updateStudent(editingId, {
        studentNumber: studentNumber.trim(),
        name: name.trim(),
        grade: Number(grade),
        memo: memo.trim(),
      });
    } else {
      addStudent({
        studentNumber: studentNumber.trim(),
        name: name.trim(),
        grade: Number(grade),
        memo: memo.trim(),
      });
    }
    resetForm();
  };

  const handleSelectAndClose = (id: string) => {
    selectStudent(id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
        {/* 헤더 */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-slate-800 text-white rounded-xl shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">학생 명단 관리</h2>
              <p className="text-xs text-gray-500">학생 정보는 브라우저 로컬 저장소에만 보관됩니다.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1.5 hover:bg-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* 상단 툴바 */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between gap-3 bg-white">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="학번 또는 이름 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {!isAdding && !editingId && (
            <button
              onClick={handleStartAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              학생 추가
            </button>
          )}
        </div>

        {/* 본문 (폼 또는 목록) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {(isAdding || editingId) && (
            <form onSubmit={handleSubmit} className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-blue-900">
                  {editingId ? '학생 정보 수정' : '새 학생 등록'}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  취소
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  placeholder="학번 (예: 10101)"
                  value={studentNumber}
                  onChange={(e) => setStudentNumber(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  required
                />
                <input
                  type="text"
                  placeholder="이름 (예: 홍길동)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                  required
                />
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white"
                >
                  <option value={1}>1학년</option>
                  <option value={2}>2학년</option>
                  <option value={3}>3학년</option>
                </select>
              </div>
              <input
                type="text"
                placeholder="특이사항 메모 (선택)"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm bg-white"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                >
                  {editingId ? '수정 완료' : '등록'}
                </button>
              </div>
            </form>
          )}

          {filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              등록된 학생이 없습니다. 학생을 등록해주세요.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredStudents.map((s) => {
                const isSelected = s.id === selectedStudentId;
                return (
                  <div
                    key={s.id}
                    className={`py-3 px-3 rounded-xl flex items-center justify-between transition-colors ${
                      isSelected ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                        {s.name.slice(0, 1)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">{s.name}</span>
                          <span className="text-xs text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                            {s.studentNumber}
                          </span>
                          <span className="text-xs text-gray-400">{s.grade}학년</span>
                        </div>
                        {s.memo && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{s.memo}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleStartEdit(s)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        title="수정"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`'${s.name}' 학생과 모든 활동 기록을 삭제하시겠습니까?`)) {
                            deleteStudent(s.id);
                          }
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleSelectAndClose(s.id)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 hover:bg-blue-100 text-gray-700 hover:text-blue-700'
                        }`}
                      >
                        {isSelected ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            선택됨
                          </>
                        ) : (
                          <>
                            선택
                            <ArrowRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
