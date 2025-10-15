import "dotenv/config";
import { initLogger, wrapAISDK } from "braintrust";
import { openai } from "@ai-sdk/openai";
// import { generateText, stepCountIs } from "ai";
import { stepCountIs } from "ai";
import * as ai from "ai";
import { tools } from "../tools";

initLogger({
  projectName: "Mike's Test",
  apiKey: process.env.BRAINTRUST_API_KEY,
});

const { generateText } = wrapAISDK(ai);

// Prompts
// const SYSTEM_PROMPT = `
// You answer questions about hourly energy usage (Jan–Oct 2025).
// Rules:
// - If a user refers to a single day (e.g., "July 14"), interpret it as [00:00, next day 00:00).
// - If a user refers to a single month (e.g., "July"), interpret it as [00:00, first day of next month 00:00).
// - When presenting numbers: preserve the sign for signed metrics. If you choose to display an absolute value, you must state the direction (“net export” vs “net consumption”) and explicitly say you used sum_abs.
// - Prefer DAILY or MONTHLY aggregation; never return raw hourly rows.
// - Keep ≤ 400 time points. If range is wide, use weekly/monthly buckets.
// - The cost of electricity on the default E1 plan is $0.41 per kilowatt hour.
// - For E-ELEC plan, the cost of electricity is $0.40 per kilowatt hour for 12AM - 3PM, then $0.45 for 3PM - 4PM, then $0.61 for 4PM - 9PM, then $0.45 from 9PM - 12AM.
// - For a given hour, the total kilowatt hours used during that hour is the import kilowatt hours minus the export kilowatt hours.
// - Usage is the total import kilowatt hours minus the total export kilowatt hours.
// - Calculate the total cost by multiplying the total kilowatt hours used by the cost of electricity.
// - For ANY arithmetic (sums, averages, deltas, percent change), call the 'calc' tool—do not compute inline.
// - Always show and explain your calculations.
// - If the request is ambiguous, ask one clarifying question.
// Schema: energy_usage(usage_hour, import_kilowatt_hours, export_kilowatt_hours, actual_cost)
// `;

const SYSTEM_PROMPT = `
You analyze a Postgres table 'energy_usage' (hourly, Jan–Oct 2025).
Use tools—don't guess numbers.

Mappings:
- "electricity used / usage / consumption" → energyTotals(metric="usage")
- "actual cost" → energyTotals(metric="actual_cost")
- "calculated cost given a specific plan" → planCost(plan=...)
- "total energy imported and exported for each month" → monthlyImportExport()

Date handling:
- Single hour/day/month → pass { date, bucket:"hour"|"day"|"month" }.
- Ranges → pass { from, to }. Always use [from, to) with UTC boundaries.

When presenting signed values (planCost), preserve the sign and explain meaning (negative = credit).
Keep answers concise.
`;

// Interfaces
export interface LlmResult {
  question: string;
  answer: string;
}

export class LlmService {
  async processQuestion(question: string): Promise<LlmResult> {
    console.log("🤖 Processing question:", question);
    console.log("=".repeat(60));

    const result = await generateText({
      model: openai("gpt-3.5-turbo"),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user" as const, content: question }],
      stopWhen: stepCountIs(4),
      tools,
    });
    console.log("🔧 Result:", result);
    console.log(
      "tool calls:",
      result.steps.flatMap((step) => step.toolCalls)
    );
    console.log("🎯 Final Answer1:", result.text);
    return {
      question,
      answer: result.text || "No answer generated",
    };
  }
}

export const llmService = new LlmService();
