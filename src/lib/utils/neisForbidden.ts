export type ForbiddenCategory =
  | '공인어학시험'
  | '교외대회·수상'
  | '논문·출판'
  | '외부기관·대학명'
  | '모의고사·석차'
  | '상용플랫폼·브랜드'
  | '사회경제적지위'
  | '주어·실명서술';

export interface ForbiddenMatch {
  category: ForbiddenCategory;
  matched: string;
  severity: 'error' | 'warn';
  reason: string;
  suggestion: string;
}

interface RuleDef {
  category: ForbiddenCategory;
  pattern: RegExp;
  severity: 'error' | 'warn';
  reason: string;
  suggestion: string;
}

const RULES: RuleDef[] = [
  {
    category: '공인어학시험',
    pattern: /\b(TOEIC|TOEFL|TEPS|JLPT|HSK|OPIC|OPIc|SAT|AP|ACT|FLEX|IELTS)\b|(토익|토플|텝스|오픽|아이엘츠)(?=[가-힣\s.,]|$)/gi,
    severity: 'error',
    reason: '공인어학시험 명칭 및 성적은 학생부 기재가 금지되어 있습니다.',
    suggestion: '시험명 대신 수업 내 영어 읽기·말하기 수행 과정과 역량 중심으로 서술하세요.',
  },
  {
    category: '교외대회·수상',
    pattern: /(교외\s*대회|올림피아드|경시대회|인증시험|공모전|금상|은상|대상|최우수상|우수상|장려상|수상\s*경력|입상)/g,
    severity: 'error',
    reason: '교외 대회 및 수상 실적(교내 대회 수상 포함 대입 미반영·기재 제한)은 기재 금지 대상입니다.',
    suggestion: '수상 결과 대신 교내 수업·활동에서의 탐구 과정과 산출물 내용을 서술하세요.',
  },
  {
    category: '논문·출판',
    pattern: /(소논문|논문|학술지|저널|도서\s*출간|출판|특허|R&E)/gi,
    severity: 'error',
    reason: '소논문·학술지 투고·도서 출간·특허 관련 내용은 기재가 금지됩니다.',
    suggestion: '‘탐구 보고서’, ‘비평 에세이’, ‘프로젝트 산출물’ 등 교내 수행평가 용어로 순화하세요.',
  },
  {
    category: '외부기관·대학명',
    pattern: /(대학교|하버드|스탠퍼드|옥스퍼드|케임브리지|MIT|Oxford|Harvard|Stanford|어학원|사설\s*기관|영재교육원)/gi,
    severity: 'error',
    reason: '특정 대학명, 사설 어학원, 외부 영재교육원 등 기관명은 기재할 수 없습니다.',
    suggestion: '기관명을 삭제하고 교내 교과 활동과 자료 탐구 내용으로 대체하세요.',
  },
  {
    category: '모의고사·석차',
    pattern: /(수능|모의고사|전교\s*\d+\s*등|석차|백분위|[1-9]등급)/g,
    severity: 'error',
    reason: '모의고사 성적, 석차, 등급, 백분위는 세특에 기재할 수 없습니다.',
    suggestion: '점수·등급 대신 성취기준 도달 과정과 구체적 수행 수준을 기술하세요.',
  },
  {
    category: '상용플랫폼·브랜드',
    pattern: /(유튜브|YouTube|ChatGPT|챗GPT|GPT|파파고|Papago|네이버|구글|Google|딥엘|DeepL|클로드|Claude|제미나이|Gemini|인스타그램|틱톡)/gi,
    severity: 'warn',
    reason: '특정 상용 플랫폼·AI 서비스·브랜드 상호명 직접 기재는 지양해야 합니다.',
    suggestion: '‘디지털 번역 도구’, ‘생성형 AI 도구’, ‘온라인 영상 매체’, ‘영문 검색 도구’ 등 일반 명사로 순화하세요.',
  },
  {
    category: '사회경제적지위',
    pattern: /(부모님|어머니|아버지|친인척|가업|집안|변호사|의사|교수|판사|검사|CEO|대표이사)/g,
    severity: 'warn',
    reason: '부모·친인척의 직업이나 사회·경제적 지위를 암시하는 표현은 금지됩니다.',
    suggestion: '가족 배경 언급을 삭제하고 학생 본인의 학습 활동만 남기세요.',
  },
  {
    category: '주어·실명서술',
    pattern: /(^|\n)\s*(학생은|위\s*학생은|해당\s*학생은|그는|그녀는)/g,
    severity: 'warn',
    reason: '세특은 주어(‘학생은’, ‘그는’)를 생략하고 관찰 활동으로 바로 시작해야 합니다.',
    suggestion: '문장 첫머리의 주어를 삭제하고 구체적 영어 활동 동사/명사로 시작하세요.',
  },
];

/**
 * NEIS 기재금지 표현 및 학생 실명 포함 여부를 검사한다.
 */
export function checkNeisForbidden(text: string, studentName?: string): ForbiddenMatch[] {
  if (!text || !text.trim()) return [];
  const matches: ForbiddenMatch[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(text)) !== null) {
      const matched = m[0].trim();
      const key = `${rule.category}:${matched.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        matches.push({
          category: rule.category,
          matched,
          severity: rule.severity,
          reason: rule.reason,
          suggestion: rule.suggestion,
        });
      }
    }
  }

  // 학생 실명이 본문에 직접 남아있는지 검사
  const cleanName = (studentName || '').replace(/\(예시\)/g, '').trim();
  if (cleanName.length >= 2 && text.includes(cleanName)) {
    matches.unshift({
      category: '주어·실명서술',
      matched: cleanName,
      severity: 'error',
      reason: '세특 본문에 학생 실명이 포함되어 있습니다. 세특에는 학생 이름을 적지 않습니다.',
      suggestion: '학생 이름을 삭제하고 주어 없이 활동 중심으로 문장을 시작하세요.',
    });
  }

  return matches;
}

/**
 * 명사형 종결어미(~함., ~음., ~임. 등) 준수 여부를 간략히 점검한다.
 */
export function checkNeisEndingStyle(text: string): { ok: boolean; issue?: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: true };

  // '~습니다.' / '~했다.' / '~이다.' 등 비격식/평서형 종결 탐지
  if (/(습니다|ㅂ니다|해요|예요|했어요|었다|였다|한다|이다)[.!]?\s*$/.test(trimmed)) {
    return {
      ok: false,
      issue: '문장 끝이 "~습니다 / ~한다 / ~했다" 형태입니다. 세특 규격에 맞게 "~함. / ~음. / ~임." 명사형 종결로 다듬어 주세요.',
    };
  }
  return { ok: true };
}
