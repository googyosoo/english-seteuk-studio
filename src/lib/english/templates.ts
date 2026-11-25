import type { EnglishActivityType } from '../../types/seteuk';

/**
 * 2022 개정 교육과정 고등학교 영어과 주요 과목 목록
 * (public/data/standards-고.json의 course 필드와 1:1 일치)
 */
export const ENGLISH_2022_COURSES: string[] = [
  '공통영어1',
  '공통영어2',
  '영어Ⅰ',
  '영어Ⅱ',
  '영어 독해와 작문',
  '영어 발표와 토론',
  '심화 영어',
  '심화 영어 독해와 작문',
  '미디어 영어',
  '세계 문화와 영어',
  '영미 문학 읽기',
  '기본영어1',
  '기본영어2',
  '실생활 영어 회화',
  '직무 영어',
];

export interface EnglishActivityTemplate {
  type: EnglishActivityType;
  label: string;
  shortLabel: string;
  badgeColor: string;
  sampleTitle: string;
  memoTemplate: string;
  /** 과목별 추천 성취기준 (모두 standards-고.json 검증 완료 코드) */
  recommendedCodesByCourse: Record<string, string[]>;
  defaultCodes: string[];
}

export const ENGLISH_ACTIVITY_TEMPLATES: EnglishActivityTemplate[] = [
  {
    type: 'speaking',
    label: '말하기·발표',
    shortLabel: '발표',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200',
    sampleTitle: '주제 탐구 3분 영어 프레젠테이션',
    memoTemplate:
      '[발표 주제/자료] \n[말하기 산출물] 도표·시각 자료를 활용해 핵심 요지를 영어로 설명하고, 도입·전개·결론 구조를 갖춤.\n[어휘·전달 전략] 인과·대조 연결어와 청중 시선 처리 등 전달 전략을 적용함.\n[피드백 반영] 모둠 연습 후 동료 피드백을 반영해 어휘와 억양을 보완함.',
    recommendedCodesByCourse: {
      공통영어1: ['10공영1-02-01', '10공영1-02-07'],
      공통영어2: ['10공영2-02-01', '10공영2-02-08'],
      '영어Ⅰ': ['12영Ⅰ-02-01', '12영Ⅰ-02-07'],
      '영어Ⅱ': ['12영Ⅱ-02-01', '12영Ⅱ-02-08'],
      '영어 발표와 토론': ['12영발01-03'],
      '심화 영어': ['12심영02-06'],
    },
    defaultCodes: ['10공영1-02-01', '10공영1-02-07'],
  },
  {
    type: 'essay',
    label: '에세이·쓰기',
    shortLabel: '에세이',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    sampleTitle: '영문 아티클 비평 및 5단락 영어 에세이 작성',
    memoTemplate:
      '[읽기 지문/주제] \n[쓰기 산출물] 주제문(Thesis Statement)과 근거 문단을 갖춘 영어 에세이를 작성함.\n[구문·어휘·퇴고] 문법 오류를 점검하고 쓰기 윤리를 지켜 초안을 고쳐 씀.\n[성장 포인트] ',
    recommendedCodesByCourse: {
      공통영어1: ['10공영1-02-04', '10공영1-02-06'],
      공통영어2: ['10공영2-02-04', '10공영2-02-07'],
      '영어Ⅰ': ['12영Ⅰ-02-06', '12영Ⅰ-01-04'],
      '영어Ⅱ': ['12영Ⅱ-02-07', '12영Ⅱ-02-05'],
      '영어 독해와 작문': ['12영독02-01', '12영독02-03'],
    },
    defaultCodes: ['10공영1-02-04', '10공영1-02-06'],
  },
  {
    type: 'debate',
    label: '토론·토의',
    shortLabel: '토론',
    badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
    sampleTitle: '시사 쟁점 영어 찬반 토론 및 반론 구성',
    memoTemplate:
      '[토론 논제] \n[논증·상호작용] 찬반 입장의 근거를 영문 자료로 정리하고, 상대 주장을 경청한 뒤 존중하는 어조로 반론을 제시함.\n[언어 표현] 동의·반박·양보 표현(While I see..., evidence indicates...)을 적절히 활용함.\n[협력 태도] ',
    recommendedCodesByCourse: {
      공통영어1: ['10공영1-01-08', '10공영1-02-08'],
      공통영어2: ['10공영2-01-07', '10공영2-02-09'],
      '영어Ⅰ': ['12영Ⅰ-01-08', '12영Ⅰ-02-03'],
      '영어Ⅱ': ['12영Ⅱ-02-03', '12영Ⅱ-02-05'],
      '영어 발표와 토론': ['12영발02-04'],
      '심화 영어': ['12심영02-03'],
    },
    defaultCodes: ['10공영1-01-08', '10공영1-02-08'],
  },
  {
    type: 'project',
    label: '영어 프로젝트',
    shortLabel: '프로젝트',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    sampleTitle: '다매체 영문 리서치 및 카드뉴스·영상 프로젝트',
    memoTemplate:
      '[탐구 주제/매체] \n[수행 과정] 다양한 영문 매체 자료의 출처와 신뢰성을 비교 분석해 핵심 내용을 요약·재구성함.\n[협업·산출물] 모둠원과 역할을 조율하여 영어 카드뉴스·대본·보고서 등 복합 매체 산출물을 제작함.\n[확장 역량] ',
    recommendedCodesByCourse: {
      공통영어1: ['10공영1-02-05', '10공영1-02-07'],
      공통영어2: ['10공영2-02-06', '10공영2-02-09'],
      '영어Ⅰ': ['12영Ⅰ-01-07', '12영Ⅰ-02-08'],
      '영어Ⅱ': ['12영Ⅱ-02-06', '12영Ⅱ-02-08'],
      '미디어 영어': ['12미영01-04', '12미영01-06'],
    },
    defaultCodes: ['10공영2-02-06', '10공영2-02-09'],
  },
];

export function getRecommendedCodes(
  type: EnglishActivityType,
  courseName?: string
): string[] {
  const tpl = ENGLISH_ACTIVITY_TEMPLATES.find((t) => t.type === type);
  if (!tpl) return [];
  if (courseName && tpl.recommendedCodesByCourse[courseName]) {
    return tpl.recommendedCodesByCourse[courseName];
  }
  return tpl.defaultCodes;
}

export function getActivityTypeMeta(type?: EnglishActivityType) {
  return ENGLISH_ACTIVITY_TEMPLATES.find((t) => t.type === type);
}

export function isEnglishCourse(subjectName?: string): boolean {
  if (!subjectName) return false;
  return subjectName.includes('영어') || ENGLISH_2022_COURSES.includes(subjectName);
}
