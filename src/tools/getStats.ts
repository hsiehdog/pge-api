import { tool } from "ai";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { Prisma } from "@prisma/client";

export const getStats = tool({
  description: "Summary stats over daily buckets for import/export/net/cost.",
  inputSchema: z.object({
    from: z.string(),
    to: z.string(),
    metric: z.enum(["import", "export", "net"]),
    // metric: z.enum(["import", "export", "net", "cost"]),
  }),
  async execute({ from, to, metric }, _opts) {
    const expr = {
      import: Prisma.raw("SUM(import_kilowatt_hours)"),
      export: Prisma.raw("SUM(export_kilowatt_hours)"),
      net: Prisma.raw("SUM(import_kilowatt_hours - export_kilowatt_hours)"),
      // cost: Prisma.raw("SUM(actual_cost)"),
    }[metric];

    const [row] = await prisma.$queryRaw<any[]>(Prisma.sql`
      WITH d AS (
        SELECT date_trunc('day', usage_hour) AS day,
               ${expr}::float AS v
        FROM energy_usage
        WHERE usage_hour >= ${new Date(from)} AND usage_hour < ${new Date(to)}
        GROUP BY 1
      )
      SELECT COUNT(*)::int AS n,
             SUM(v)::float AS sum,
             AVG(v)::float AS mean,
             MIN(v)::float AS min,
             MAX(v)::float AS max
      FROM d
    `);

    return row as {
      n: number;
      sum: number;
      mean: number;
      min: number;
      max: number;
    };
  },
});
