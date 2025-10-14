# PGE Energy API

A Node.js API service that provides intelligent analysis of energy usage data through an LLM-powered `/llm/ask` endpoint.

## Overview

This API allows users to ask natural language questions about their energy usage data and receive intelligent responses powered by OpenAI's GPT-3.5-turbo model. The system can analyze hourly energy data, calculate costs, and provide insights about electricity consumption patterns.

## Features

- **Natural Language Queries**: Ask questions about energy usage in plain English
- **Intelligent Data Analysis**: AI-powered analysis of energy consumption patterns
- **Cost Calculations**: Support for various electricity rate plans (flat rate, time-of-use)
- **Flexible Date Ranges**: Query data by hour, day, month, or custom date ranges
- **Multiple Metrics**: Analyze usage, import, export, and cost data

## API Endpoints

### POST `/llm/ask`

Ask natural language questions about energy usage data.

**Request Body:**

```json
{
  "question": "What was my total electricity usage last month?"
}
```

**Response:**

```json
{
  "question": "What was my total electricity usage last month?",
  "answer": "Based on the data, your total electricity usage for last month was 1,250 kWh..."
}
```

## Supported Question Types

### Energy Usage Analysis

- "What was my total electricity usage last month?"
- "How much energy did I use yesterday?"
- "Show me my daily usage for the past week"

### Cost Analysis

- "What was my electricity bill for July?"
- "Calculate the cost if I switch to a flat rate plan at $0.35/kWh"
- "How much would I save with a time-of-use plan?"

### Time-Based Queries

- "What was my peak usage hour today?"
- "Show me my usage pattern for weekdays vs weekends"
- "What's my average usage during summer months?"

### Comparative Analysis

- "Compare my usage this month to last month"
- "How does my weekend usage compare to weekdays?"
- "What's the difference between my import and export?"

## Data Schema

The system analyzes data from the `energy_usage` table with the following structure:

```sql
energy_usage(
  usage_hour TIMESTAMP,           -- Hour of usage
  import_kilowatt_hours FLOAT,   -- Energy imported from grid
  export_kilowatt_hours FLOAT,   -- Energy exported to grid
  actual_cost FLOAT              -- Actual cost for that hour
)
```

## Available Tools

The LLM has access to several specialized tools for data analysis:

### `energyTotals`

Calculates total usage, import, export, or actual cost for a given time window.

**Parameters:**

- `metric`: "usage", "import", "export", or "actual_cost"
- `date`: Specific date (optional)
- `bucket`: "hour", "day", or "month" (optional)
- `from`/`to`: Date range (optional)

### `planCost`

Simulates electricity costs for different rate plans.

**Parameters:**

- `plan`: Rate plan configuration (flat or time-of-use)
- `date`/`bucket`/`from`/`to`: Time window parameters

### `monthlyImportExport`

Gets monthly breakdown of import and export data.

### `calc`

Performs mathematical calculations (sum, average, min, max, percent change).

## Rate Plan Support

### Flat Rate Plans

Simple plans with a single rate for all hours:

```json
{
  "type": "flat",
  "rateImport": 0.35,
  "rateExport": -0.1,
  "currency": "USD"
}
```

### Time-of-Use (TOU) Plans

Complex plans with different rates for different time periods:

```json
{
  "type": "tou",
  "timezone": "America/Los_Angeles",
  "periods": [
    {
      "name": "Off-Peak",
      "rateImport": 0.25,
      "rateExport": -0.08,
      "hours": [0, 6],
      "daysOfWeek": [0, 1, 2, 3, 4, 5, 6]
    },
    {
      "name": "Peak",
      "rateImport": 0.45,
      "rateExport": -0.12,
      "hours": [17, 20],
      "daysOfWeek": [1, 2, 3, 4, 5]
    }
  ]
}
```

## Usage Examples

### Basic Usage Query

```bash
curl -X POST http://localhost:3001/llm/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What was my total usage last week?"}'
```

### Cost Analysis Query

```bash
curl -X POST http://localhost:3001/llm/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "Calculate my bill if I had a flat rate of $0.40/kWh for the past month"}'
```

### Time-of-Use Analysis

```bash
curl -X POST http://localhost:3001/llm/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What would my bill be with a TOU plan that charges $0.30/kWh off-peak and $0.50/kWh during peak hours (5-8 PM weekdays)?"}'
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```
4. Set up the database:
   ```bash
   npx prisma migrate dev
   npx prisma generate
   ```
5. Start the server:
   ```bash
   npm start
   ```

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 3001)

## Dependencies

- **AI SDK**: `@ai-sdk/openai`, `ai` - For LLM integration
- **Database**: Prisma ORM with PostgreSQL
- **Math**: `decimal.js` for precise calculations
- **Dates**: `date-fns-tz` for timezone handling

## Architecture

```
src/
├── services/
│   └── llmService.ts          # Core LLM service
├── tools/                     # AI tools for data analysis
│   ├── energyTotals.ts       # Energy usage calculations
│   ├── planCost.ts           # Rate plan cost simulation
│   ├── monthlyImportExport.ts # Monthly data analysis
│   └── calc.ts               # Mathematical operations
├── lib/                      # Utility libraries
│   ├── plan.ts              # Rate plan schemas
│   ├── window.ts            # Date/time window handling
│   └── math.ts              # Mathematical utilities
└── web/
    ├── controllers/
    │   └── llmController.ts  # LLM endpoint controller
    └── routes/
        └── llm.ts           # LLM route definition
```

## Error Handling

The API includes comprehensive error handling:

- **400 Bad Request**: Missing or invalid question
- **500 Internal Server Error**: LLM processing errors
- **Database Errors**: Connection or query failures
- **Tool Errors**: Invalid parameters or calculation errors

## Performance

- **Response Time**: Typically 2-5 seconds for complex queries
- **Rate Limiting**: Respects OpenAI API rate limits
- **Caching**: Database queries are optimized for performance
- **Memory**: Efficient handling of large datasets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
