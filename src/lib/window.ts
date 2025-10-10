export type Bucket = "hour" | "day" | "month";

export function resolveWindow(input: {
  date?: string;
  from?: string;
  to?: string;
  bucket?: Bucket;
}) {
  const dayMs = 86_400_000,
    hourMs = 3_600_000;
  const asDate = (s: string) => new Date(s);
  let bucket: Bucket = input.bucket ?? "day";

  if (input.date && !input.from && !input.to) {
    const d = asDate(input.date);
    if (bucket === "hour") {
      const from = new Date(d),
        to = new Date(+from + hourMs);
      return { from, to, bucket };
    }
    if (bucket === "month") {
      const from = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
      const to = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
      return { from, to, bucket: "month" };
    }
    const from = new Date(
      Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    );
    const to = new Date(+from + dayMs);
    return { from, to, bucket: "day" };
  }

  if (input.from && !input.to) {
    const f = asDate(input.from);
    if (bucket === "hour")
      return { from: f, to: new Date(+f + hourMs), bucket: "hour" };
    if (bucket === "month") {
      const from = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth(), 1));
      const to = new Date(Date.UTC(f.getUTCFullYear(), f.getUTCMonth() + 1, 1));
      return { from, to, bucket: "month" };
    }
    return { from: f, to: new Date(+f + dayMs), bucket: "day" };
  }

  if (input.from && input.to) {
    const from = asDate(input.from);
    let to = asDate(input.to);
    if (!(to > from)) to = new Date(+from + dayMs);
    const spanDays = Math.ceil((+to - +from) / dayMs);
    if (!input.bucket) {
      bucket = spanDays <= 1 ? "hour" : spanDays <= 60 ? "day" : "month";
    }
    return { from, to, bucket };
  }

  throw new Error("Provide a `date` or `from` (optionally `to`).");
}
