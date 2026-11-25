// kr-curriculum-2022 데이터 레코드 타입
// 출처: https://github.com/bobthecodebuilder88/kr-curriculum-2022 (MIT / 공공누리)

export type School = '초' | '중' | '고';

export type AchievementLevels = Partial<Record<'A' | 'B' | 'C' | 'D' | 'E', string>>;

export interface StandardRecord {
  code: string;
  subject: string;
  statement: string | null;
  source: string;
  statement_source: '별책' | '성취수준' | string;
  commentary_only: boolean;
  needs_review: boolean;
  school: School;
  grade_band: string;
  course: string;
  area: string | null;
  levels: AchievementLevels;
  /** true=두 출처 일치(교차검증됨), false=출처 불일치, null/undefined=대조 불가(단일 출처) */
  statement_verified: boolean | null;
}

export interface StandardsIndexFile {
  path: string;
  school: School;
  subject: string;
  count: number;
}

export interface StandardsIndex {
  files: StandardsIndexFile[];
}

export interface LookupFilter {
  code?: string;
  school?: School;
  subject?: string;
  course?: string;
  keyword?: string;
}

export type VerifyTag =
  | 'FAKE'
  | 'MISMATCH'
  | 'NOSTMT'
  | 'LEVEL'
  | 'WARN'
  | 'LVLDIFF'
  | 'LVLMISS'
  | 'LVLNONE';

export interface VerifyFinding {
  tag: VerifyTag;
  code: string;
  where: string;
  message: string;
}

export const WARN_ONLY_TAGS: ReadonlySet<VerifyTag> = new Set(['WARN', 'LVLNONE']);
