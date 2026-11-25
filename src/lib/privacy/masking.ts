import type { ActivityItem, Student } from '../../types/seteuk';

export interface AnonymizedPayload {
  areaLabel: string;
  subjectName?: string;
  maskedPiiCount: number;
  maskedKinds: string[];
  activities: Array<{
    title: string;
    content: string;
    activityType?: ActivityItem['activityType'];
    standardCodes?: string[];
  }>;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * AI API(Gemini) 전송 시 학생의 이름, 학번, 연락처 등 개인식별정보(PII)를
 * 비식별 가명 토큰으로 치환하여 활동 내용만 추출합니다.
 */
export function createAnonymizedPayload(
  student: Student,
  areaLabel: string,
  activities: ActivityItem[],
  subjectName?: string
): AnonymizedPayload {
  let maskedPiiCount = 0;
  const maskedKinds = new Set<string>();

  const rawName = student.name.replace(/\(예시\)/g, '').trim();
  const rawNumber = student.studentNumber.trim();

  const nameTokens: string[] = [];
  if (rawName.length >= 2) {
    nameTokens.push(rawName);
    if (/^[가-힣]{3}$/.test(rawName)) {
      nameTokens.push(rawName.slice(1));
    }
  }

  const sanitizeText = (input: string): string => {
    let out = input;

    if (rawNumber.length >= 3) {
      const numRe = new RegExp(escapeRegExp(rawNumber), 'g');
      out = out.replace(numRe, () => {
        maskedPiiCount++;
        maskedKinds.add('학번');
        return '[학번]';
      });
    }

    if (nameTokens[0]) {
      const fullRe = new RegExp(escapeRegExp(nameTokens[0]), 'g');
      out = out.replace(fullRe, () => {
        maskedPiiCount++;
        maskedKinds.add('학생 성명');
        return '해당 학생';
      });
    }

    if (nameTokens[1]) {
      const givenRe = new RegExp(
        `${escapeRegExp(nameTokens[1])}(?=[이가은는을를의에게와과\\s.,!?)]|$)`,
        'g'
      );
      out = out.replace(givenRe, () => {
        maskedPiiCount++;
        maskedKinds.add('학생 이름');
        return '해당 학생';
      });
    }

    out = out.replace(/01[016789]-?\d{3,4}-?\d{4}/g, () => {
      maskedPiiCount++;
      maskedKinds.add('연락처');
      return '[연락처]';
    });

    out = out.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, () => {
      maskedPiiCount++;
      maskedKinds.add('이메일');
      return '[이메일]';
    });

    return out;
  };

  const sanitizedActivities = activities.map((act) => ({
    title: sanitizeText(act.title),
    content: sanitizeText(act.content),
    activityType: act.activityType,
    standardCodes: act.standardCodes,
  }));

  return {
    areaLabel,
    subjectName: subjectName || activities[0]?.subjectName,
    maskedPiiCount,
    maskedKinds: Array.from(maskedKinds),
    activities: sanitizedActivities,
  };
}
