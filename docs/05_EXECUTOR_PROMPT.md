# Master Executor Prompt
## MMA Event Management System - Master Executor

## 🎯 Project Overview

You are building a complete **MMA Event Management System** using Next.js 14, Supabase, TypeScript, and Tailwind CSS. This system manages all logistics and operations for MMA events including fighters, staff, flights, visas, hotels, transport, pre-event requirements, and operational tasks.

**Follow this executor prompt to build the entire system sprint by sprint.**

---

## 📋 System Architecture

### Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **State**: React hooks, Zustand (optional)
- **Forms**: React Hook Form + Zod validation
- **Deployment**: Vercel

### Database Schema

- 27 tables with `mma_` prefix
- Row Level Security (RLS) on all tables
- Triggers for automatic timestamps
- Indexes for performance

### Authentication

- Admin/Staff: Email + Password
- Temporary Users: Google OAuth with expiration
- Permission system by area + level

---

## 🗺️ Sprint Execution Map

```
SPRINT_00 (Foundation)
    │
    ▼
SPRINT_01 (Auth + People)
    │
    ▼
SPRINT_02 (Events + Enrolled)
    │
    ├──────────────┬──────────────┐
    ▼              ▼              ▼
SPRINT_03      SPRINT_04      (parallel)
(Flights)      (Visas)
    │              │
    └──────┬───────┘
           ▼
       SPRINT_05 (Hotels + Transport)
           │
           ▼
       SPRINT_06 (Stats + Music + Tasks)
           │
           ▼
       SPRINT_07 (Pre-event + Batches)
           │
           ▼
       SPRINT_08 (Dashboard + War Room + Deploy)
```

---

## 🚀 Execution Instructions

### Before Starting

1. **Read all documentation first:**
   - `docs/01_PROJECT_DOCUMENTATION.md` - Full system architecture
   - `docs/02_SECURITY_CHECKLIST.md` - Security requirements
   - `docs/03_EXECUTION_PLAN.md` - Sprint details and estimates

2. **Prepare environment:**
   - Node.js 18+ installed
   - Supabase project created
   - Git repository initialized

3. **Have ready:**
   - Supabase URL and keys
   - Google OAuth credentials (optional)

---

## 📦 Sprint Execution Sequence

### SPRINT 00: Project Foundation


**File:** `docs/prompts/SPRINT_00_PROMPT.md`

**Objective:** Setup Next.js project, Supabase client, base layout, and authentication foundation.

**Execute:**
```
1. Create Next.js 14 project with TypeScript
2. Install dependencies (shadcn/ui, supabase-js, etc.)
3. Configure Supabase client (client + server)
4. Setup middleware for auth
5. Create base layout with sidebar navigation
6. Implement login page
```

**Deliverables:**
- [ ] Next.js project running on localhost:3000
- [ ] Supabase client configured
- [ ] Login page functional
- [ ] Base dashboard layout ready

**Validation Checkpoint:**
```bash
npm run dev
# Visit http://localhost:3000
# Should see login page
# After login, should see dashboard layout
```

**Dependencies:** None (first sprint)

---

### SPRINT 01: Authentication + People Database


**File:** `docs/prompts/SPRINT_01_PROMPT.md`

**Objective:** Complete authentication system and people (fighters, staff, VIPs) management.

**Execute:**
```
1. Implement email/password authentication
2. Setup Google OAuth for temporary users
3. Create user invitation system
4. Build People CRUD (Create, Read, Update, Delete)
5. Implement CSV import for bulk people upload
6. Create people table with filters and search
```

**Deliverables:**
- [ ] Auth context and hooks
- [ ] Protected routes working
- [ ] People list page with table
- [ ] People form (create/edit)
- [ ] CSV import functional
- [ ] Role-based filtering

**Validation Checkpoint:**
```bash
# Test authentication:
1. Login with email/password
2. Logout and login again
3. Create a new person
4. Edit the person
5. Import CSV with multiple people
6. Filter by role (fighter, staff, VIP)
```

**Dependencies:** Sprint 00

---

### SPRINT 02: Events + Enrolled Management


**File:** `docs/prompts/SPRINT_02_PROMPT.md`

**Objective:** Event management and participant enrollment with Event ID system.

**Execute:**
```
1. Create Events CRUD
2. Implement event status workflow
3. Build enrollment system (link people to events)
4. Generate unique Event IDs per enrollment
5. Create event selector for navigation
6. Build enrolled list with management
```

**Deliverables:**
- [ ] Events list and form
- [ ] Event status management
- [ ] Enrollment page
- [ ] Event ID generation (format: EVT-XXX-001)
- [ ] Event context for navigation
- [ ] Enrolled table with filters

**Validation Checkpoint:**
```bash
# Test events:
1. Create a new event
2. Add participants (enroll people)
3. Verify Event IDs are generated
4. Change event status
5. Filter enrolled by role
6. Remove enrollment
```

**Dependencies:** Sprint 01

---

### SPRINT 03: Flights Management


**File:** `docs/prompts/SPRINT_03_PROMPT.md`

**Objective:** Flight tracking with arrival/departure management and ticket assignments.

**Execute:**
```
1. Create Flights CRUD
2. Implement flight types (arrival, departure, full)
3. Build flight ticket assignment
4. Link enrolled to flights
5. Create flight timeline view
6. Implement ticket status tracking
```

**Deliverables:**
- [ ] Flights list and form
- [ ] Flight type handling
- [ ] Ticket assignment to enrolled
- [ ] Arrival/departure flight linking
- [ ] Flight filters and search
- [ ] Ticket status management

**Validation Checkpoint:**
```bash
# Test flights:
1. Create arrival flight
2. Create departure flight
3. Assign tickets to enrolled participants
4. Link flights to enrolled (arrival_flight_id, departure_flight_id)
5. View flights by date
6. Update ticket status
```

**Dependencies:** Sprint 02
**Can run parallel with:** Sprint 04

---

### SPRINT 04: Visas Management


**File:** `docs/prompts/SPRINT_04_PROMPT.md`

**Objective:** Visa tracking with status workflow (1-6) and document management.

**Execute:**
```
1. Create Visas CRUD
2. Implement 6-step status workflow
3. Build visa status badges
4. Create document attachment system
5. Implement visa filters
6. Build visa timeline/history
```

**Deliverables:**
- [ ] Visas list and form
- [ ] Status workflow (1: Not Started → 6: Received)
- [ ] Visual status badges
- [ ] Document upload/link
- [ ] Visa expiration tracking
- [ ] Status change history

**Validation Checkpoint:**
```bash
# Test visas:
1. Create visa for enrolled participant
2. Progress through status workflow
3. Attach documents
4. Filter by status
5. Check expiration warnings
6. View status history
```

**Dependencies:** Sprint 02
**Can run parallel with:** Sprint 03

---

### SPRINT 05: Hotels + Transport


**File:** `docs/prompts/SPRINT_05_PROMPT.md`

**Objective:** Hotel reservations with divergence detection and transport logistics.

**Execute:**
```
1. Create Hotels CRUD
2. Implement automatic check-in/out calculation
3. Build divergence detection (early/late stays)
4. Create divergence approval workflow
5. Build Drivers management (global)
6. Create Event Cars with auto-numbering
7. Implement passenger assignment by flight
8. Build flight grouping view
```

**Deliverables:**
- [ ] Hotels list and form
- [ ] Divergence detection and badges
- [ ] Approval dialog for divergences
- [ ] Drivers table (global)
- [ ] Event cars with capacity
- [ ] Passenger assignment
- [ ] Flight-based grouping view

**Validation Checkpoint:**
```bash
# Test hotels:
1. Create hotel reservation
2. Dates differ from calculated → divergence detected
3. Approve divergence
4. Filter by divergence status

# Test transport:
1. Create driver (global)
2. Add car to event
3. Assign passengers to car
4. View passengers grouped by flight
5. Check capacity warnings
```

**Dependencies:** Sprint 03 (needs flights for transport grouping)

---

### SPRINT 06: Stats + Music + Tasks


**File:** `docs/prompts/SPRINT_06_PROMPT.md`

**Objective:** Fighter statistics, entrance music, and operational task management.

**Execute:**
```
1. Create Fighter Stats CRUD
2. Implement weight class system
3. Build fight record tracking
4. Create Entrance Music management
5. Implement walkout order
6. Build Task system with templates
7. Create checklist functionality
8. Implement task status workflow
```

**Deliverables:**
- [ ] Fighter stats form and card
- [ ] Weight class badges
- [ ] Record calculation (W-L-D)
- [ ] Music table with status
- [ ] Walkout order management
- [ ] Task templates
- [ ] Task checklist with progress
- [ ] Task filters and assignment

**Validation Checkpoint:**
```bash
# Test stats:
1. Add fighter stats (height, reach, record)
2. View weight class badge
3. See calculated record

# Test music:
1. Add entrance music
2. Set walkout order
3. Update music status

# Test tasks:
1. Create task with checklist
2. Complete checklist items
3. Task auto-completes when all checked
4. Filter overdue tasks
```

**Dependencies:** Sprint 02

---

### SPRINT 07: Pre-event + Batches


**File:** `docs/prompts/SPRINT_07_PROMPT.md`

**Objective:** Pre-event requirements (blood tests, medical, documents) and batch scheduling.

**Execute:**
```
1. Create Blood Test tracking
2. Build Medical Exam management
3. Implement Required Documents checklist
4. Create clearance status calculation
5. Build Batch system for processes
6. Implement batch participant assignment
7. Create batch timeline view
8. Build check-in/completion workflow
```

**Deliverables:**
- [ ] Blood test table and form
- [ ] Medical exam management
- [ ] Document checklist
- [ ] Clearance status cards
- [ ] Pre-event summary view
- [ ] Batch types (weigh-in, medical, credentials)
- [ ] Batch participant management
- [ ] Batch timeline

**Validation Checkpoint:**
```bash
# Test pre-event:
1. Add blood test for fighter
2. Mark result (clear/failed)
3. Add medical exam
4. Check clearance status updates
5. View pre-event summary

# Test batches:
1. Create weigh-in batch
2. Add participants
3. Check-in participants
4. Mark complete
5. View timeline
```

**Dependencies:** Sprint 02

---

### SPRINT 08: Dashboard + War Room + Deploy


**File:** `docs/prompts/SPRINT_08_PROMPT.md`

**Objective:** Event dashboard, real-time War Room, and production deployment.

**Execute:**
```
1. Build Dashboard with metrics grid
2. Create module status cards
3. Implement upcoming deadlines
4. Build quick actions panel
5. Setup Supabase Realtime
6. Create War Room layout
7. Build live status board
8. Implement activity feed
9. Create alerts panel
10. Build team presence
11. Add countdown timer
12. Configure Vercel deployment
13. Setup environment variables
14. Final testing and launch
```

**Deliverables:**
- [ ] Dashboard page with all metrics
- [ ] Status cards for each module
- [ ] Deadline tracking
- [ ] War Room with dark theme
- [ ] Real-time updates via WebSocket
- [ ] Activity feed
- [ ] Alert system
- [ ] Team online presence
- [ ] Event countdown
- [ ] Vercel deployment
- [ ] Production environment

**Validation Checkpoint:**
```bash
# Test dashboard:
1. View all metrics
2. Check module status cards
3. Verify deadlines display
4. Use quick actions

# Test war room:
1. Open war room
2. See real-time connection status
3. Make change in another tab
4. See activity feed update
5. Check alerts
6. View countdown timer

# Test deployment:
1. Push to GitHub
2. Vercel auto-deploys
3. Test production URL
4. Verify all features work
```

**Dependencies:** All previous sprints

---

## 🔧 Troubleshooting

If you encounter issues during any sprint, refer to:

**File:** `docs/04_ANTIGRAVITY_PROMPTS.md`

Common issues covered:
- Supabase connection errors
- RLS policy issues
- Auth problems
- TypeScript errors
- Build failures
- Realtime subscription issues

---

## 📊 Progress Tracking

Use this checklist to track your progress:

```markdown
## Sprint Progress

### Foundation
- [x] SPRINT 00: Project Setup

### Core Modules
- [x] SPRINT 01: Auth + People
- [x] SPRINT 02: Events + Enrolled
- [x] SPRINT 03: Flights
- [x] SPRINT 04: Visas
- [x] SPRINT 05: Hotels + Transport
### core Modules
- [x] SPRINT 06: Stats + Music + Tasks
- [x] SPRINT 07: Pre-event + Batches

### Final
- [x] SPRINT 08: Dashboard + War Room + Deploy

## Quality Checklist
- [x] All CRUD operations working
- [x] Authentication secure
- [x] RLS policies active
- [x] Forms validated
- [x] Error handling in place
- [x] Mobile responsive
- [x] Performance acceptable
- [x] Production deployed
```

---

## ⏱️ Estimated Timeline

| Sprint | Duration | Cumulative |
|--------|----------|------------|
| 00 | 1 day | 1 day |
| 01 | 2 days | 3 days |
| 02 | 2 days | 5 days |
| 03 | 2 days | 7 days |
| 04 | 1-2 days | 8-9 days |
| 05 | 3-4 days | 11-13 days |
| 06 | 2-3 days | 13-16 days |
| 07 | 2-3 days | 15-19 days |
| 08 | 3-4 days | 18-23 days |

**Total estimated time: 3-4 weeks**

---

## 🎯 Success Criteria

The project is complete when:

1. **All sprints executed** - Each sprint deliverable checked off
2. **Authentication working** - Users can login/logout securely
3. **All CRUD operations** - Create, read, update, delete for all modules
4. **Real-time working** - War Room shows live updates
5. **Production deployed** - App accessible via Vercel URL
6. **No critical bugs** - Core functionality stable

---

## 📁 Final Project Structure

```
mma-event-management/
├── docs/
│   ├── 01_PROJECT_DOCUMENTATION.md
│   ├── 02_SECURITY_CHECKLIST.md
│   ├── 03_EXECUTION_PLAN.md
│   ├── 04_ANTIGRAVITY_PROMPTS.md
│   └── prompts/
│       ├── SPRINT_00_PROMPT.md
│       ├── SPRINT_01_PROMPT.md
│       ├── SPRINT_02_PROMPT.md
│       ├── SPRINT_03_PROMPT.md
│       ├── SPRINT_04_PROMPT.md
│       ├── SPRINT_05_PROMPT.md
│       ├── SPRINT_06_PROMPT.md
│       ├── SPRINT_07_PROMPT.md
│       └── SPRINT_08_PROMPT.md
├── src/
│   ├── app/
│   ├── components/
│   ├── lib/
│   ├── hooks/
│   ├── types/
│   └── config/
├── public/
├── 00_DATABASE_FOUNDATION.sql
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
├── .env.example
└── README.md
```

---

## 🚨 Important Notes

1. **Execute sprints in order** - Dependencies must be respected
2. **Validate each sprint** - Don't proceed until checkpoint passes
3. **Commit after each sprint** - Keep git history clean
4. **Test thoroughly** - Each feature before moving on
5. **Reference documentation** - When stuck, check the docs
6. **Use Antigravity prompts** - For troubleshooting specific issues

---

## 🏁 Start Execution

Begin with **SPRINT_00_PROMPT.md** and work through each sprint sequentially.

**Command to start:**
```bash
# Read Sprint 00
cat docs/prompts/SPRINT_00_PROMPT.md

# Execute the instructions
# Validate the checkpoint
# Move to Sprint 01
```

Good luck building the MMA Event Management System! 🥊
