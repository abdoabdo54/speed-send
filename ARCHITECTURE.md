# Gmail Bulk Sender SaaS - Architecture Documentation

## System Overview

This document provides a detailed technical overview of the Gmail Bulk Sender SaaS application architecture.

## High-Level Architecture

```
┌─────────────────┐
│   Web Browser   │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────────────────────────────────────────┐
│              Next.js Frontend                       │
│  - React 18 + TypeScript                           │
│  - Tailwind CSS + shadcn/ui                        │
│  - Client-side state management                    │
└────────┬────────────────────────────────────────────┘
         │ REST API
         │
┌────────▼────────────────────────────────────────────┐
│              FastAPI Backend                        │
│  - Python 3.11                                      │
│  - RESTful API endpoints                           │
│  - SQLAlchemy ORM                                  │
│  - Pydantic validation                             │
└───┬─────────────┬──────────────┬────────────────────┘
    │             │              │
    │             │              │
    ▼             ▼              ▼
┌─────────┐  ┌─────────┐  ┌──────────────┐
│PostgreSQL│  │  Redis  │  │Celery Workers│
│Database  │  │ Broker  │  │ (Async Tasks)│
└─────────┘  └─────────┘  └──────────────┘
    │                           │
    │                           │
    └───────────┬───────────────┘
                │
                ▼
        ┌───────────────┐
        │  Google APIs  │
        │ - Gmail API   │
        │ - Admin SDK   │
        └───────────────┘
```

## Component Details

### 1. Frontend Layer (Next.js)

**Technology Stack:**
- Next.js 14 (App Router)
- React 18
- TypeScript
- Tailwind CSS
- shadcn/ui components
- Axios for HTTP requests

**Key Components:**

```
frontend/
├── src/
│   ├── app/              # Next.js pages
│   │   ├── page.tsx      # Dashboard
│   │   ├── accounts/     # Account management
│   │   ├── campaigns/    # Campaign CRUD
│   │   │   └── new/      # Campaign builder wizard
│   │   ├── users/        # Workspace users
│   │   ├── reports/      # Analytics
│   │   └── settings/     # Configuration
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   └── Sidebar.tsx   # Navigation
│   └── lib/
│       ├── api.ts        # API client
│       └── utils.ts      # Utilities
```

**Features:**
- Server-side rendering (SSR)
- Real-time campaign progress updates
- Responsive design (mobile-friendly)
- Dark/light mode support
- Form validation
- Error handling

### 2. Backend Layer (FastAPI)

**Technology Stack:**
- FastAPI 0.104+
- Python 3.11
- SQLAlchemy 2.0
- Pydantic v2
- Asyncio

**Architecture Pattern:** MVC with Service Layer

```
backend/
├── app/
│   ├── main.py           # FastAPI app initialization
│   ├── config.py         # Configuration management
│   ├── database.py       # Database connection
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic schemas
│   ├── encryption.py     # AES-256 encryption
│   ├── google_api.py     # Google API wrapper
│   ├── celery_app.py     # Celery configuration
│   ├── tasks.py          # Celery tasks
│   └── routers/          # API endpoints
│       ├── accounts.py   # Service account CRUD
│       ├── users.py      # Workspace users
│       ├── campaigns.py  # Campaign management
│       └── dashboard.py  # Statistics
```

**API Endpoints:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/accounts` | GET | List service accounts |
| `/api/v1/accounts` | POST | Upload new account |
| `/api/v1/accounts/{id}/sync` | POST | Sync Workspace users |
| `/api/v1/users` | GET | List all users |
| `/api/v1/campaigns` | GET | List campaigns |
| `/api/v1/campaigns` | POST | Create campaign |
| `/api/v1/campaigns/{id}/control` | POST | Start/pause/resume |
| `/api/v1/campaigns/{id}/duplicate` | POST | Clone campaign |
| `/api/v1/dashboard/stats` | GET | Dashboard statistics |

### 3. Database Layer (PostgreSQL)

**Schema Design:**

```sql
-- Service Accounts
service_accounts
  - id (PK)
  - name
  - client_email
  - domain
  - encrypted_json (AES-256)
  - status
  - quota_limit
  - quota_used_today

-- Workspace Users
workspace_users
  - id (PK)
  - service_account_id (FK)
  - email
  - full_name
  - emails_sent_today
  - quota_limit
  - is_active

-- Campaigns
campaigns
  - id (PK)
  - name
  - subject
  - body_html
  - body_plain
  - recipients (JSON)
  - status
  - sent_count
  - failed_count
  - celery_task_id

-- Email Logs
email_logs
  - id (PK)
  - campaign_id (FK)
  - recipient_email
  - sender_email
  - status
  - error_message
  - retry_count
  - sent_at
```

**Relationships:**
- One service account → Many workspace users
- One campaign → Many email logs
- Many-to-many: Campaigns ↔ Service Accounts

### 4. Task Queue (Celery + Redis)

**Queue Architecture:**

```
┌────────────────┐
│  FastAPI API   │
│  Creates Task  │
└───────┬────────┘
        │
        ▼
┌────────────────┐
│ Redis Broker   │
│  Task Queue    │
└───────┬────────┘
        │
        ▼
┌────────────────────────────────┐
│    Celery Workers (Pool)       │
│  ┌──────────┐  ┌──────────┐   │
│  │ Worker 1 │  │ Worker 2 │   │
│  └──────────┘  └──────────┘   │
└────────────────────────────────┘
```

**Task Types:**

1. **send_campaign_emails**
   - Main campaign orchestrator
   - Manages batch processing
   - Handles pause/resume logic
   - Updates campaign progress

2. **send_single_email**
   - Sends individual email
   - Handles retries
   - Logs success/failure
   - Updates quota counters

3. **sync_workspace_users**
   - Fetches users via Admin SDK
   - Updates database
   - Runs asynchronously

**Concurrency Model:**
- Worker pool with configurable size
- Task batching for efficiency
- Rate limiting per account
- Exponential backoff for retries

### 5. Google API Integration

**Authentication Flow:**

```
Service Account JSON
        │
        ▼
Load Credentials
        │
        ▼
Domain-Wide Delegation
        │
        ▼
with_subject(user@domain.com)
        │
        ▼
Impersonate User
        │
        ▼
Gmail API / Admin SDK
```

**APIs Used:**

1. **Gmail API**
   - `users().messages().send()` - Send emails
   - Scopes required:
     - `gmail.send`
     - `gmail.compose`
     - `gmail.insert`
     - `gmail.modify`

2. **Admin SDK Directory API**
   - `users().list()` - Fetch all users
   - Scope: `admin.directory.user.readonly`

### 6. Campaign Processing Flow

```
1. User creates campaign (DRAFT)
        ↓
2. User clicks "Start"
        ↓
3. Status → QUEUED
        ↓
4. Celery task: send_campaign_emails
        ↓
5. Create email_log entries
        ↓
6. Status → RUNNING
        ↓
7. Process in batches
   ├─ Select sender (round-robin)
   ├─ Create MIME message
   ├─ Substitute variables
   ├─ Send via Gmail API
   └─ Update counters
        ↓
8. Check if PAUSED
   ├─ Yes → Wait
   └─ No → Continue
        ↓
9. All emails processed
        ↓
10. Status → COMPLETED
```

### 7. Security Architecture

**Encryption:**
- Service account JSONs encrypted with AES-256
- Encryption key stored in environment variables
- Keys never logged or exposed

**Data Protection:**
- PostgreSQL passwords in environment
- Redis not exposed publicly
- Docker network isolation
- Optional JWT authentication (extensible)

**Best Practices:**
- Input validation (Pydantic)
- SQL injection prevention (ORM)
- XSS prevention (React escaping)
- CORS configuration
- Rate limiting

### 8. Scalability Design

**Horizontal Scaling:**

```
Load Balancer
    │
    ├─ Frontend Instance 1
    ├─ Frontend Instance 2
    └─ Frontend Instance N
    
    ├─ Backend Instance 1
    ├─ Backend Instance 2
    └─ Backend Instance N
    
    ├─ Celery Worker 1
    ├─ Celery Worker 2
    └─ Celery Worker N
    
Database (Primary + Replicas)
Redis (Cluster Mode)
```

**Performance Optimizations:**
- Connection pooling (PostgreSQL)
- Redis caching
- Async task processing
- Batch processing
- Database indexing on frequently queried fields

**Capacity Planning:**

| Component | 1K emails/day | 100K emails/day | 1M emails/day |
|-----------|---------------|-----------------|---------------|
| Backend | 1 instance | 2-3 instances | 5+ instances |
| Workers | 2 workers | 10 workers | 50+ workers |
| Database | 2GB RAM | 8GB RAM | 32GB+ RAM |
| Redis | 512MB | 2GB | 8GB |

### 9. Monitoring & Observability

**Metrics to Track:**
- Campaign success rate
- Email delivery time
- Queue depth
- Worker utilization
- API error rates
- Database query performance

**Logging:**
- Structured logging (JSON)
- Log levels: DEBUG, INFO, WARNING, ERROR
- Centralized log aggregation recommended (e.g., ELK stack)

**Health Checks:**
- `/health` endpoint
- Database connectivity
- Redis connectivity
- Celery worker status

### 10. Error Handling

**Retry Strategy:**
```python
# Email sending retry logic
retry_count = 0
max_retries = 3
backoff_minutes = [5, 15, 60]  # Exponential backoff

for attempt in range(max_retries):
    try:
        send_email()
        break
    except Exception as e:
        if attempt < max_retries - 1:
            wait(backoff_minutes[attempt])
        else:
            mark_as_failed()
```

**Error Categories:**
1. **Transient** (429, 500) → Retry
2. **Permanent** (400, 401) → Fail immediately
3. **Network** → Retry with backoff
4. **Quota** → Pause campaign

## Data Flow Diagrams

### Campaign Creation Flow
```
User Input → Validation → Database → Celery Queue → Workers → Gmail API
```

### User Sync Flow
```
Admin SDK → Fetch Users → Parse → Database Update → UI Refresh
```

### Email Sending Flow
```
Campaign → Select Sender → Get Credentials → Impersonate → Send → Log Result
```

## Deployment Architecture

**Development:**
- Docker Compose (single host)

**Production:**
- Docker Swarm or Kubernetes
- Separate databases (managed PostgreSQL)
- Redis cluster
- CDN for frontend assets
- SSL termination at load balancer

---

This architecture supports:
- ✅ High availability
- ✅ Horizontal scaling
- ✅ Fault tolerance
- ✅ Security best practices
- ✅ Real-time monitoring

