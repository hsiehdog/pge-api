export type Bucket = "hour" | "day" | "month";
export function chooseBucket(from: Date, to: Date): Bucket {
  const days = Math.max(1, Math.ceil((+to - +from) / 86_400_000));
  if (days <= 14) return "hour";
  if (days <= 500) return "day";
  return "month";
}
