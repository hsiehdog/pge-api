import { tool } from "ai";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma";
import { resolveWindow } from "../lib/window";

export const monthlyImportExport = tool({
  description:
    "Monthly totals of import/export kWh (dataset-wide or within a range).",
  inputSchema: z.object({
    // Optional range; if omitted, use full dataset window (Jan–Oct 2025 -> up to Nov 1)
    date: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  }),
  async execute({ date, from, to }, _opts) {
    let f: Date, t: Date;
    if (date || from || to) {
      const w = resolveWindow({ date, from, to, bucket: "month" });
      f = w.from;
      t = w.to;
    } else {
      f = new Date("2025-01-01T00:00:00Z");
      t = new Date("2025-11-01T00:00:00Z");
    }

    const rows = await prisma.$queryRaw<
      { month: Date; import_kwh: number; export_kwh: number }[]
    >(Prisma.sql`
      SELECT date_trunc('month', usage_hour) AS month,
             SUM(import_kilowatt_hours)::float AS import_kwh,
             SUM(export_kilowatt_hours)::float AS export_kwh
      FROM energy_usage
      WHERE usage_hour >= ${f} AND usage_hour < ${t}
      GROUP BY 1
      ORDER BY 1
    `);

    return {
      metric: "monthly_import_export",
      bucket: "month" as const,
      months: rows.map((r) => ({
        month: new Date(r.month).toISOString().slice(0, 7), // YYYY-MM
        import_kwh: r.import_kwh ?? 0,
        export_kwh: r.export_kwh ?? 0,
      })),
    };
  },
});
