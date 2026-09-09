# Ilkerin DCP Licensing Workflow Automation - Development Plan

Status: Draft for review
Source documents: `Ilkerin DCP automation blueprint.pdf` (proposal), `Features.md` (distilled decisions)

## 1. Business context

Ilkerin Consulting helps client companies obtain a Digital Credit Provider (DCP) licence
from the Central Bank of Kenya (CBK). The licensing journey has three formal stages:

1. **Stage 1 - Approval of Name**: name reservation & KIPI letter.
2. **Stage 2 - Application for Licence**: the most document-intensive stage.
3. **Stage 3 - Data Submission & Licensing**: API testing, fees, licence issuance.

Each stage has a fixed document checklist, and each checklist item is tagged with an
owner: **client**, **Ilkerin**, or **joint**.

Today this is tracked manually across spreadsheets, email threads and shared drives.
The pain points to remove: scattered tracking, manual chasing of clients/staff, no
visibility into document expiry (e.g. CRB clearance reports valid 3 months), and no
aggregate view for management without compiling manual status reports.

## 2. Reconciling the proposal with the distilled decisions

The original proposal (PDF) described a full custom client portal with e-signature.
`Features.md` later simplified the client-facing side considerably, and that
simplification is treated as the standing decision for this build:

- **Clients get no login, portal, or new account.** They drop Stage 1/2/3 documents
  into a **Zoho WorkDrive** folder Ilkerin already provisions per client.
- **Case managers get a custom internal app** that integrates with Zoho WorkDrive:
  whenever a client drops a file, the app reads the folder, updates the checklist,
  logs the document, and advances stage status.
- Automated CRB/document expiry tracking, a centralized case dashboard, and automated
  reminders (internal to case managers, and email triggers to clients) are the key
  internal features to automate.

**Clarified during planning (this session's decisions):**

| Question | Decision |
|---|---|
| Webapp vs. desktop+mobile (Features.md literally called for lightweight desktop + mobile apps, no domain, for data protection) | **Internal webapp**, built as an installable PWA. Access is gated by login (see Auth below) rather than network isolation, since hosting is Vercel (public URL by default). Modular enough to wrap in Tauri/Electron later if native desktop/mobile is revisited. |
| Zoho WorkDrive API access | Case manager confirmed access is available or obtainable soon. Plan assumes real API/webhook integration from Phase 2 rather than a long-lived mock. |
| Hosting | **Vercel** (frontend + serverless/edge functions) + **Supabase** (Postgres database, Auth, Realtime, Storage, Edge Functions). |
| Tech stack | **Next.js/TypeScript** (React) on Vercel - the natural pairing for Vercel hosting - with **Supabase** as the backend-as-a-service: Postgres for the data model, Supabase Auth for case-manager login, Supabase Realtime for live dashboard updates, Supabase Edge Functions for scheduled jobs (reminders, expiry checks) and Zoho webhook receivers. |
| Case-manager auth | **Email + password**, via Supabase Auth (built-in - no custom auth code needed). |
| Push notifications | Confirmed in scope as a secondary channel alongside email - see section 6. |
| E-signature | **Dropped.** Confirmed out of scope - no signed-document flow needed. |

## 3. Proposed architecture

```
 Client (no login)
      │  drags & drops files
      ▼
 Zoho WorkDrive folder (per client, templated by Stage 1/2/3 checklist)
      │  webhook / polling on file events
      ▼
 ┌───────────────────────────────────────────────────────────┐
 │        Case Management & Workflow Engine (Supabase)        │
 │   Postgres + Auth + Realtime + Storage + Edge Functions      │
 │                                                              │
 │  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐  │
 │  │ Document     │ │ Task &       │ │ CBK Submission      │  │
 │  │ ingestion &  │ │ Reminder     │ │ Tracker              │  │
 │  │ checklist    │ │ Engine       │ │ (queries, fees)      │  │
 │  │ matching     │ │ (scheduled   │ │                      │  │
 │  │ (Edge Fn)    │ │  Edge Fn)    │ │                      │  │
 │  └─────────────┘ └──────────────┘ └────────────────────┘  │
 │  ┌─────────────┐ ┌──────────────────────────────────────┐  │
 │  │ Notification │ │ Reporting / Case Dashboard            │  │
 │  │ dispatcher   │ │ (aggregate live view, via Realtime)   │  │
 │  │ (email/push) │ │                                        │  │
 │  └─────────────┘ └──────────────────────────────────────┘  │
 └───────────────────────────────────────────────────────────┘
      │
      ▼
 Internal webapp (Next.js on Vercel, installable PWA)
 case managers & compliance team - email + password login
 (case list, case detail, checklist, tasks, CBK log, reports)
```

Client interaction stays entirely inside Zoho WorkDrive. Everything else - checklist
logic, expiry tracking, reminders, CBK correspondence, fee tracking, and the
aggregate dashboard - lives in the internal webapp and its Supabase backend.

## 4. Core data model

| Entity | Key fields |
|---|---|
| **Client** | company profile, engagement details, assigned case manager, Zoho WorkDrive folder ID |
| **Application** | client ref, current stage (1/2/3), sub-status, completion % |
| **Shareholder / Director** | linked client, KYC & vetting document status |
| **Document** | type, checklist item ref, owner tag (client/Ilkerin/joint), status (missing/received/verified/expired), expiry date, Zoho WorkDrive file ref |
| **Checklist template** | stage, item name, owner tag, expiry rule (e.g. "valid 3 months") - versioned, compliance-team editable |
| **Task** | linked item (document/CBK query/etc.), owner (case manager), due date, status |
| **CBK correspondence** | application ref, query text, received date, response deadline, response status |
| **Fee payment** | type, amount, status, receipt ref |
| **Notification log** | recipient, channel (email/push/in-app), template, sent status, timestamp |
| **User (case manager / compliance / admin)** | role, auth identity |
| **Audit log** | entity, action, actor, timestamp - append-only, covers every document/status/task/CBK change |

## 5. Automation rules (event-driven)

- **Document uploaded to WorkDrive** → matched against checklist template → marks
  item "received" → queues for case-manager verification.
- **Document nearing expiry** (e.g. CRB report at day 75 of a 90-day validity) →
  flags for renewal, creates a task, notifies case manager before it can block
  Stage 2 submission.
- **CBK query received** → logged in CBK correspondence, creates a task, assigns
  owner, sets due date from CBK's response deadline.
- **Checklist item overdue** → reminder to case manager; automated email to client
  if the missing item is client-owned.
- **Stage complete** (all required checklist items verified) → advances application
  to next stage automatically, notifies case manager.
- **Licence issued** → marks case complete, archives documents, freezes further
  edits except audit log reads.

## 6. Non-functional requirements

- **Data protection**: no public client-facing surface - the webapp requires
  authenticated login for every route (case managers/compliance only). Since
  Vercel gives the app a public URL, access control is enforced by auth, not
  network isolation; an optional extra layer (Vercel deployment protection /
  IP allowlist) can be added if that's not sufficient. Documents stay in Zoho
  WorkDrive (not re-hosted) - the app stores references/metadata, not copies,
  unless a local cache is explicitly required.
- **Auth**: case managers/compliance authenticate via **Supabase Auth,
  email + password**. Row-level security (RLS) policies in Postgres enforce
  role-based access (case manager vs. compliance vs. admin) at the database
  layer, not just in the frontend.
- **Notifications**: **email** (primary, guaranteed-delivery channel - internal
  alerts to case managers, automated emails to clients for missing/overdue
  documents) plus **web push** (secondary, opt-in channel) via a service
  worker + a push provider (e.g. Web Push/VAPID or a managed provider like
  OneSignal/FCM), triggered from the same Supabase Edge Functions that fire
  emails. The webapp ships as an installable PWA so push works reliably on
  mobile, including iOS (which only supports web push for home-screen-installed
  PWAs, iOS 16.4+).
- **Audit trail**: every document, status change, task, and CBK query event is
  append-only logged with actor and timestamp.
- **Roles**: Head of IT (architecture/tool selection), Case manager (daily use,
  verification), Compliance team (owns/edits checklist logic), Client (WorkDrive
  upload only, no system access).

## 7. Open questions / assumptions to confirm before or during Phase 1

1. Exact CBK document checklist per stage (owner tags, expiry rules) needs to be
   supplied by the compliance team as the first real data import - this plan
   treats it as an input, not something to invent.
2. Whether Vercel's built-in deployment protection (password/SSO on preview or
   production URLs) should be layered on top of app-level login for extra
   data-protection assurance - a cheap add, worth a yes/no from IT.

## 8. Risks

- **Zoho WorkDrive API/webhook limitations** (rate limits, webhook reliability) -
  mitigate with a polling fallback alongside webhooks.
- **Checklist logic changes** owned by compliance team - must be data-driven
  (versioned templates), not hardcoded, or every regulatory tweak needs a
  developer.
- **Single point of failure on Zoho** - if WorkDrive is down, ingestion pauses;
  document that this is an accepted dependency risk given the "no new client
  logins" requirement.

See `MILESTONES.md` for the phased implementation checklist.
