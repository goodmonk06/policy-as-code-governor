# Changelog

All notable changes to the Policy-as-Code Governor project are documented in this file.

## [2.0.0] - Phase 2 & 3 Expansion - 2025-01-XX

### Major Features Added

#### Domain Model Expansion
- **PolicyVersion**: Full versioning system with rollback capability
- **Tag System**: Organize and categorize policy sets with tags
- **PolicyTemplate**: Reusable policy patterns with variable substitution
- **PolicyComment**: Collaboration and documentation on policies
- **EvaluationMetrics**: Aggregated daily metrics for analytics
- Enhanced PolicySet with: `isActive`, `category`, `lastEvaluatedAt`
- Enhanced PolicyRule with: `isEnabled`, `validFrom`, `validUntil`, `metadata`
- Enhanced EvaluationLog with: `durationMs`, `errorMessage`, `userId`, `metadata`

#### Vertical Slices - Policy Versioning
- Create automatic versions on policy updates
- View complete version history
- Compare any two versions with diff view
- Rollback to any previous version
- API endpoints for all version operations

#### Vertical Slices - Tagging & Organization
- Create and manage tags with colors and descriptions
- Tag policy sets for categorization
- Search and filter policies by tags
- Tag cloud and tag-based navigation
- Bulk tagging operations

#### Vertical Slices - Analytics Dashboard
- System-wide analytics (total policies, evaluations, distributions)
- Per-policy-set metrics with trends
- Daily metrics aggregation for performance insights
- Top policy sets by usage
- Decision distribution analysis
- Evaluation latency tracking

#### Extensibility Layer
- **Adapter Interfaces**: Pluggable external integrations
  - INotificationAdapter (Console, Webhook, Email implementations)
  - IMetricsAdapter (InMemory, Prometheus, DataDog implementations)
  - IExternalAuthAdapter (user attribute fetching)
  - IStorageAdapter (alternative backends)
  - IAuditAdapter (external audit logs)
- **Event System**: Domain event bus for decoupled operations
  - 9 event types covering all major operations
  - Event handler registration
  - Wildcard handlers for cross-cutting concerns

#### CLI Tools
- `policy-cli seed` - Load database with scenarios
- `policy-cli validate <file>` - Validate policy JSON
- `policy-cli export` - Export all policies
- `policy-cli import <file>` - Import policies
- `policy-cli test <id> <context>` - Test evaluation
- `policy-cli analyze` - Generate analytics reports
- `policy-cli list` - List all policy sets
- `policy-cli aggregate` - Run metrics aggregation

#### Enhanced Testing
- Comprehensive test suite for policy evaluator (100+ cases)
- Error handling tests
- Metrics collection tests
- Test utilities and mock data factories
- Jest configuration with TypeScript support

#### Quality & Observability
- **Structured Logging**: JSON-formatted logs with correlation IDs
- **Metrics Collection**: Performance tracking for all operations
- **Error Handling**: Custom error classes with proper HTTP codes
- **Request/Response Logging**: Complete request lifecycle tracking
- **Health Checks**: `/health` and `/metrics` endpoints

### Enhanced Seed Data
- 5 comprehensive real-world scenarios:
  1. **Enterprise RBAC**: 6 roles with diverse permissions
  2. **Healthcare Compliance**: HIPAA-style patient data access
  3. **Financial Services**: SOX compliance with dual authorization
  4. **DevOps CI/CD**: Environment-based deployment rules
  5. **Multi-Tenant SaaS**: Tenant isolation and cross-tenant blocking
- 6 categorization tags (security, compliance, rbac, etc.)
- 2 reusable policy templates
- Demo comments and versions

### Documentation
- **PHASE3_OVERVIEW.md**: Comprehensive expansion plan and rationale
- **ARCHITECTURE.md**: Deep dive into system design and components
- Enhanced README with all new features
- API documentation for all new endpoints
- CLI usage examples

### API Enhancements

#### New Endpoints - Versioning
- `GET /policy-sets/:id/versions` - List versions
- `POST /policy-sets/:id/versions` - Create version
- `GET /policy-sets/:id/versions/:v` - Get specific version
- `POST /policy-sets/:id/rollback/:v` - Rollback to version
- `GET /policy-sets/:id/versions/compare?v1=X&v2=Y` - Compare versions

#### New Endpoints - Tagging
- `POST /tags` - Create tag
- `GET /tags` - List all tags
- `GET /tags/:id` - Get tag details
- `PUT /tags/:id` - Update tag
- `DELETE /tags/:id` - Delete tag
- `POST /policy-sets/:id/tags` - Tag a policy set
- `DELETE /policy-sets/:id/tags/:tagId` - Remove tag
- `GET /policy-sets/:id/tags` - Get policy set tags
- `GET /policy-sets/search/by-tags?tags=tag1,tag2` - Search by tags

#### New Endpoints - Analytics
- `GET /analytics/summary?days=7` - System-wide analytics
- `GET /analytics/policy-sets/:id?days=30` - Policy set metrics
- `GET /analytics/policy-sets/:id/trend?days=30` - Evaluation trend
- `POST /analytics/aggregate-yesterday` - Trigger metrics aggregation

### Breaking Changes
None - All changes are additive and maintain backward compatibility

### Migration Notes
- Run `npm run db:migrate` to apply new schema
- Existing policy sets will work without modification
- New fields have sensible defaults
- Old evaluation logs remain queryable

## [1.0.0] - Initial Release - 2025-01-XX

### Core Features
- JSON-based policy condition language
- Policy evaluation engine with 13+ operators
- REST API for policy management
- PostgreSQL database with Prisma ORM
- Next.js admin dashboard
- Docker Compose setup
- Basic seed data with 5 demo policy sets

### Operators Supported
- Comparison: equals, notEquals, in, notIn, contains, startsWith, endsWith
- Numeric: greaterThan, lessThan, greaterThanOrEqual, lessThanOrEqual
- Logical: all (AND), any (OR), not (NOT)

### API Endpoints
- `POST /policy-sets` - Create policy set
- `GET /policy-sets` - List policy sets
- `GET /policy-sets/:id` - Get policy set
- `PUT /policy-sets/:id` - Update policy set
- `DELETE /policy-sets/:id` - Delete policy set
- `POST /policy-sets/:id/evaluate` - Evaluate policy
- `GET /policy-sets/:id/logs` - Get evaluation logs
