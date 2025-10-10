import { tool } from "ai";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { resolveWindow } from "../lib/window";

export const energyTotals = tool({
  description:
    "Total usage/import/export or actual cost for a window (hour/day/month).",
  inputSchema: z.object({
    metric: z
      .enum(["usage", "import", "export", "actual_cost"])
      .default("usage"),
    date: z.string().optional(),
    bucket: z.enum(["hour", "day", "month"]).optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    currency: z.string().optional(), // for actual_cost only
  }),
  async execute({ metric, date, from, to, bucket }, _opts) {
    const {
      from: f,
      to: t,
      bucket: b,
    } = resolveWindow({ date, from, to, bucket });

    const expr =
      metric === "usage"
        ? Prisma.raw("SUM(import_kilowatt_hours - export_kilowatt_hours)")
        : metric === "import"
        ? Prisma.raw("SUM(import_kilowatt_hours)")
        : metric === "export"
        ? Prisma.raw("SUM(export_kilowatt_hours)")
        : Prisma.raw("SUM(actual_cost)");

    const [row] = await prisma.$queryRaw<{ v: number }[]>(Prisma.sql`
      SELECT ${expr}::float AS v
      FROM energy_usage
      WHERE usage_hour >= ${f} AND usage_hour < ${t}
    `);

    return {
      metric,
      window: { from: f.toISOString(), to: t.toISOString(), bucket: b },
      total: row?.v ?? 0,
      unit: metric === "actual_cost" ? "USD" : "kWh",
      note:
        metric === "usage"
          ? "usage = SUM(import_kilowatt_hours - export_kilowatt_hours)"
          : undefined,
    };
  },
});
