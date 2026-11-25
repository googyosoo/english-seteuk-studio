import type { VerifyFinding, School } from './standard';

export type ActivityArea =
  | 'subject'      // 과목별 세부능력 및 특기사항
  | 'autonomy'     // 자율활동
  | 'club'         // 동아리활동
  | 'career'       // 진로활동
  | 'behavior'     // 행동특성 및 종합의견
  | 'individual';  // 개인별 세부능력 및 특기사항

export interface AreaMeta {
  key: ActivityArea;
  label: string;
  maxChars: number; // NEIS 글자수 한도 (공백 포함)
  maxBytes: number; // NEIS 바이트 한도
  description: string;
}

export const AREA_METAS: Record<ActivityArea, AreaMeta> = {
  subject: {
    key: 'subject',
    label: '과목별 세특',
    maxChars: 500,
    maxBytes: 1500,
    description: '교과 성취기준에 따른 학업 성취도 및 학습 과정 서술 (500자/1500B)',
  },
  autonomy: {
    key: 'autonomy',
    label: '자율활동',
    maxChars: 500,
    maxBytes: 1500,
    description: '학급 및 자치활동, 기본 생활습관, 행사 참여 서술 (500자/1500B)',
  },
  club: {
    key: 'club',
    label: '동아리활동',
    maxChars: 500,
    maxBytes: 1500,
    description: '동아리 참여 태도 및 특기 역량 서술 (500자/1500B)',
  },
  career: {
    key: 'career',
    label: '진로활동',
    maxChars: 700,
    maxBytes: 2100,
    description: '진로 희망 및 진로 탐색·체험 활동 서술 (700자/2100B)',
  },
  behavior: {
    key: 'behavior',
    label: '행동특성 및 종합의견',
    maxChars: 500,
    maxBytes: 1500,
    description: '학생의 인성, 잠재력, 발달 정도 종합 서술 (500자/1500B)',
  },
  individual: {
    key: 'individual',
    label: '개인별 세특',
    maxChars: 500,
    maxBytes: 1500,
    description: '특정 교과에 속하지 않는 자기주도 융합 탐구 활동 (500자/1500B)',
  },
};

export interface Student {
  id: string;
  studentNumber: string; // 예: "20101"
  name: string;          // 예: "홍길동"
  grade: number;         // 1, 2, 3
  memo?: string;
  createdAt: number;
}

export type EnglishActivityType = 'speaking' | 'essay' | 'debate' | 'project';

export interface ActivityItem {
  id: string;
  studentId: string;
  area: ActivityArea;
  subjectName?: string;     // 예: "공통영어1", "영어Ⅰ"
  activityType?: EnglishActivityType; // 영어과 특화 활동 유형 (발표/에세이/토론/프로젝트)
  date?: string;            // 활동 일자
  title: string;            // 활동 제목/주제
  content: string;          // 구체적 활동 기록/관찰 내용
  standardCodes?: string[]; // 연계된 성취기준 코드 (예: ["10공영1-02-01"])
  createdAt: number;
}

export interface SeteukDraft {
  id: string;
  studentId: string;
  area: ActivityArea;
  subjectName?: string;
  content: string;
  charCount: number;
  byteCount: number;
  verifiedFindings?: VerifyFinding[];
  updatedAt: number;
}

export type GeminiFreeModel = 'gemini-2.5-flash' | 'gemini-2.5-flash-lite';

export interface AppSettings {
  apiKey: string;
  model: GeminiFreeModel | 'gemini-1.5-flash';
  schoolLevel: School;
  defaultSubject: string;
}
