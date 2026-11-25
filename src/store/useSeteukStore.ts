import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Student, ActivityItem, SeteukDraft, AppSettings, ActivityArea } from '../types/seteuk';
import { calculateNeisLength } from '../lib/utils/neisByte';

interface SeteukState {
  // 데이터
  students: Student[];
  activities: ActivityItem[];
  drafts: Record<string, SeteukDraft>; // key: `${studentId}_${area}_${subjectName || ''}`
  selectedStudentId: string | null;
  selectedArea: ActivityArea;
  selectedSubject: string;
  settings: AppSettings;

  // 학생 액션
  selectStudent: (id: string | null) => void;
  addStudent: (student: Omit<Student, 'id' | 'createdAt'>) => string;
  updateStudent: (id: string, patch: Partial<Student>) => void;
  deleteStudent: (id: string) => void;

  // 활동 액션
  setSelectedArea: (area: ActivityArea) => void;
  setSelectedSubject: (subject: string) => void;
  addActivity: (activity: Omit<ActivityItem, 'id' | 'createdAt'>) => string;
  updateActivity: (id: string, patch: Partial<ActivityItem>) => void;
  deleteActivity: (id: string) => void;

  // 세특 초안 액션
  saveDraft: (studentId: string, area: ActivityArea, content: string, subjectName?: string, verifiedFindings?: any[]) => void;
  getDraft: (studentId: string, area: ActivityArea, subjectName?: string) => SeteukDraft | undefined;
  deleteDraft: (studentId: string, area: ActivityArea, subjectName?: string) => void;

  // 설정 액션
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const DEFAULT_SETTINGS: AppSettings = {
  apiKey: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_API_KEY) || '',
  model: 'gemini-2.5-flash',
  schoolLevel: '고',
  defaultSubject: '공통영어1',
};

const INITIAL_STUDENTS: Student[] = [
  {
    id: 'student-sample-1',
    studentNumber: '10101',
    name: '학생A(예시)',
    grade: 1,
    memo: '영어 스피치 및 논설문 쓰기 강점, 디지털 리터러시 관심',
    createdAt: Date.now() - 1000000,
  },
  {
    id: 'student-sample-2',
    studentNumber: '20102',
    name: '학생B(예시)',
    grade: 2,
    memo: '찬반 토론 논증 우수, 다문화·사회 이슈 탐구',
    createdAt: Date.now() - 500000,
  },
];

const INITIAL_ACTIVITIES: ActivityItem[] = [
  {
    id: 'activity-sample-1',
    studentId: 'student-sample-1',
    area: 'subject',
    subjectName: '공통영어1',
    activityType: 'speaking',
    date: '2026-04-12',
    title: '기후 위기 통계 도표 활용 3분 영어 프레젠테이션',
    content: '[활동] 국제 환경 보고서의 탄소 배출 도표를 분석해 3분 영어 발표를 진행함.\n[산출물·언어] 비교급·인과관계 연결어(consequently, in contrast)를 활용해 도표 수치를 정확히 설명하고, 동료 피드백 후 도입부 훅(hook) 문장을 수정해 설득력을 높임.',
    standardCodes: ['10공영1-02-01', '10공영1-02-06'],
    createdAt: Date.now() - 900000,
  },
  {
    id: 'activity-sample-2',
    studentId: 'student-sample-2',
    area: 'subject',
    subjectName: '영어Ⅰ',
    activityType: 'debate',
    date: '2026-05-18',
    title: '디지털 리터러시 주제 영어 찬반 토론 및 비평문 작성',
    content: '[활동] 알고리즘 추천의 명암을 다룬 영문 칼럼을 읽고 모둠 찬반 토론에 참여함.\n[산출물·언어] 상대측 논거의 전제를 경청한 뒤 공손한 반박 표현(While I acknowledge..., evidence suggests...)으로 재반론을 구성하고, 토론 내용을 250단어 영어 에세이로 구조화함.',
    standardCodes: ['12영Ⅰ-01-04', '12영Ⅰ-02-03'],
    createdAt: Date.now() - 400000,
  },
];

export const useSeteukStore = create<SeteukState>()(
  persist(
    (set, get) => ({
      students: INITIAL_STUDENTS,
      activities: INITIAL_ACTIVITIES,
      drafts: {},
      selectedStudentId: 'student-sample-1',
      selectedArea: 'subject',
      selectedSubject: '공통영어1',
      settings: DEFAULT_SETTINGS,

      selectStudent: (id) => set({ selectedStudentId: id }),

      addStudent: (data) => {
        const id = 'student-' + Date.now();
        const newStudent: Student = {
          ...data,
          id,
          createdAt: Date.now(),
        };
        set((state) => ({
          students: [newStudent, ...state.students],
          selectedStudentId: id,
        }));
        return id;
      },

      updateStudent: (id, patch) => {
        set((state) => ({
          students: state.students.map((s) => (s.id === id ? { ...s, ...patch } : s)),
        }));
      },

      deleteStudent: (id) => {
        set((state) => {
          const remainingStudents = state.students.filter((s) => s.id !== id);
          const nextDrafts = { ...state.drafts };
          for (const key of Object.keys(nextDrafts)) {
            if (nextDrafts[key].studentId === id) {
              delete nextDrafts[key];
            }
          }
          return {
            students: remainingStudents,
            activities: state.activities.filter((a) => a.studentId !== id),
            drafts: nextDrafts,
            selectedStudentId:
              state.selectedStudentId === id
                ? remainingStudents[0]?.id || null
                : state.selectedStudentId,
          };
        });
      },

      setSelectedArea: (area) => set({ selectedArea: area }),
      setSelectedSubject: (subject) => set({ selectedSubject: subject }),

      addActivity: (data) => {
        const id = 'act-' + Date.now();
        const newAct: ActivityItem = {
          ...data,
          id,
          createdAt: Date.now(),
        };
        set((state) => ({
          activities: [newAct, ...state.activities],
        }));
        return id;
      },

      updateActivity: (id, patch) => {
        set((state) => ({
          activities: state.activities.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        }));
      },

      deleteActivity: (id) => {
        set((state) => ({
          activities: state.activities.filter((a) => a.id !== id),
        }));
      },

      saveDraft: (studentId, area, content, subjectName, verifiedFindings) => {
        const key = `${studentId}_${area}_${subjectName || ''}`;
        const { charCount, byteCount } = calculateNeisLength(content);
        const draft: SeteukDraft = {
          id: key,
          studentId,
          area,
          subjectName,
          content,
          charCount,
          byteCount,
          verifiedFindings,
          updatedAt: Date.now(),
        };
        set((state) => ({
          drafts: {
            ...state.drafts,
            [key]: draft,
          },
        }));
      },

      getDraft: (studentId, area, subjectName) => {
        const key = `${studentId}_${area}_${subjectName || ''}`;
        return get().drafts[key];
      },

      deleteDraft: (studentId, area, subjectName) => {
        const key = `${studentId}_${area}_${subjectName || ''}`;
        set((state) => {
          const next = { ...state.drafts };
          delete next[key];
          return { drafts: next };
        });
      },

      updateSettings: (patch) => {
        set((state) => ({
          settings: { ...state.settings, ...patch },
        }));
      },
    }),
    {
      name: 'seteuk-special-storage',
      partialize: (state) => ({
        students: state.students,
        activities: state.activities,
        drafts: state.drafts,
        settings: state.settings,
        selectedStudentId: state.selectedStudentId,
        selectedArea: state.selectedArea,
        selectedSubject: state.selectedSubject,
      }),
    }
  )
);
