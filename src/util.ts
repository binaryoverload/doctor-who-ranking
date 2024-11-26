export function avg(...arr: (number | null | undefined)[]): number {
  const filtered = arr.filter((v) => v != null) as number[];
  return filtered.reduce((a, b) => a + b, 0) / filtered.length;
}

export function round(value: number, precision = 0): number {
  const multiplier = Math.pow(10, precision);
  return Math.round(value * multiplier) / multiplier;
}