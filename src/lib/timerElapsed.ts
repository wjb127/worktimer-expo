export function elapsedSecondsSince(
  startedAt: string,
  nowMs: number = Date.now(),
): number {
  const startedMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startedMs)) return 0;
  return Math.max(0, Math.floor((nowMs - startedMs) / 1000));
}
