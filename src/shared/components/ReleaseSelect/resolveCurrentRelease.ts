export interface ReleaseItem {
  id: number;
  release_name: string;
  start_at?: string;
  end_at?: string;
  created_at?: string;
  [key: string]: any;
}

/**
 * Identifica a "Release Atual" dentre a lista de releases:
 * 1. A release cujo período [start_at, end_at] contempla a data de hoje.
 * 2. Fallback: a release mais recente por end_at/created_at/start_at.
 */
export function resolveCurrentRelease(
  releases: ReleaseItem[],
  referenceDate: Date = new Date()
): ReleaseItem | null {
  if (!releases || releases.length === 0) return null;

  const nowTime = referenceDate.getTime();

  // 1. Período ativo hoje
  const activeRelease = releases.find((r) => {
    if (!r.start_at || !r.end_at) return false;
    const start = new Date(r.start_at).getTime();
    const end = new Date(r.end_at).getTime();
    return start <= nowTime && nowTime <= end;
  });

  if (activeRelease) {
    return activeRelease;
  }

  // 2. Fallback: release mais recente
  const sorted = [...releases].sort((a, b) => {
    const timeA = new Date(a.end_at || a.created_at || a.start_at || 0).getTime();
    const timeB = new Date(b.end_at || b.created_at || b.start_at || 0).getTime();
    return timeB - timeA;
  });

  return sorted[0] || null;
}
