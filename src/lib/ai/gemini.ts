import type { VerifyFinding, School } from '../../types/standard';
import type { ActivityArea, ActivityItem, GeminiFreeModel } from '../../types/seteuk';
import { AREA_METAS } from '../../types/seteuk';
import { verifyDocument } from '../standards/verify';
import { lookupStandardsByCodes } from '../standards/lookup';
import { isEnglishCourse, getActivityTypeMeta } from '../english/templates';
import { checkNeisForbidden, type ForbiddenMatch } from '../utils/neisForbidden';

export interface GenerateSeteukParams {
  apiKey: string;
  model: GeminiFreeModel | 'gemini-1.5-flash';
  schoolLevel: School;
  area: ActivityArea;
  subjectName?: string;
  activities: Array<{
    title: string;
    content: string;
    activityType?: ActivityItem['activityType'];
    standardCodes?: string[];
  }>;
  customInstructions?: string;
}

export interface GenerateSeteukResult {
  content: string;
  findings: VerifyFinding[];
  forbiddenMatches: ForbiddenMatch[];
}

export async function generateSeteukWithGemini(
  params: GenerateSeteukParams
): Promise<GenerateSeteukResult> {
  const { apiKey, model, schoolLevel, area, subjectName, activities, customInstructions } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('Gemini API 키가 설정되지 않았습니다. 우측 상단 [설정]에서 무료 API 키를 등록해주세요.');
  }

  // 레거시 1.5-flash가 저장되어 있으면 현재 무료 등급 모델로 자동 전환
  const effectiveModel: GeminiFreeModel =
    model === 'gemini-1.5-flash' ? 'gemini-2.5-flash' : model;

  const areaMeta = AREA_METAS[area];
  const areaTitle = area === 'subject' ? `${subjectName || '교과'} 세부능력 및 특기사항` : areaMeta.label;
  const englishMode = area === 'subject' && isEnglishCourse(subjectName);

  // 선택된 성취기준 코드의 실제 고시 원문을 조회해 프롬프트에 주입 (할루시네이션 차단)
  const allCodes = Array.from(
    new Set(activities.flatMap((a) => a.standardCodes ?? []))
  );
  const resolvedStandards = await lookupStandardsByCodes(allCodes);
  const standardMap = new Map(resolvedStandards.map((r) => [r.code, r]));

  const activitiesSummary = activities
    .map((act, idx) => {
      const typeLabel = act.activityType ? getActivityTypeMeta(act.activityType)?.label : undefined;
      const headerTag = typeLabel ? `[${typeLabel}] ` : '';
      const stdLines = (act.standardCodes ?? [])
        .map((c) => {
          const rec = standardMap.get(c);
          return rec ? `[${c}] ${rec.statement ?? ''}` : `[${c}]`;
        })
        .join(' / ');
      const standards = stdLines ? `\n- 연계 성취기준(고시 원문): ${stdLines}` : '';
      return `[활동 ${idx + 1}] ${headerTag}${act.title}${standards}\n- 관찰 내용: ${act.content}`;
    })
    .join('\n\n');

  const safeByteLow = Math.max(900, areaMeta.maxBytes - 150);
  const safeByteHigh = Math.max(1200, areaMeta.maxBytes - 20);

  const englishSpecGuide = englishMode
    ? `\n7. 영어과 특화 서술 원칙:
   - 말하기·발표·에세이·토론·프로젝트 등 실제 영어 산출물(주제, 텍스트 장르, 담화/구문/어휘 전략, 동료·교사 피드백 반영 및 퇴고 과정)을 구체적으로 드러내십시오.
   - 성취기준 코드([10공영1-02-01] 등)를 본문에 인용할 경우 반드시 위 [연계 성취기준(고시 원문)]에 제시된 코드와 원문 진술문을 글자 하나 틀리지 않게 그대로 사용하거나, 코드만 조사와 결합해 자연스럽게 녹여 쓰십시오(임의 변형 금지).`
    : '';

  const systemInstruction = `당신은 대한민국 고등학교 학교생활기록부 세부능력 및 특기사항(세특)을 작성하는 베테랑 ${englishMode ? '영어과 ' : ''}교사입니다.
교육부 학교생활기록부 기재요령을 100% 준수하여 작성하십시오.

[필수 기재 원칙]
1. 문체 및 종결: 학생을 지칭하는 주어('학생은', '그는', '위 학생은', '해당 학생은')를 일체 생략하고, 문장 끝은 객관적 명사형 격식체('~함.', '~음.', '~임.')로 끝맺습니다.
2. 3단 서술 구조: '관찰된 구체적 활동 -> 수행 및 해결 과정 -> 발현된 학업 역량' 흐름으로 작성하며, 내면 심리 단정("열정이 넘침", "흥미가 깊음")은 배제합니다.
3. 성취기준 인용 무결성: 성취기준 코드는 제공된 [연계 성취기준(고시 원문)]에 있는 실제 코드만 사용하고, 절대 새로운 코드를 추측하거나 지어내지 마십시오.
4. NEIS 분량 안전 구간: 최대 한도 ${areaMeta.maxChars}자 (${areaMeta.maxBytes}바이트) 이내, 권장 안전 분량 ${safeByteLow}~${safeByteHigh}바이트(한글 기준 약 ${Math.floor(safeByteLow / 3)}~${Math.floor(safeByteHigh / 3)}자)로 작성하십시오.
5. 기재 금지 사항: 공인어학시험(TOEIC, TOEFL, TEPS 등), 교외대회/수상(금상, 은상 등), 논문/출판/특허, 대학·학원명, 모의고사 등급/석차, 상용 브랜드(ChatGPT, 파파고, 유튜브, 구글, 네이버 등), 부모 직업 암시는 절대 쓰지 마십시오.
6. 개인정보 보호: 학생 이름, 학번, 연락처는 일체 언급하지 마십시오.${englishSpecGuide}`;

  const userPrompt = `다음 비식별 활동 기록을 바탕으로 [${areaTitle}] 세특 문구를 작성해주세요.

${activitiesSummary}

${customInstructions ? `[추가 요청사항]\n${customInstructions}\n` : ''}
반드시 최종 세특 문구만 한 단락(또는 필요한 단락)으로 깔끔하게 출력해주세요 (인사말, 해설, 마크다운 기호 제외).`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${effectiveModel}:generateContent?key=${apiKey.trim()}`;

  const requestBody = {
    contents: [
      {
        role: 'user',
        parts: [{ text: userPrompt }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    generationConfig: {
      temperature: 0.65,
      topP: 0.95,
      maxOutputTokens: 1200,
    },
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error?.message || response.statusText;
    } catch {
      errorDetail = response.statusText;
    }

    if (response.status === 400 || response.status === 403) {
      throw new Error(`Gemini API 호출 실패 (${response.status}): API 키가 유효하지 않거나 권한이 없습니다. (${errorDetail})`);
    } else if (response.status === 429) {
      throw new Error(`Gemini API 무료 티어 요청 한도 초과 (429): 잠시 후 다시 시도하거나 설정에서 경량 모델(gemini-2.5-flash-lite)로 변경해주세요.`);
    } else {
      throw new Error(`Gemini API 통신 오류 (${response.status}): ${errorDetail}`);
    }
  }

  const data = await response.json();
  const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';

  if (!generatedText) {
    throw new Error('Gemini API로부터 생성된 문구가 비어 있습니다.');
  }

  const [findings, forbiddenMatches] = await Promise.all([
    verifyDocument(generatedText, schoolLevel),
    Promise.resolve(checkNeisForbidden(generatedText)),
  ]);

  return {
    content: generatedText,
    findings,
    forbiddenMatches,
  };
}
