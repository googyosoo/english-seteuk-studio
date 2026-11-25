import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { verifyTextWithDb } from '../src/lib/standards/verify.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// 1. standards 데이터 로드
const db = new Map();
for (const school of ['초', '중', '고']) {
  const filePath = path.join(ROOT, 'public', 'data', `standards-${school}.json`);
  const list = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  for (const r of list) {
    const arr = db.get(r.code);
    if (arr) arr.push(r);
    else db.set(r.code, [r]);
  }
}

// 2. Python 스크립트 경로
const pyScript = 'C:\\Users\\user\\.aside\\u\\0\\skills\\user\\kr-curriculum-2022\\scripts\\verify.py';

const testCases = [
  {
    name: '정상 인용 (9수01-01)',
    text: '[9수01-01] 소인수분해의 뜻을 이해하고, 자연수를 소인수분해 할 수 있다.',
    school: '중',
  },
  {
    name: 'FAKE 코드 (존재하지 않는 코드)',
    text: '[9수99-99] 지어낸 코드와 아무 문장이다.',
    school: '중',
  },
  {
    name: 'MISMATCH 왜곡 (유사도가 있거나 인용 자리인데 왜곡됨)',
    text: '[9수01-01] 소인수분해의 개념을 대략 이해하고 수식으로 계산한다.',
    school: '중',
  },
  {
    name: '산문 언급 (무고 방지 - 뒤에 조사가 붙음)',
    text: '[9수01-01]을 중심으로 학생들과 함께 수업을 진행함.',
    school: '중',
  },
  {
    name: '학교급 불일치 (고등학교 문서에 중학교 성취기준 인용)',
    text: '[9수01-01] 소인수분해의 뜻을 이해하고, 자연수를 소인수분해 할 수 있다.',
    school: '고',
  },
  {
    name: '복합 문서 검증',
    text: `1. 단원 개요
[9수01-01] 소인수분해의 뜻을 이해하고, 자연수를 소인수분해 할 수 있다.
[12영01-01] 가짜 진술문입니다.
[9수99-88] 전혀 없는 코드입니다.`,
    school: '중',
  },
];

console.log('=== 성취기준 검증 모듈 회귀 대조 테스트 (Python vs TypeScript) ===\n');

let allPassed = true;

for (let i = 0; i < testCases.length; i++) {
  const tc = testCases[i];
  console.log(`[Test Case ${i + 1}] ${tc.name}`);

  // 1) TS 검증
  const tsFindings = verifyTextWithDb(tc.text, db, tc.school);
  const tsTags = tsFindings.map(f => `${f.tag}:${f.code}`).sort();

  // 2) Python 검증
  const tempFile = path.join(ROOT, `temp_test_${i}.txt`);
  fs.writeFileSync(tempFile, tc.text, 'utf-8');
  let pyOutput = '';
  try {
    const args = [pyScript, tempFile];
    if (tc.school) {
      args.push('--school', tc.school);
    }
    pyOutput = execFileSync('python', args, { encoding: 'utf-8' });
  } catch (err) {
    pyOutput = (err.stdout || '') + (err.stderr || '');
  } finally {
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
  }

  // Python 출력 파싱: FAKE [9수99-99] 또는 MISMATCH [9수01-01]
  const pyTags = [];
  const lines = pyOutput.split('\n');
  for (const line of lines) {
    const m = line.match(/^(FAKE|MISMATCH|NOSTMT|LEVEL|WARN|LVLDIFF|LVLMISS|LVLNONE)\s+\[([^\]]+)\]/);
    if (m) {
      pyTags.push(`${m[1]}:${m[2]}`);
    }
  }
  pyTags.sort();

  console.log('  TS 결과:    ', tsTags.length > 0 ? tsTags.join(', ') : '(통과 - 문제 없음)');
  console.log('  Python 결과:', pyTags.length > 0 ? pyTags.join(', ') : '(통과 - 문제 없음)');

  const match = JSON.stringify(tsTags) === JSON.stringify(pyTags);
  if (match) {
    console.log('  -> PASS (100% 일치)\n');
  } else {
    console.log('  -> FAIL (불일치 발견!)\n');
    allPassed = false;
  }
}

if (allPassed) {
  console.log('🎉 모든 회귀 테스트 케이스가 Python 원본과 완벽하게 일치합니다!');
  process.exit(0);
} else {
  console.error('❌ 일부 테스트 케이스에서 결과 불일치가 발생했습니다.');
  process.exit(1);
}
