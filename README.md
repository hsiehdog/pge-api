# Stablecoins API

A TypeScript-based RESTful API built with Express using a three-layer architecture pattern.

## Architecture

This API follows a **three-layer architecture** pattern for better separation of concerns, maintainability, and testability:

```
┌─────────────────┐
│   Web Layer     │  ← HTTP request/response handling
│  (Routes,       │
│   Controllers,  │
│   Middleware)   │
├─────────────────┤
│ Service Layer   │  ← Business logic implementation
├─────────────────┤
│  Data Layer     │  ← Data access abstraction
│   (Models)      │
└─────────────────┘
```

### Layer Responsibilities

#### 1. **Web Layer** (`src/web/`)

- **Routes** (`src/web/routes/`): Defines API endpoints and HTTP methods
- **Controllers** (`src/web/controllers/`): Handles HTTP requests and responses
- **Middleware** (`src/web/middleware/`): Request processing and validation

#### 2. **Service Layer** (`src/services/`)

- Contains core business logic
- Coordinates between controllers and models
- Handles data transformation and business rules
- Manages transactions and complex operations

#### 3. **Data Layer** (`src/data/`)

- **Models** (`src/data/models/`): Abstracts data access operations
- Handles database interactions
- Provides data persistence logic
- Manages data models and queries

### Data Flow

```
HTTP Request → Route → Controller → Service → Model → Database
Database → Model → Service → Controller → Route → HTTP Response
```

### Project Structure

```
src/
├── web/                 # Web layer (HTTP handling)
│   ├── routes/         # API route definitions
│   │   ├── index.ts    # Automatic route discovery
│   │   ├── health.ts
│   │   ├── example.ts
│   │   └── users.ts
│   ├── controllers/    # HTTP request/response handlers
│   │   ├── healthController.ts
│   │   └── exampleController.ts
│   └── middleware/     # Request processing middleware
├── services/           # Business logic layer
│   └── exampleService.ts
├── data/              # Data access layer
│   └── models/        # Data models and access logic
│       └── exampleModel.ts
├── app.ts             # Express app configuration
└── index.ts           # Server entry point
```

### Automatic Route Discovery

The API uses automatic route discovery to eliminate the need for manual route registration. Simply create a new route file in `src/web/routes/` and it will be automatically registered when the server starts.

**How it works:**

- `src/web/routes/index.ts` scans the routes directory
- All `.ts` files (except `index.ts`) are automatically discovered
- Route files are mounted at `/{filename}` (e.g., `users.ts` → `/users`)
- No need to manually import or register routes in `app.ts`

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up environment variables:

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. Build the project:

   ```bash
   npm run build
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. For development (with auto-reload):
   ```bash
   npm run dev
   ```

## Environment Variables

The API uses environment variables for configuration. Copy `.env.example` to `.env` and customize as needed:

```bash
# Server Configuration
PORT=3000

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:5173

# Environment
NODE_ENV=development
```

**Available Variables:**

- `PORT`: Server port (default: 3000)
- `ALLOWED_ORIGINS`: Comma-separated list of allowed CORS origins
- `NODE_ENV`: Environment mode (development, production, test)

## API Endpoints

- `GET /health` — Health check endpoint
- `GET /example` — Example endpoint demonstrating the three-layer architecture
- `GET /users` — Users endpoint (demonstrates automatic route discovery)
- `GET /users/:id` — User details endpoint with parameter

## Development

### Adding New Features

1. **Create a Model** (if needed):

   ```typescript
   // src/data/models/newFeatureModel.ts
   export interface NewFeatureData {
     id: string;
     name: string;
   }

   export class NewFeatureModel {
     public async getData(): Promise<NewFeatureData[]> {
       // Data access logic
       return [];
     }
   }
   ```

2. **Create a Service**:

   ```typescript
   // src/services/newFeatureService.ts
   import { NewFeatureModel } from "../data/models/newFeatureModel";

   export class NewFeatureService {
     private model = new NewFeatureModel();

     public async processData(): Promise<any> {
       // Business logic
       return await this.model.getData();
     }
   }
   ```

3. **Create a Controller**:

   ```typescript
   // src/web/controllers/newFeatureController.ts
   import { Request, Response } from "express";
   import { NewFeatureService } from "../../services/newFeatureService";

   export class NewFeatureController {
     private static service = new NewFeatureService();

     public static async handleRequest(
       req: Request,
       res: Response
     ): Promise<void> {
       try {
         const result = await NewFeatureController.service.processData();
         res.json(result);
       } catch (error) {
         res.status(500).json({ error: "Internal server error" });
       }
     }
   }
   ```

4. **Create a Route**:

   ```typescript
   // src/web/routes/newFeature.ts
   import { Router } from "express";
   import { NewFeatureController } from "../controllers/newFeatureController";

   const router = Router();
   router.get("/", NewFeatureController.handleRequest);
   export default router;
   ```

5. **Route Registration**: Routes are automatically discovered and registered! No need to manually add them to `app.ts`.

**Note**: The server will automatically pick up new route files when restarted.

## Benefits

- **Separation of Concerns**: Each layer has a specific responsibility
- **Testability**: Each layer can be tested independently
- **Maintainability**: Changes in one layer don't affect others
- **Scalability**: Easy to add new features or modify existing ones
- **Reusability**: Services and repositories can be reused across different controllers

### Middleware Example

Middleware functions in Express are functions that have access to the request and response objects, and the next function in the application’s request-response cycle. They are commonly used for logging, authentication, validation, error handling, and more.

**Example: Logging Middleware**

The API includes a logger middleware (`src/web/middleware/logger.ts`) that logs each HTTP request and its response time:

```typescript
import { Request, Response, NextFunction } from "express";

export const logger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any): any {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - ${
        res.statusCode
      } (${duration}ms)`
    );
    return originalEnd.call(this, chunk, encoding);
  };
  next();
};
```

This middleware is applied globally in `app.ts`:

```typescript
import { logger } from "./web/middleware/logger";
app.use(logger);
```

**What middleware can do:**

- Log requests and responses
- Authenticate or authorize users
- Validate request data
- Handle errors globally
- Modify requests or responses

Add your own middleware in `src/web/middleware/` and register it in `app.ts` as needed.

### CORS Configuration

The API includes CORS (Cross-Origin Resource Sharing) middleware to allow cross-origin requests from web applications.

**Configuration:**

- **Allowed Origins**: `http://localhost:3000`, `http://localhost:3001` (configurable via `ALLOWED_ORIGINS` environment variable)
- **Credentials**: Enabled for authenticated requests
- **Methods**: GET, POST, PUT, DELETE, PATCH, OPTIONS
- **Headers**: Content-Type, Authorization, X-Requested-With

**Environment Variable:**

```bash
ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
```

**Usage in Frontend:**

```javascript
fetch("http://localhost:3000/api/endpoint", {
  method: "GET",
  credentials: "include", // For authenticated requests
  headers: {
    "Content-Type": "application/json",
  },
});
```
