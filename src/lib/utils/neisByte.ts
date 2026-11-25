/**
 * 한국 교육부 NEIS(나이스) 학생생활기록부 바이트 및 글자수 계산 규칙:
 * - 한글(음절, 자모): 3 bytes
 * - 전각 기호 및 한자: 3 bytes
 * - 영문 대소문자, 숫자, 반각 특수기호, 공백: 1 byte
 * - 줄바꿈 (\r\n 또는 \n): 2 bytes (텍스트 끝 줄바꿈은 미포함)
 */

export interface NeisTextLength {
  charCount: number;        // 글자 수 (공백 포함)
  charCountNoSpace: number; // 글자 수 (공백·줄바꿈 제외)
  byteCount: number;        // NEIS 바이트 수
  lineCount: number;        // 줄 수
}

export function calculateNeisLength(text: string): NeisTextLength {
  if (!text) {
    return { charCount: 0, charCountNoSpace: 0, byteCount: 0, lineCount: 0 };
  }

  // 줄바꿈 정규화 (\r\n -> \n) 및 텍스트 끝 줄바꿈 미포함 처리
  const normalized = text.replace(/\r\n/g, '\n').replace(/\n+$/, '');
  let byteCount = 0;
  const charCount = normalized.length;
  const charCountNoSpace = normalized.replace(/[\s\n]/g, '').length;

  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charAt(i);
    const code = normalized.charCodeAt(i);

    if (ch === '\n') {
      byteCount += 2; // NEIS는 문장 내부 줄바꿈을 2바이트로 계산
    } else if (code <= 0x007f) {
      byteCount += 1; // ASCII 문자 (영문, 숫자, 기본 기호, 스페이스)
    } else if (
      (code >= 0xac00 && code <= 0xd7af) || // 한글 음절
      (code >= 0x1100 && code <= 0x11ff) || // 한글 자모
      (code >= 0x3130 && code <= 0x318f) || // 한글 호환 자모
      (code >= 0x4e00 && code <= 0x9fff) || // 한자
      (code >= 0xff00 && code <= 0xffef)    // 전각 문자
    ) {
      byteCount += 3;
    } else {
      // 기타 유니코드 3바이트 취급
      byteCount += 3;
    }
  }

  const lineCount = normalized ? normalized.split('\n').length : 0;

  return {
    charCount,
    charCountNoSpace,
    byteCount,
    lineCount,
  };
}
