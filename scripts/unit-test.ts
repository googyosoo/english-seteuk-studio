import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calculateNeisLength } from '../src/lib/utils/neisByte';
import { checkNeisForbidden, checkNeisEndingStyle } from '../src/lib/utils/neisForbidden';
import { createAnonymizedPayload } from '../src/lib/privacy/masking';
import { ENGLISH_ACTIVITY_TEMPLATES } from '../src/lib/english/templates';
import { lookupStandards } from '../src/lib/standards/lookup';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// 1. NEIS 바이트 계산 규칙 검증 (한글 3B, 영문/공백 1B, 내부 줄바꿈 2B, 끝 줄바꿈 미포함)
const b1 = calculateNeisLength('가나다 ABC\n라\n');
assert.strictEqual(b1.byteCount, 18, `Expected 18 bytes, got ${b1.byteCount}`);
assert.strictEqual(b1.charCount, 9);
assert.strictEqual(b1.charCountNoSpace, 7);

// 2. NEIS 기재금지 표현 및 실명/종결어미 검사 검증
const fb = checkNeisForbidden(
  '학생은 김하늘과 함께 TOEIC 점수를 높이고 ChatGPT와 파파고로 소논문을 작성해 금상을 수상함.',
  '김하늘'
);
const cats = fb.map((m) => m.category);
assert(cats.includes('공인어학시험'), 'Missing 공인어학시험');
assert(cats.includes('상용플랫폼·브랜드'), 'Missing 상용플랫폼·브랜드');
assert(cats.includes('논문·출판'), 'Missing 논문·출판');
assert(cats.includes('교외대회·수상'), 'Missing 교외대회·수상');
assert(cats.includes('주어·실명서술'), 'Missing 주어·실명서술');
assert.strictEqual(checkNeisEndingStyle('영어 발표를 진행함.').ok, true);
assert.strictEqual(checkNeisEndingStyle('영어 발표를 했습니다.').ok, false);

// 3. PII 가명화 검증 (실명, 성 제외 이름, 학번, 전화번호, 이메일)
const masked = createAnonymizedPayload(
  { id: 's1', studentNumber: '10101', name: '홍길동', grade: 1, createdAt: 0 },
  '과목별 세특',
  [
    {
      id: 'a1',
      studentId: 's1',
      area: 'subject',
      title: '홍길동(10101) 발표',
      content: '길동이가 010-1234-5678 및 test@example.com 으로 연락함.',
      createdAt: 0,
    },
  ],
  '공통영어1'
);
assert(!masked.activities[0].title.includes('홍길동'), 'Name leaked in title');
assert(!masked.activities[0].title.includes('10101'), 'StudentNumber leaked in title');
assert(!masked.activities[0].content.includes('길동'), 'Given name leaked in content');
assert(!masked.activities[0].content.includes('010-1234-5678'), 'Phone leaked');
assert(!masked.activities[0].content.includes('test@example.com'), 'Email leaked');
assert(masked.maskedPiiCount >= 5, `Expected >=5 masked PII, got ${masked.maskedPiiCount}`);

// 4. 영어과 템플릿 추천 성취기준 코드 전수 실재 여부 및 null-course 방어 검증
const allRecords: Array<{ code: string; course: string | null; subject: string | null; school: string }> = [];
for (const sch of ['초', '중', '고']) {
  const list = JSON.parse(
    fs.readFileSync(path.join(ROOT, 'public', 'data', `standards-${sch}.json`), 'utf-8')
  );
  allRecords.push(...list);
}
const hsList = allRecords.filter((r) => r.school === '고');
const hsSet = new Set(hsList.map((r) => r.code));
for (const tpl of ENGLISH_ACTIVITY_TEMPLATES) {
  for (const c of tpl.defaultCodes) {
    assert(hsSet.has(c), `Missing defaultCode ${c} in ${tpl.type}`);
  }
  for (const codes of Object.values(tpl.recommendedCodesByCourse)) {
    for (const c of codes) {
      assert(hsSet.has(c), `Missing recommended code ${c} in ${tpl.type}`);
    }
  }
}

// null course 레코드가 있어도 과목 필터가 크래시하지 않고 공통영어1을 정확히 찾는지 검증
const normalizeText = (s?: string | null) => (s ?? '').replace(/\s+/g, '').toLowerCase();
const commonEng1 = allRecords.filter((r) => {
  if (r.school !== '고') return false;
  const subj = normalizeText(r.subject);
  const course = normalizeText(r.course);
  return subj === '공통영어1' || course === '공통영어1' || course.includes('공통영어1');
});
assert(commonEng1.length >= 16, `Expected >=16 standards for 공통영어1, got ${commonEng1.length}`);

console.log('UNIT_CHECKS_ALL_PASSED: True');
void lookupStandards;
