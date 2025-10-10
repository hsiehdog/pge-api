import { tool } from "ai";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { chooseBucket } from "../lib/bucketing";
import { Prisma } from "@prisma/client";

export const getSeries = tool({
  description:
    "Bucketed time series for a metric (import/export/net/cost). ≤400 points.",
  inputSchema: z.object({
    from: z.string(),
    to: z.string(),
    metric: z.enum(["import", "export", "net"]),
    // metric: z.enum(["import", "export", "net", "cost"]),
  }),
  async execute({ from, to, metric }, _opts) {
    const f = new Date(from),
      t = new Date(to);
    const bucket = chooseBucket(f, t);

    const expr = {
      import: Prisma.raw("SUM(import_kilowatt_hours)"),
      export: Prisma.raw("SUM(export_kilowatt_hours)"),
      net: Prisma.raw("SUM(import_kilowatt_hours - export_kilowatt_hours)"),
      // cost: Prisma.raw("SUM(actual_cost)"),
    }[metric];

    const rows = await prisma.$queryRaw<
      { bucket: Date; y: number }[]
    >(Prisma.sql`
      SELECT date_trunc(${Prisma.raw(`'${bucket}'`)}, usage_hour) AS bucket,
             ${expr}::float AS y
      FROM energy_usage
      WHERE usage_hour >= ${f} AND usage_hour < ${t}
      GROUP BY 1
      ORDER BY 1
      LIMIT 400
    `);

    return { bucket, series: rows.map((r) => ({ x: r.bucket, y: r.y })) };
  },
});
