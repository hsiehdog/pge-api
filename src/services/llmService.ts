import OpenAI from "openai";
import { PrismaClient } from "@prisma/client";
import { calc } from "../tools/calc";

const prisma = new PrismaClient();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Prompts
const SQL_GENERATION_PROMPT = `You are a SQL expert. Based on this question about energy usage data, generate a SQL query to get the data needed to answer the question.

CRITICAL RULES (always apply):
1) NEVER use SELECT * - only select specific columns needed
2) ALWAYS use precise date filters that match the question timeframe
3) Aggregate data when possible to minimize rows returned

Assume the following:
- The cost of electricity on the default E1 plan is $0.41 per kilowatt hour.
- For E-ELEC plan, the cost of electricity is $0.40 per kilowatt hour for 12AM - 3PM, then $0.45 for 3PM - 4PM, then $0.61 for 4PM - 9PM, then $0.45 from 9PM - 12AM.
- For a given hour, the total kilowatt hours used during that hour is the import kilowatt hours minus the export kilowatt hours.
- Usage is the total import kilowatt hours minus the total export kilowatt hours.
- Calculate the total cost by multiplying the total kilowatt hours used by the cost of electricity.

Database schema:
- Table: energy_usage
- Columns: id, usage_hour (timestamp), import_kilowatt_hours (decimal), export_kilowatt_hours (decimal), actual_cost (decimal), created_at (timestamp)
- Date range: January 2025 to October 2025

Generate a SQL query that will get the data needed to answer this question. Return ONLY the SQL query, no explanations.`;

const ANALYSIS_PROMPT = `You are analyzing energy usage data. Here's the data from the database query:

Query Results: {QUERY_RESULTS}

Database context:
- Table: energy_usage
- 6,575 records from January 2025 to October 2025
- Each record represents hourly energy usage
- Columns: usage_hour (timestamp), import_kilowatt_hours, export_kilowatt_hours, actual_cost

Question: {QUESTION}

Based on the query results, provide a comprehensive analysis and answer to the question. Include specific data points, calculations, and insights.`;

const CALC_TOOL_DEFINITION = {
  type: "function" as const,
  function: {
    name: "calc",
    description:
      "Perform stable mathematical calculations (sum, avg, min, max, percent_change) using decimal precision",
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["sum", "avg", "min", "max", "percent_change"],
          description: "The mathematical operation to perform",
        },
        values: {
          type: "array",
          items: { type: "number" },
          description: "Array of numbers to perform the calculation on",
        },
      },
      required: ["operation", "values"],
    },
  },
};

// Interfaces
export interface LlmResult {
  question: string;
  answer: string;
  sqlQuery: string;
  dataPoints: number;
  sampleData: any[];
}

// Helpers
const cleanSql = (sql: string) =>
  sql
    .replace(/```sql\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

const callOpenAI = async (
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  tools?: any
) => {
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    ...(tools ?? {}),
    max_tokens: 1500,
  });

  // Log token usage
  if (completion.usage) {
    console.log(
      `🔢 Token usage - Input: ${completion.usage.prompt_tokens}, Output: ${completion.usage.completion_tokens}, Total: ${completion.usage.total_tokens}`
    );
  }

  return completion;
};

export class LlmService {
  private async generateAndExecuteSQL(question: string) {
    console.log("📝 Step 1: Generating SQL query...");
    const sqlCompletion = await callOpenAI(
      [
        { role: "system", content: SQL_GENERATION_PROMPT },
        { role: "user", content: `User question: ${question}` },
      ],
      { max_tokens: 500 }
    );
    const rawSql = sqlCompletion.choices[0].message.content?.trim() ?? "";
    const sqlQuery = cleanSql(rawSql);
    console.log("Generated SQL:", sqlQuery);

    if (!sqlQuery) throw new Error("Empty SQL query from LLM");

    console.log("🔍 Step 2: Executing SQL query...");
    let queryResults: any[] = [];
    try {
      queryResults = (await prisma.$queryRawUnsafe(sqlQuery)) as any[];
      console.log(
        `✅ Query executed successfully! ${queryResults.length} rows returned`
      );
    } catch (sqlError) {
      console.error("SQL Error:", sqlError);
      throw new Error(`SQL query failed: ${sqlError}`);
    }

    return { sqlQuery, queryResults };
  }

  private createAnalysisPrompt(question: string, queryResults: any[]): string {
    return ANALYSIS_PROMPT.replace(
      "{QUERY_RESULTS}",
      JSON.stringify(queryResults, null, 2)
    ).replace("{QUESTION}", question);
  }

  private async analyzeWithLLM(question: string, queryResults: any[]) {
    console.log("🧠 Step 3: Analyzing results with LLM...");
    const analysisPrompt = this.createAnalysisPrompt(question, queryResults);

    const analysisCompletion = await callOpenAI(
      [
        { role: "system", content: analysisPrompt },
        { role: "user", content: `User question: ${question}` },
      ],
      {
        tools: [CALC_TOOL_DEFINITION],
        tool_choice: "auto",
      }
    );

    return analysisCompletion;
  }

  private async handleToolCalls(
    analysisCompletion: any,
    analysisPrompt: string,
    question: string
  ) {
    let finalAnswer = analysisCompletion.choices[0].message.content;
    const toolCalls = analysisCompletion.choices[0].message.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      console.log(`🔧 LLM requested ${toolCalls.length} calculation(s)`);
      const toolResults = toolCalls.map((toolCall: any) => {
        if (toolCall.function.name !== "calc")
          return { tool_call_id: toolCall.id, error: "Unknown tool" };
        try {
          const args = JSON.parse(toolCall.function.arguments);
          return { tool_call_id: toolCall.id, result: calc(args) };
        } catch (error) {
          return {
            tool_call_id: toolCall.id,
            error: `Calculation error: ${
              error instanceof Error ? error.message : String(error)
            }`,
          };
        }
      });

      const toolMessages = toolResults.map((r: any) => ({
        role: "tool" as const,
        tool_call_id: r.tool_call_id,
        content: JSON.stringify(r.result ?? r.error),
      }));

      console.log("🔄 Getting final answer with tool results...");
      const finalCompletion = await callOpenAI([
        { role: "system", content: analysisPrompt },
        { role: "user", content: `User question: ${question}` },
        analysisCompletion.choices[0].message,
        ...toolMessages,
      ]);

      finalAnswer = finalCompletion.choices[0].message.content;
    }

    return finalAnswer;
  }

  async processQuestion(question: string): Promise<LlmResult> {
    console.log("🤖 Processing question:", question);
    console.log("=".repeat(60));

    const { sqlQuery, queryResults } = await this.generateAndExecuteSQL(
      question
    );
    const analysisCompletion = await this.analyzeWithLLM(
      question,
      queryResults
    );
    const analysisPrompt = this.createAnalysisPrompt(question, queryResults);
    const finalAnswer = await this.handleToolCalls(
      analysisCompletion,
      analysisPrompt,
      question
    );

    console.log("✅ Processing complete!");
    console.log("=".repeat(60));

    return {
      question,
      answer: finalAnswer || "No answer generated",
      sqlQuery: sqlQuery,
      dataPoints: queryResults.length,
      sampleData: queryResults.slice(0, 10),
    };
  }
}

export const llmService = new LlmService();
