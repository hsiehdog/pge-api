// src/lib/plan.ts
import { z } from "zod";
import { toZonedTime } from "date-fns-tz";

/**
 * TOU period definition:
 * - hours: fixed-length array [start, end) in LOCAL clock hours (0..24)
 * - daysOfWeek: 0..6 (Sun..Sat); defaults to all days
 * - rateExport is OPTIONAL; when omitted, callers should default to -rateImport
 *   (we do that in definePlan/planCost so math treats exports as a credit).
 */
export const TouPeriod = z.object({
  name: z.string(),
  rateImport: z.number().nonnegative(), // $/kWh charge for imports
  rateExport: z.number().optional(), // $/kWh credit for exports (usually negative); optional
  hours: z.array(z.number().int().min(0).max(24)).length(2), // [start, end) LOCAL hours
  daysOfWeek: z
    .array(z.number().int().min(0).max(6))
    .default([0, 1, 2, 3, 4, 5, 6]), // 0=Sun .. 6=Sat; default covers all days
});

/**
 * Pricing plan schema: discriminated union on "type".
 * - FLAT: single import/export rates (export optional)
 * - TOU:  one or more periods with rates by local hour/dayOfWeek
 * - timezone: IANA string. Tools default to "America/Los_Angeles" if user implies local time.
 */
export const PlanSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("flat"),
    rateImport: z.number().nonnegative(),
    rateExport: z.number().optional(), // default applied by tools: -rateImport
    fixedMonthlyFee: z.number().nonnegative().default(0),
    currency: z.string().default("USD"),
    prorateFixedFee: z.boolean().default(true),
    timezone: z.string().default("UTC"),
  }),
  z.object({
    type: z.literal("tou"),
    periods: z.array(TouPeriod).min(1),
    fixedMonthlyFee: z.number().nonnegative().default(0),
    currency: z.string().default("USD"),
    prorateFixedFee: z.boolean().default(true),
    timezone: z.string().default("UTC"),
  }),
]);

export type Plan = z.infer<typeof PlanSchema>;
export type TouPlan = Extract<Plan, { type: "tou" }>;

/**
 * Basic overlap check on the 0..23 hour grid (ignores daysOfWeek).
 * Throws if two periods overlap on the same hour slot.
 */
export function validateTouCoverage(periods: z.infer<typeof TouPeriod>[]) {
  const used = Array(24).fill(false);
  for (const p of periods) {
    const [start, end] = p.hours;
    for (let h = start; h < end; h++) {
      if (used[h]) {
        throw new Error(
          `TOU overlap at hour ${h}: "${p.name}" conflicts with another period`
        );
      }
      used[h] = true;
    }
  }
  // If you require 24/7 coverage, you could enforce `used.every(Boolean)` here.
}

/** Days in a UTC month (helper for prorating fixed fees). */
export function daysInUTCMonth(y: number, m: number) {
  return new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
}

/**
 * Prorate a fixed monthly fee across [from, to) (UTC day granularity).
 * Adds fee/numberOfDaysInMonth for each day in the window.
 */
export function proratedFixedFee(from: Date, to: Date, monthly: number) {
  let total = 0;
  const cur = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  );
  const end = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  );
  while (cur < end) {
    total += monthly / daysInUTCMonth(cur.getUTCFullYear(), cur.getUTCMonth());
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return total;
}

/**
 * Map a UTC timestamp to the correct TOU period in LOCAL time for a given timezone.
 * Returns null if no period matches (your plan should cover all hours you care about).
 */
export function periodForLocal(
  utcTs: Date,
  periods: z.infer<typeof TouPeriod>[],
  tz: string
) {
  console.log("periodForLocal");
  console.log(utcTs, tz);
  const local = toZonedTime(utcTs, tz);
  const hour = local.getHours(); // 0..23
  const dow = local.getDay(); // 0=Sun..6=Sat
  //   console.log("periods");
  //   console.log(periods);
  //   console.log("hour, dow");
  //   console.log(hour, dow);
  for (const p of periods) {
    const [start, end] = p.hours;
    if (p.daysOfWeek.includes(dow) && hour >= start && hour < end) {
      return p;
    }
  }
  return null;
}
