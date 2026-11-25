import type { School, StandardRecord, StandardsIndex } from '../../types/standard';

const SCHOOLS: School[] = ['초', '중', '고'];

let cache: Promise<Map<string, StandardRecord[]>> | null = null;
let indexCache: Promise<StandardsIndex> | null = null;

/**
 * 전체 3,294건의 성취기준을 로드해 code -> record[] 맵으로 캐싱한다.
 * 같은 코드가 서로 다른 교과에 실재하는 자리가 있으므로 배열로 보관한다.
 */
export function loadStandardsDb(): Promise<Map<string, StandardRecord[]>> {
  if (!cache) {
    cache = (async () => {
      const map = new Map<string, StandardRecord[]>();
      for (const school of SCHOOLS) {
        const res = await fetch(`/data/standards-${school}.json`);
        if (!res.ok) throw new Error(`성취기준 데이터 로드 실패: ${school} (${res.status})`);
        const records: StandardRecord[] = await res.json();
        for (const r of records) {
          const list = map.get(r.code);
          if (list) list.push(r);
          else map.set(r.code, [r]);
        }
      }
      return map;
    })();
  }
  return cache;
}

export function loadStandardsIndex(): Promise<StandardsIndex> {
  if (!indexCache) {
    indexCache = fetch('/data/standards-index.json').then((res) => {
      if (!res.ok) throw new Error(`색인 로드 실패 (${res.status})`);
      return res.json();
    });
  }
  return indexCache;
}
