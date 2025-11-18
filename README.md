# Policy-as-Code Governor

A powerful and flexible Policy-as-Code engine for evaluating access control policies. Define policies in JSON, evaluate incoming requests against those policies, and manage everything through a clean web UI.

## Features

- **JSON-based Policy Language**: Define policies using a simple, structured JSON format
- **Flexible Condition System**: Support for logical operators (all, any, not) and comparison operators (equals, in, contains, etc.)
- **Priority-based Evaluation**: Rules are evaluated based on priority with DENY taking precedence
- **REST API**: Full-featured API for policy management and evaluation
- **Web Dashboard**: Intuitive UI for creating, managing, and testing policies
- **Evaluation Logging**: Track all policy evaluations with detailed results
- **Docker Support**: Easy deployment with Docker Compose

## Architecture

### Domain Model

```
PolicySet
├── id: string
├── name: string
├── description: string?
├── createdAt: DateTime
└── rules: PolicyRule[]

PolicyRule
├── id: string
├── policySetId: string
├── name: string
├── description: string?
├── effect: 'ALLOW' | 'DENY'
├── conditionJson: Condition
├── priority: number
└── createdAt: DateTime

EvaluationLog
├── id: string
├── policySetId: string
├── inputJson: object
├── resultJson: object
├── decision: 'ALLOW' | 'DENY'
└── createdAt: DateTime
```

### Technology Stack

**Backend:**
- Node.js + TypeScript
- Fastify (Web framework)
- Prisma (ORM)
- PostgreSQL (Database)

**Frontend:**
- Next.js 14
- React 18
- TypeScript

**Infrastructure:**
- Docker + Docker Compose
- PostgreSQL 15

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- PostgreSQL 15+ (for local development without Docker)

### Running with Docker Compose

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd policy-as-code-governor
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Start the services**
   ```bash
   docker-compose up --build
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Health Check: http://localhost:3001/health

### Local Development Setup

1. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   cd ..
   ```

2. **Set up the database**
   ```bash
   # Start PostgreSQL (using Docker)
   docker run --name policy-postgres -e POSTGRES_USER=policy_user \
     -e POSTGRES_PASSWORD=policy_pass -e POSTGRES_DB=policy_db \
     -p 5432:5432 -d postgres:15-alpine

   # Or use your own PostgreSQL instance and update DATABASE_URL
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database connection string
   ```

4. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

5. **Seed the database**
   ```bash
   npm run db:seed
   ```

6. **Start development servers**
   ```bash
   # Start both backend and frontend
   npm run dev

   # Or start them separately
   npm run dev:backend  # Backend on :3001
   npm run dev:frontend # Frontend on :3000
   ```

## Policy Condition Language

Policies are defined using a JSON-based condition language that supports various operators:

### Comparison Operators

```json
{
  "equals": ["user.role", "admin"],
  "notEquals": ["user.status", "suspended"],
  "in": ["action", ["view", "edit", "delete"]],
  "notIn": ["resource.type", ["secret", "confidential"]],
  "contains": ["user.email", "@company.com"],
  "startsWith": ["resource.name", "public_"],
  "endsWith": ["resource.name", ".jpg"],
  "greaterThan": ["user.yearsExperience", 5],
  "lessThan": ["resource.size", 1000],
  "greaterThanOrEqual": ["user.age", 21],
  "lessThanOrEqual": ["request.attempts", 3]
}
```

### Logical Operators

```json
{
  "all": [
    { "equals": ["user.role", "admin"] },
    { "equals": ["action", "delete"] }
  ],
  "any": [
    { "equals": ["user.role", "admin"] },
    { "equals": ["user.role", "moderator"] }
  ],
  "not": {
    "equals": ["user.status", "suspended"]
  }
}
```

### Context Structure

When evaluating policies, you provide a context object:

```json
{
  "user": {
    "id": "user123",
    "role": "admin",
    "department": "engineering",
    "email": "user@company.com"
  },
  "action": "delete",
  "resource": {
    "type": "document",
    "id": "doc456",
    "owner": "user123",
    "critical": false
  },
  "environment": {
    "time": "2024-01-15T10:30:00Z",
    "ip": "192.168.1.100"
  }
}
```

## API Reference

### Create Policy Set

```http
POST /policy-sets
Content-Type: application/json

{
  "name": "Admin Access Control",
  "description": "Policies for admin users",
  "rules": [
    {
      "name": "Admin Full Access",
      "description": "Admins can do anything",
      "effect": "ALLOW",
      "priority": 100,
      "conditionJson": {
        "equals": ["user.role", "admin"]
      }
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "id": "clxxx...",
  "name": "Admin Access Control",
  "description": "Policies for admin users",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "rules": [...]
}
```

### Get All Policy Sets

```http
GET /policy-sets
```

**Response:** `200 OK`
```json
[
  {
    "id": "clxxx...",
    "name": "Admin Access Control",
    "description": "Policies for admin users",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "rules": [...],
    "_count": {
      "evaluationLogs": 42
    }
  }
]
```

### Get Policy Set by ID

```http
GET /policy-sets/:id
```

**Response:** `200 OK` or `404 Not Found`

### Update Policy Set

```http
PUT /policy-sets/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "description": "Updated description",
  "rules": [...]
}
```

### Delete Policy Set

```http
DELETE /policy-sets/:id
```

**Response:** `204 No Content`

### Evaluate Policy

```http
POST /policy-sets/:id/evaluate
Content-Type: application/json

{
  "context": {
    "user": {
      "id": "user123",
      "role": "admin"
    },
    "action": "delete",
    "resource": {
      "type": "document"
    }
  }
}
```

**Response:** `200 OK`
```json
{
  "decision": "ALLOW",
  "matchedRules": [
    {
      "ruleId": "clxxx...",
      "ruleName": "Admin Full Access",
      "effect": "ALLOW",
      "priority": 100
    }
  ],
  "evaluatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Get Evaluation Logs

```http
GET /policy-sets/:id/logs
```

**Response:** `200 OK`
```json
[
  {
    "id": "clxxx...",
    "policySetId": "clxxx...",
    "inputJson": {...},
    "resultJson": {...},
    "decision": "ALLOW",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

## Example Use Cases

### Use Case 1: Role-Based Access Control (RBAC)

```json
{
  "name": "RBAC Policy",
  "rules": [
    {
      "name": "Admin Full Access",
      "effect": "ALLOW",
      "priority": 100,
      "conditionJson": {
        "equals": ["user.role", "admin"]
      }
    },
    {
      "name": "Staff View Only",
      "effect": "ALLOW",
      "priority": 50,
      "conditionJson": {
        "all": [
          { "equals": ["user.role", "staff"] },
          { "equals": ["action", "view"] }
        ]
      }
    }
  ]
}
```

### Use Case 2: Resource Ownership

```json
{
  "name": "Ownership Policy",
  "rules": [
    {
      "name": "Owner Can Edit",
      "effect": "ALLOW",
      "priority": 80,
      "conditionJson": {
        "all": [
          { "equals": ["user.id", "resource.owner"] },
          { "in": ["action", ["view", "edit"]] }
        ]
      }
    }
  ]
}
```

### Use Case 3: Department-Based Access

```json
{
  "name": "Department Policy",
  "rules": [
    {
      "name": "HR Can View Employee Data",
      "effect": "ALLOW",
      "priority": 70,
      "conditionJson": {
        "all": [
          { "equals": ["user.department", "hr"] },
          { "equals": ["resource.type", "employee"] },
          { "in": ["action", ["view", "edit"]] }
        ]
      }
    }
  ]
}
```

### Use Case 4: Complex Multi-Condition

```json
{
  "name": "Complex Policy",
  "rules": [
    {
      "name": "Senior Staff Advanced Access",
      "effect": "ALLOW",
      "priority": 75,
      "conditionJson": {
        "all": [
          { "in": ["user.role", ["senior_staff", "lead", "manager"]] },
          {
            "any": [
              { "equals": ["user.certified", true] },
              { "greaterThanOrEqual": ["user.yearsExperience", 5] }
            ]
          },
          { "not": { "equals": ["user.status", "probation"] } }
        ]
      }
    }
  ]
}
```

## Evaluation Logic

The policy engine uses the following evaluation logic:

1. **Rule Sorting**: Rules are sorted by priority (highest first)
2. **Condition Evaluation**: Each rule's condition is evaluated against the context
3. **Rule Matching**: Rules that match are collected
4. **Decision Logic**:
   - If any DENY rule matches → **DENY**
   - If any ALLOW rule matches and no DENY → **ALLOW**
   - If no rules match → **DENY** (default deny / fail-closed)

## Available Scripts

### Root Level

- `npm run dev` - Start both backend and frontend in development mode
- `npm run build` - Build both backend and frontend
- `npm run start` - Start both backend and frontend in production mode
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed the database with demo data
- `npm run db:studio` - Open Prisma Studio
- `npm run lint` - Lint both projects
- `npm run test` - Run tests

### Backend Only

- `cd backend && npm run dev` - Start backend development server
- `cd backend && npm run build` - Build backend
- `cd backend && npm run start` - Start backend in production mode

### Frontend Only

- `cd frontend && npm run dev` - Start frontend development server
- `cd frontend && npm run build` - Build frontend
- `cd frontend && npm run start` - Start frontend in production mode

## Project Structure

```
policy-as-code-governor/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # Database schema
│   │   └── seed.ts            # Seed data
│   ├── src/
│   │   ├── engine/
│   │   │   └── evaluator.ts   # Policy evaluation engine
│   │   ├── routes/
│   │   │   └── policy-sets.ts # API routes
│   │   ├── types/
│   │   │   └── policy.ts      # Type definitions
│   │   └── index.ts           # Entry point
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   └── app/
│   │       ├── globals.css    # Styles
│   │       ├── layout.tsx     # Root layout
│   │       └── page.tsx       # Main page
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
├── .env.example
├── package.json
└── README.md
```

## Future Enhancements

- **Multi-tenancy**: Support for multiple organizations with isolated policies
- **Richer DSL**: Add support for custom functions and more complex conditions
- **Policy Versioning**: Track changes to policies over time
- **Policy Testing Framework**: Automated testing of policies with test cases
- **Performance Optimizations**: Caching and indexing for large policy sets
- **Audit Trail**: Detailed audit logs for compliance
- **Policy Templates**: Pre-built policy templates for common use cases
- **Integration SDKs**: Client libraries for popular languages
- **Real-time Evaluation**: WebSocket support for real-time policy evaluation
- **Policy Simulation**: Test policies against historical data
- **Role Mining**: Suggest policies based on access patterns
- **ABAC Support**: Attribute-based access control with more complex attributes
- **External Data Sources**: Fetch context from external APIs
- **Policy Conflict Detection**: Automatically detect conflicting rules

## Integration Examples

### Node.js/TypeScript

```typescript
async function checkAccess(userId: string, action: string, resourceId: string) {
  const response = await fetch('http://localhost:3001/policy-sets/clxxx.../evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context: {
        user: { id: userId },
        action: action,
        resource: { id: resourceId }
      }
    })
  });

  const result = await response.json();
  return result.decision === 'ALLOW';
}
```

### Python

```python
import requests

def check_access(user_id, action, resource_id):
    response = requests.post(
        'http://localhost:3001/policy-sets/clxxx.../evaluate',
        json={
            'context': {
                'user': {'id': user_id},
                'action': action,
                'resource': {'id': resource_id}
            }
        }
    )
    result = response.json()
    return result['decision'] == 'ALLOW'
```

### cURL

```bash
curl -X POST http://localhost:3001/policy-sets/clxxx.../evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "context": {
      "user": {"id": "user123", "role": "admin"},
      "action": "delete",
      "resource": {"type": "document"}
    }
  }'
```

## Troubleshooting

### Database Connection Issues

If you encounter database connection issues:

1. Ensure PostgreSQL is running
2. Check your `DATABASE_URL` in `.env`
3. Run `npm run db:migrate` to ensure migrations are up to date

### Port Conflicts

If ports 3000 or 3001 are already in use:

1. Update the ports in `.env` and `docker-compose.yml`
2. Update `NEXT_PUBLIC_API_URL` in frontend `.env`

### Migration Issues

To reset the database:

```bash
cd backend
npx prisma migrate reset
npx prisma migrate dev
npm run db:seed
```

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## License

MIT License - feel free to use this project for any purpose.

---

Built with ❤️ using TypeScript, Fastify, Next.js, and Prisma.
