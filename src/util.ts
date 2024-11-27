export function avg(...arr: (number | null | undefined)[]): number {
  const filtered = arr.filter((v) => v != null) as number[]
  return filtered.reduce((a, b) => a + b, 0) / filtered.length
}

export function round(value: number, precision = 0): number {
  const multiplier = 10 ** precision
  return Math.round(value * multiplier) / multiplier
}

export function formatDate(
  date: Date | string,
  dateStyle: Intl.DateTimeFormatOptions["dateStyle"] = "medium",
): string {
  return (typeof date === "string" ? new Date(date) : date).toLocaleString(
    "en-GB",
    {
      dateStyle,
    },
  )
}
