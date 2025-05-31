export function getSignalLevel(mbps: number): number {
  if (mbps >= 50) return 5;
  if (mbps >= 20) return 4;
  if (mbps >= 10) return 3;
  if (mbps >= 2) return 2;
  if (mbps >= 0.5) return 1;
  return 0;
}
