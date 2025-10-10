import { tool } from "ai";
import { z } from "zod";
import { kahanSum } from "../lib/math";

export const calc = tool({
  description: "Deterministic arithmetic (sum/avg/min/max/percentChange).",
  inputSchema: z.object({
    op: z.enum(["sum", "avg", "min", "max", "percentChange"]),
    values: z.array(z.number()).min(1), // percentChange -> [old, new]
  }),
  async execute({ op, values }, _opts) {
    if (op === "sum") return { result: kahanSum(values) };
    if (op === "avg") return { result: kahanSum(values) / values.length };
    if (op === "min") return { result: Math.min(...values) };
    if (op === "max") return { result: Math.max(...values) };
    if (op === "percentChange") {
      if (values.length !== 2)
        throw new Error("percentChange expects [old, new]");
      const [oldV, newV] = values;
      return {
        result: oldV === 0 ? (newV === 0 ? 0 : Infinity) : (newV - oldV) / oldV,
      };
    }
    return { result: null };
  },
});
