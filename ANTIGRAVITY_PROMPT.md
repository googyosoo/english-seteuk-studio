# Antigravity 시작 프롬프트

아래 내용을 Antigravity 에이전트에게 그대로 붙여넣어 이어서 작업하면 됩니다.

---

## 프로젝트 배경

이 프로젝트는 한국 고등학교 교사가 세부능력특기사항(세특) 작성을 돕는 웹앱입니다.
이미 다음이 완료되어 있습니다:

- Vite + React + TypeScript + Tailwind CSS 스캐폴드
- `public/data/standards-{초,중,고}.json`: 2022 개정 교육과정 성취기준 3,294건 전체 데이터
  (출처: kr-curriculum-2022, 교육부 고시 제2022-33호)
- `src/lib/standards/lookup.ts`, `src/lib/standards/verify.ts`: 성취기준 조회·인용검증 모듈
  (Python CLI 도구 lookup.py/verify.py를 TypeScript로 포팅)
- `src/components/StandardLookupPanel.tsx`, `StandardVerifierPanel.tsx`: 데모 UI

## 지금 해야 할 일

1. `npm install` 실행 후 `npm run dev`로 현재 상태를 먼저 확인해줘.
2. `src/lib/standards/verify.ts`가 Python 원본과 동일하게 동작하는지 검증해줘.
   원본은 `C:\Users\user\.aside\u\0\skills\user\kr-curriculum-2022\scripts\verify.py`에 있어.
   같은 테스트 문서를 파이썬과 TS 양쪽에 넣어서 결과(FAKE/MISMATCH/NOSTMT/LVLMISS 등)가
   일치하는지 회귀 테스트를 몇 개 만들어줘.
3. 그 다음 본 기능인 세특 작성 앱을 이어서 구현해줘. 요구사항:
   - 학생/활동 등록 (수동 입력 우선, 엑셀 업로드는 나중에)
   - 영역 선택: 자율활동/진로활동/동아리활동/과목별세특/행동특성
   - 영역별 NEIS 글자수 제한 자동 적용 (자율·동아리·행특 500자, 진로 700자, 세특 700자)
   - AI 생성: **Gemini 무료 티어 API**만 사용 (사용자가 유료 API 사용을 명시적으로 거부함).
     Gemini API 키는 사용자가 aistudio.google.com에서 직접 발급하도록 안내하고, 코드에
     하드코딩하지 말고 `.env.local`(gitignore 처리)로 관리해줘.
   - 생성된 문구에 성취기준 코드 `[9수01-01]` 같은 게 포함되면 **반드시**
     `verifyDocument()`로 자동 검증하고, FAKE/MISMATCH가 나오면 사용자에게 경고 표시할 것.
     (이 프로젝트의 핵심 차별점 — 할루시네이션 성취기준 방지)
   - 학생 개인정보(학번/이름)는 클라이언트 로컬 저장(IndexedDB/localStorage)만 하고,
     서버나 AI API로는 활동 내용(비식별)만 전송할 것.
   - 인라인 편집 + 실시간 글자수 카운트
   - CSV/Excel 내보내기

## 지켜야 할 제약

- **무료 티어만 사용.** 사용자는 결제 계정 연결을 명시적으로 거부했음 (Gemini 무료
  티어 API가 유일하게 검증된 무료 경로).
- 교육부 기재요령을 준수하는 문구 스타일(주어 생략, 현재형 명사형 종결 등)을 참고하려면
  `techkwon/school-report-with-solar` (github.com/techkwon/school-report-with-solar) 를 레퍼런스로
  봐도 좋음 — 단, 그 프로젝트를 그대로 복제하지 말고 우리 아키텍처(성취기준 검증 내장)에 맞게
  새로 설계할 것.
- 수행평가 루브릭 관련 기능을 나중에 추가한다면 `C:\Users\user\.aside\u\0\skills\user\rubric-creator\`
  스킬의 이론적 틀(성취기준→증거→평가요소→수준기술)을 참고할 것.

## 확인이 필요하면

불확실한 설계 결정(UI 세부사항, 데이터 스키마 변경 등)은 진행하기 전에 사용자에게
먼저 물어봐줘. 코드/파일을 대량으로 새로 만들기 전에 계획을 간단히 공유하고 확인받을 것.
