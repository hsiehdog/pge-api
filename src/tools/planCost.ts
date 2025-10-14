// src/tools/planCost.ts
import { tool } from "ai";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { resolveWindow } from "../lib/window";
import { PlanSchema, periodForLocal, proratedFixedFee } from "../lib/plan";
import { kahanSum } from "../lib/math";

/* -------------------- loose plan input (JSON-Schema friendly) -------------------- */
const LooseTouPeriod = z.object({
  name: z.string(),
  rateImport: z.number().nonnegative(),
  rateExport: z.number().optional(), // default to -rateImport if omitted
  // ✅ allow 1+ items so [15] (3–4pm) is valid, as well as [0,24] or [0,1,2,...]
  hours: z.array(z.number().int().min(0).max(24)).min(1),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).optional(), // 0..6; default all
});

const LoosePlan = z.object({
  type: z.string(), // "TOU"/"tou" or "FLAT"/"flat"
  currency: z.string().optional(),
  timezone: z.string().optional(),
  fixedMonthlyFee: z.number().nonnegative().optional(),
  prorateFixedFee: z.boolean().optional(),
  // FLAT
  rateImport: z.number().nonnegative().optional(),
  rateExport: z.number().optional(),
  // TOU
  periods: z.array(LooseTouPeriod).optional(),
});
type LoosePlan = z.infer<typeof LoosePlan>;

/* ------------------------------- normalization ---------------------------------- */
function fullWeek() {
  return [0, 1, 2, 3, 4, 5, 6];
}

// Accept either [start,end) or a list of discrete hours; emit disjoint [s,e) ranges.
function compressHoursToRanges(hours: number[]): Array<[number, number]> {
  const uniq = Array.from(new Set(hours))
    .filter((h) => h >= 0 && h <= 24)
    .sort((a, b) => a - b);

  // Already looks like [start,end)
  if (uniq.length === 2 && uniq[1] > uniq[0]) return [[uniq[0], uniq[1]]];

  // Treat as discrete hour slots
  const onlyHours = uniq.filter((h) => h <= 23);
  if (onlyHours.length === 0) return [];

  const ranges: Array<[number, number]> = [];
  let start = onlyHours[0];
  let prev = onlyHours[0];

  for (let i = 1; i < onlyHours.length; i++) {
    const h = onlyHours[i];
    if (h === prev + 1) {
      prev = h;
      continue;
    }
    ranges.push([start, prev + 1]); // contiguous run [start, prev+1)
    start = prev = h;
  }
  ranges.push([start, prev + 1]);
  return ranges;
}

function normalizePlan(loose: LoosePlan) {
  console.log("normalizePlan top");
  console.log(loose);
  console.log("loose.periods");
  console.log(loose.periods);
  const type = String(loose.type || "").toLowerCase(); // accept "TOU"/"FLAT"
  const timezone = loose.timezone ?? "America/Los_Angeles";
  const currency = loose.currency ?? "USD";
  const fixedMonthlyFee = loose.fixedMonthlyFee ?? 0;
  const prorateFixedFee = loose.prorateFixedFee ?? true;

  // Treat "tou" with no periods as a flat plan if rateImport is provided
  if (
    type === "flat" ||
    (type === "tou" && (!loose.periods || loose.periods.length === 0))
  ) {
    const rateImport = loose.rateImport;
    console.log("rateImport");
    console.log(rateImport);
    if (typeof rateImport !== "number") {
      throw new Error(
        "Flat plan requires `rateImport` (or provide TOU periods)."
      );
    }
    const rateExport =
      typeof loose.rateExport === "number" ? loose.rateExport : -rateImport;
    return PlanSchema.parse({
      type: "flat",
      rateImport,
      rateExport,
      fixedMonthlyFee,
      currency,
      prorateFixedFee,
      timezone,
    });
  }

  if (type !== "tou")
    throw new Error(`Unknown plan type "${loose.type}". Use "flat" or "tou".`);

  // Normalize each TOU period; split fragmented hour lists into [s,e) ranges
  const normalizedPeriods: Array<{
    name: string;
    rateImport: number;
    rateExport?: number;
    hours: [number, number];
    daysOfWeek: number[];
  }> = [];
  console.log("normalizePlan");
  console.log(loose.periods);
  for (const p of loose.periods ?? []) {
    const exportRate =
      typeof p.rateExport === "number" ? p.rateExport : -p.rateImport;
    const days =
      p.daysOfWeek && p.daysOfWeek.length ? p.daysOfWeek : fullWeek();
    const ranges = compressHoursToRanges(p.hours);
    if (ranges.length === 0) {
      throw new Error(`TOU period "${p.name}" has invalid hours definition.`);
    }
    for (const [s, e] of ranges) {
      if (!(e > s))
        throw new Error(`Invalid hours for "${p.name}": [${s}, ${e}]`);
      normalizedPeriods.push({
        name: p.name,
        rateImport: p.rateImport,
        rateExport: exportRate,
        hours: [s, e],
        daysOfWeek: days,
      });
    }
  }

  return PlanSchema.parse({
    type: "tou",
    periods: normalizedPeriods,
    fixedMonthlyFee,
    currency,
    prorateFixedFee,
    timezone,
  });
}

/* ----------------------------------- tool -------------------------------------- */
export const planCost = tool({
  description:
    "Simulate electricity cost for a window given a flat or TOU plan.",
  inputSchema: z.object({
    plan: LoosePlan, // accept loose inputs; normalize here
    date: z.string().optional(),
    bucket: z.enum(["hour", "day", "month"]).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),

  async execute({ plan: loosePlan, date, from, to, bucket }) {
    const plan = normalizePlan(loosePlan);
    const {
      from: f,
      to: t,
      bucket: b,
    } = resolveWindow({ date, from, to, bucket });

    const hours = await prisma.$queryRaw<
      { ts: Date; import_kwh: number; export_kwh: number }[]
    >(Prisma.sql`
      SELECT usage_hour AS ts,
             import_kilowatt_hours::float AS import_kwh,
             export_kilowatt_hours::float AS export_kwh
      FROM energy_usage
      WHERE usage_hour >= ${f} AND usage_hour < ${t}
      ORDER BY usage_hour
    `);
    process.stdout.write("🔍 planCost: Processing hours data\n");
    process.stdout.write(`📊 planCost: Found ${hours.length} hours\n`);
    let cost = 0;
    const defaultExportRate = (maybe: number | undefined, importRate: number) =>
      typeof maybe === "number" ? maybe : -importRate;

    if (plan.type === "flat") {
      const imp = kahanSum(hours.map((h) => h.import_kwh || 0));
      const exp = kahanSum(hours.map((h) => h.export_kwh || 0));
      const exportRate = defaultExportRate(plan.rateExport, plan.rateImport);
      cost = imp * plan.rateImport + exp * exportRate;
      process.stdout.write(
        `💰 planCost: Flat plan - Import: ${imp}, Export: ${exp}, Cost: ${cost}\n`
      );
    } else {
      for (const h of hours) {
        const p = periodForLocal(h.ts, plan.periods, "UTC");
        if (!p)
          throw new Error(
            "No TOU period matched for an hour; verify timezone and coverage."
          );
        process.stdout.write(`💰 planCost: TOU plan - Period: ${p.name}\n`);
        const exportRate = defaultExportRate(p.rateExport, p.rateImport);
        process.stdout.write(
          `💰 planCost: TOU plan - Import: ${h.import_kwh}, Export: ${h.export_kwh}\n`
        );
        process.stdout.write(
          `💰 planCost: TOU plan - Rate Import: ${p.rateImport}, Rate Export: ${exportRate}\n`
        );
        cost += (h.import_kwh || 0) * p.rateImport;
        cost += (h.export_kwh || 0) * exportRate;
      }
    }

    if (plan.prorateFixedFee && plan.fixedMonthlyFee) {
      cost += proratedFixedFee(f, t, plan.fixedMonthlyFee);
    } else {
      cost += plan.fixedMonthlyFee ?? 0;
    }

    return {
      metric: "plan_cost",
      window: { from: f.toISOString(), to: t.toISOString(), bucket: b },
      total: cost, // signed; negative = credit
      unit: plan.currency ?? "USD",
      note: "Exports use rateExport (default = -rateImport). Positive = you pay; negative = credit.",
      normalizedPlan: plan, // helpful for debugging
    };
  },
});
