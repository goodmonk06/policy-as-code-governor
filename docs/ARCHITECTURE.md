# Policy-as-Code Governor - Architecture

## System Overview

The Policy-as-Code Governor is a three-tier architecture designed for high availability, scalability, and maintainability:

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend Layer                          │
│          (Next.js - Admin Dashboard & UI)                   │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTP/REST
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    API/Application Layer                     │
│          (Fastify - REST API & Business Logic)              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Policy      │  │  Versioning  │  │  Analytics   │     │
│  │  Management  │  │  Service     │  │  Service     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Evaluation  │  │  Tag         │  │  Event       │     │
│  │  Engine      │  │  Service     │  │  Bus         │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────┬────────────────────────────────────────────┘
                 │ Prisma ORM
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                      Data Layer                              │
│                  (PostgreSQL Database)                       │
│                                                              │
│  ┌──────────┐ ┌────────┐ ┌──────────┐ ┌─────────────┐    │
│  │ Policy   │ │ Rules  │ │ Versions │ │ Evaluations │    │
│  │ Sets     │ │        │ │          │ │ Logs        │    │
│  └──────────┘ └────────┘ └──────────┘ └─────────────┘    │
│                                                              │
│  ┌──────────┐ ┌────────┐ ┌──────────┐ ┌─────────────┐    │
│  │ Tags     │ │Comments│ │ Templates│ │ Metrics     │    │
│  └──────────┘ └────────┘ └──────────┘ └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Policy Evaluation Engine

**Location**: `backend/src/engine/evaluator.ts`

The heart of the system. Implements a JSON-based policy evaluation engine that:

- Parses condition trees with support for 13+ operators
- Evaluates conditions against runtime context
- Implements priority-based rule evaluation
- Returns structured evaluation results with matched rules

**Key Design Decisions**:
- **Immutable Evaluation**: Each evaluation is stateless and independent
- **Fail-Closed**: Default to DENY when no rules match
- **DENY Precedence**: DENY rules always override ALLOW rules
- **Performance**: Optimized for sub-100ms evaluations

**Supported Operators**:
```
Comparison: equals, notEquals, in, notIn, contains, startsWith, endsWith
Numeric: greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual
Logical: all (AND), any (OR), not (NOT)
```

### 2. Service Layer

**Location**: `backend/src/services/`

Implements business logic and coordinates between API and data layers:

#### VersionService
- Automatic versioning on policy updates
- Version comparison and diff generation
- Rollback to historical versions
- Snapshot storage of complete rule sets

#### TagService
- Tag CRUD operations
- Policy set tagging and searching
- Tag-based policy filtering

#### AnalyticsService
- Daily metrics aggregation
- System-wide analytics
- Policy set performance tracking
- Evaluation trend analysis

### 3. API Layer

**Location**: `backend/src/routes/`

RESTful API built with Fastify:

#### Policy Sets API
```
POST   /policy-sets           - Create policy set
GET    /policy-sets           - List all policy sets
GET    /policy-sets/:id       - Get specific policy set
PUT    /policy-sets/:id       - Update policy set
DELETE /policy-sets/:id       - Delete policy set
POST   /policy-sets/:id/evaluate - Evaluate policy
GET    /policy-sets/:id/logs  - Get evaluation logs
```

#### Versioning API
```
GET    /policy-sets/:id/versions        - List versions
POST   /policy-sets/:id/versions        - Create version
GET    /policy-sets/:id/versions/:v     - Get specific version
POST   /policy-sets/:id/rollback/:v     - Rollback to version
GET    /policy-sets/:id/versions/compare - Compare versions
```

#### Tagging API
```
POST   /tags                      - Create tag
GET    /tags                      - List tags
GET    /tags/:id                  - Get tag
PUT    /tags/:id                  - Update tag
DELETE /tags/:id                  - Delete tag
POST   /policy-sets/:id/tags      - Tag policy set
DELETE /policy-sets/:id/tags/:tagId - Untag policy set
GET    /policy-sets/search/by-tags - Search by tags
```

#### Analytics API
```
GET    /analytics/summary              - System-wide analytics
GET    /analytics/policy-sets/:id      - Policy set metrics
GET    /analytics/policy-sets/:id/trend - Evaluation trend
POST   /analytics/aggregate-yesterday  - Trigger aggregation
```

### 4. Data Layer

**Location**: `backend/prisma/schema.prisma`

PostgreSQL database with the following entities:

#### Core Entities
- **PolicySet**: Container for related policy rules
- **PolicyRule**: Individual rules with conditions and effects
- **EvaluationLog**: Audit trail of all evaluations

#### Extended Entities
- **PolicyVersion**: Historical snapshots for auditing and rollback
- **Tag**: Categorization and organization
- **PolicySetTag**: Many-to-many relationship
- **PolicyTemplate**: Reusable policy patterns
- **PolicyComment**: Collaboration and documentation
- **EvaluationMetrics**: Aggregated performance metrics

**Indexing Strategy**:
- Primary indexes on all foreign keys
- Composite indexes on frequently queried combinations
- Date indexes for time-series queries
- Decision indexes for analytics

### 5. Extensibility Layer

**Location**: `backend/src/lib/adapters/`, `backend/src/lib/events/`

Plugin architecture for external integrations:

#### Adapter Interfaces
```typescript
INotificationAdapter  - Alert system integration
IMetricsAdapter       - External metrics (Prometheus, DataDog)
IExternalAuthAdapter  - User attribute fetching
IStorageAdapter       - Alternative storage backends
IAuditAdapter         - External audit logs
```

#### Event System
```typescript
Event Types:
- policy_set.created, updated, deleted
- policy_set.version_created
- evaluation.performed, failed
- tag.created
- policy_set.tagged
- comment.added
```

**Event Bus Pattern**:
- In-memory event bus for decoupling
- Wildcard handlers for cross-cutting concerns
- Async event processing
- Error isolation (failing handlers don't break main flow)

### 6. Observability

#### Structured Logging
- JSON-formatted logs for easy parsing
- Correlation IDs for request tracing
- Log levels: debug, info, warn, error
- Contextual metadata on every log

#### Metrics Collection
- Request duration histograms
- Counter metrics for operations
- Gauge metrics for system state
- Custom metrics for business KPIs

#### Health Checks
- `/health` - Basic health status
- `/metrics` - Performance metrics
- Database connectivity checks

## Data Flow

### Policy Evaluation Flow

```
1. Client Request
   ↓
2. API Route Handler
   ↓ (validate request)
3. Fetch Policy Set + Rules (database)
   ↓
4. Policy Evaluator
   ↓ (evaluate conditions)
5. Generate Result
   ↓
6. Log Evaluation (database)
   ↓ (emit event)
7. Event Handlers
   ↓
8. Return Response
```

### Policy Update Flow with Versioning

```
1. Update Request
   ↓
2. Fetch Current Policy Set
   ↓
3. Create Version Snapshot (before update)
   ↓
4. Apply Updates
   ↓ (transactional)
5. Emit policy_set.updated Event
   ↓
6. Notification Handlers
   ↓
7. Return Updated Policy
```

### Analytics Aggregation Flow

```
1. Scheduled Job / Manual Trigger
   ↓
2. Query Evaluation Logs (date range)
   ↓
3. Aggregate Metrics (count, avg, min, max)
   ↓
4. Upsert EvaluationMetrics
   ↓
5. Log Aggregation Complete
```

## Security Considerations

### Input Validation
- Zod schemas for all API inputs
- Condition JSON validation
- SQL injection protection via Prisma ORM

### Error Handling
- Never expose internal errors to clients
- Structured error responses
- Error logging with stack traces

### Rate Limiting
- (Planned) Per-client rate limiting
- (Planned) Evaluation throttling

### Audit Trail
- All evaluations logged
- Version history maintained
- Immutable evaluation logs

## Scalability

### Horizontal Scaling
- Stateless API servers
- Shared database state
- Load balancer ready

### Performance Optimizations
- Database indexes on hot paths
- Connection pooling (Prisma)
- Efficient JSON condition parsing
- (Future) Evaluation result caching

### Database Scaling
- Read replicas for analytics queries
- (Future) Partitioning on evaluation_logs
- Periodic log archival

## Testing Strategy

### Unit Tests
- Policy evaluator (100+ test cases)
- Error handling
- Metrics collection
- Utility functions

### Integration Tests
- API route testing
- Database operations
- Service layer interactions

### E2E Tests
- Complete evaluation flows
- Policy CRUD operations
- Versioning workflows

## Deployment

### Development
```bash
docker-compose up
npm run db:migrate
npm run db:seed
npm run dev
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up
npm run db:migrate:deploy
npm run start
```

### Environment Variables
```
DATABASE_URL      - PostgreSQL connection string
BACKEND_PORT      - API server port (default: 3001)
NODE_ENV          - Environment (development/production)
LOG_LEVEL         - Logging verbosity
```

## Future Enhancements

1. **GraphQL API**: Alternative to REST for flexible queries
2. **WebSocket Support**: Real-time policy updates
3. **Multi-Tenancy**: Tenant isolation at database level
4. **Policy as Code**: Git-based policy management
5. **Decision Caching**: Cache evaluation results for performance
6. **Distributed Tracing**: OpenTelemetry integration
7. **Policy Testing Framework**: Unit tests for policies themselves
8. **ML-based Suggestions**: Recommend policies based on patterns

## Contributing

When contributing to the architecture:
1. Maintain separation of concerns
2. Keep services stateless when possible
3. Use the event system for cross-cutting concerns
4. Add indexes for new query patterns
5. Write tests for new components
6. Update this document with architectural changes
