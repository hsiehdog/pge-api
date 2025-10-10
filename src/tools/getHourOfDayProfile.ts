import { tool } from "ai";
import { z } from "zod";
import { prisma } from "../db/prisma";
import { Prisma } from "@prisma/client";

export const getHourOfDayProfile = tool({
  description:
    "Average import/export/net by clock hour over a window (24 rows).",
  inputSchema: z.object({
    from: z.string(),
    to: z.string(),
    metric: z.enum(["import", "export", "net"]),
  }),
  async execute({ from, to, metric }, _opts) {
    const expr = {
      import: Prisma.raw("AVG(import_kilowatt_hours)"),
      export: Prisma.raw("AVG(export_kilowatt_hours)"),
      net: Prisma.raw("AVG(export_kilowatt_hours - import_kilowatt_hours)"),
    }[metric];

    const rows = await prisma.$queryRaw<
      { hour: number; v: number }[]
    >(Prisma.sql`
      SELECT EXTRACT(HOUR FROM usage_hour)::int AS hour,
             ${expr}::float AS v
      FROM energy_usage
      WHERE usage_hour >= ${new Date(from)} AND usage_hour < ${new Date(to)}
      GROUP BY 1
      ORDER BY 1
    `);

    return { byHour: rows };
  },
});
