import { tool } from "ai";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { Prisma } from "@prisma/client";

export const getTopDays = tool({
  description: "Top K days by import/export/net/cost in a window.",
  inputSchema: z.object({
    from: z.string(),
    to: z.string(),
    metric: z.enum(["import", "export", "net"]),
    // metric: z.enum(["import", "export", "net", "cost"]),
    k: z.number().default(10),
  }),
  async execute({ from, to, metric, k }, _opts) {
    const expr = {
      import: Prisma.raw("SUM(import_kilowatt_hours)"),
      export: Prisma.raw("SUM(export_kilowatt_hours)"),
      net: Prisma.raw("SUM(import_kilowatt_hours - export_kilowatt_hours)"),
      // cost: Prisma.raw("SUM(actual_cost)"),
    }[metric];

    const rows = await prisma.$queryRaw<{ day: Date; v: number }[]>(Prisma.sql`
      SELECT date_trunc('day', usage_hour) AS day,
             ${expr}::float AS v
      FROM energy_usage
      WHERE usage_hour >= ${new Date(from)} AND usage_hour < ${new Date(to)}
      GROUP BY 1
      ORDER BY v DESC
      LIMIT ${Math.min(k, 50)}
    `);

    return { topDays: rows };
  },
});
