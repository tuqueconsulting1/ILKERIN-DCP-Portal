# Updates - Milestone Tracker

Feature requests from this file, reordered **lightest → heaviest** by
implementation complexity. Ordering is grounded in the current schema/code,
not just gut feel - each item notes what already exists to build on and
what's genuinely new. Complexity tiers: 🟢 Light · 🟡 Medium · 🟠 Heavy · 🔴 Heaviest.

- [x] **0. Real Stage 2 checklist (real CBK document requirements)** 🟡 Medium - **built this session**
      Replaces the 6 placeholder Stage 2 items (`0003`, explicitly marked as
      a stand-in) with the real, 43-item CBK-mandated checklist supplied as
      an Excel workbook. `category` = the workbook's tab name (3 tabs);
      `subcategory` (first tab only) verified against the file's **raw XML**,
      not guessed - column B of 3 specific rows carries a literal red
      (`FFFF0000`) cell fill, which turned out to be exactly the three
      existing section-header rows ("DCP Application Forms" / "Supporting
      Documents" / "Statutory Declaration"); no red cells exist in the other
      two tabs. Per explicit scope decision, only the sheet's Document
      Name/Form/Category columns were imported (Doc Code, Applies To,
      Required Format, Multiplicity, and Mandatory/Conditional are not
      modeled) - deliberately **not** the "per-person" scope (no
      director/shareholder/officer auto-generation; `shareholders_directors`
      stays unused, confirmed nothing partial exists anywhere in `src/`).
      `document-checklist.tsx` now groups items by category/subcategory as
      collapsible `<details>` sections instead of one flat table (falls back
      to the old flat view when category is null, so Stage 1/3's untouched
      placeholder checklists render exactly as before); drag-to-reorder now
      only allows drops within the same section. New migration `0018`,
      applied to Supabase and confirmed live - 43 active Stage 2 rows with
      the correct category/subcategory/doc_type/form values.
      Type-check and production build both pass; the real UI itself is
      still unverified in a browser - no case-manager credentials on hand
      this session.

- [x] **1. CBK correspondence attachments** 🟡 Medium (revised up from 🟢) - **built this session**
      Correction to the original estimate: there was no existing "Zoho
      upload wiring" to reuse - every prior Zoho file reference came from
      matching files clients dropped externally into their own WorkDrive
      folder, or from folder creation, never from the app uploading file
      *bytes* anywhere. Had to add that capability from scratch:
      `uploadFileToWorkdrive()` in `lib/zoho.ts`, hitting WorkDrive's
      multipart `/upload` endpoint - verified against the **live** Zoho API
      with a real test upload (and cleaned up after) before wiring it in,
      since the request shape (query-param destination + a single
      multipart `content` field, distinct from every other JSON-bodied call
      in that file) isn't well documented.
      Six new columns on `cbk_correspondence`
      (`0017_cbk_correspondence_attachments.sql`): separate
      `query_zoho_file_*` / `response_zoho_file_*` triples, since a query
      and its response can each carry their own document. Files upload
      into the client's existing root WorkDrive folder - no new subfolder
      was added, to keep this scoped. `cbk-log.tsx`'s "Mark responded" flow
      changed from a `window.prompt()` to a small inline form, since a
      browser prompt can't collect a file.
      **Follow-up hardening (same session, after a user request):** a
      hard 8MB cap (`lib/attachments.ts`, shared by the client-side
      pre-check and the actual server-side enforcement in `actions/cbk.ts`)
      - also had to raise Next's `serverActions.bodySizeLimit` from its 1MB
      default in `next.config.ts`, or every attachment over 1MB would have
      been rejected by the framework before ever reaching that check. And a
      real "view in browser" gap: the stored Zoho `Permalink` only opens for
      someone who is themselves a member of this Zoho org, which case
      managers aren't (they authenticate via Supabase, not Zoho) - verified
      this live before assuming it. Fixed by adding
      `downloadWorkdriveFile()` plus a new `/api/attachments/[fileId]`
      route that proxies the file through the app's own Zoho service
      account after checking the viewer has a valid app session, so
      viewing works for every signed-in staff member regardless of their
      own Zoho access.
      Type-check and production build both pass; **not yet verified against
      the live app** - `0017` hasn't been applied to Supabase yet, and
      there were no credentials on hand to test an actual upload/view
      through the UI this session.

- [ ] **2. Collaboration (equal view + invite)** 🟢 Light
      RLS already grants every staff member (`is_staff()`) full read/write
      on every client - there is no per-case restriction today, so "equal
      view access" is already true. What's missing is just the *social*
      layer: a way for the creator to explicitly add/notify other case
      managers on a case (e.g. a `client_collaborators` table purely for
      display/notification - not access control, since access is already
      global). Confirm with the team whether they actually want access
      *narrowed* to invited collaborators only - that would move this to
      🟠 Heavy since it requires rewriting the `clients`/`applications` RLS
      policies.

- [ ] **3. Action fingerprint (who + when)** 🟡 Medium
      An `audit_log` table already exists (`entity_type`, `entity_id`,
      `action`, `actor_id`, `diff jsonb`) but nothing in the app writes to
      it today - it's dead schema. Needs: wiring inserts into the existing
      mutating server actions (`actions/cases.ts`, `clients.ts`,
      `documents.ts`, `tasks.ts`, etc.), then a small UI label ("verified
      by X at HH:MM") on documents/tasks/comments pulling the latest entry.

- [ ] **4. Comments & reviews** 🟡 Medium
      New feature, but simple shape: a `case_comments` table
      (application-scoped, author, body, timestamp) and a thread UI on the
      case page. No permission dimension needed beyond today's staff-wide
      access (see #2), so this is mostly new-table-plus-UI, not a security
      change.

- [ ] **5. Manual stage progression override** 🟡 Medium
      Today stage advance is **auto-only** - it fires when every required
      checklist item is verified (`actions/cases.ts`); there is no manual
      "Next" path in the code at all. Needs a new server action that
      force-advances regardless of completion, plus a visual "N items
      still outstanding" backlog indicator carried onto the new stage.
      Flagged 🟡 rather than 🟢 because stage-advance/completion-% is the
      most bug-prone area in the codebase so far (three fix migrations:
      `0008`, `0009`, `0010`) - treat any change here as needing the same
      care as those did.

- [x] **5b. Checklist drag-to-reorder** 🟡 Medium - **built this session**
      Drag handle (⠿) added to each row in `document-checklist.tsx`; order
      persists to a new `checklist_templates.sort_order` column
      (`0014_checklist_template_sort_order.sql`) via
      `actions/checklist-templates.ts`. Reordering edits the shared
      template row, so the new order applies to **every application at
      that stage**, not just the one you dragged in - intentional, and
      consistent with `checklist_templates` writes already being
      compliance/admin-only via RLS (a non-admin's drag will roll back
      with the RLS error surfaced inline, same pattern as the existing
      verify-checkbox rollback). **Not yet verified against the live app**:
      `0014` hasn't been applied to the Supabase project yet, and there
      were no case-manager credentials on hand this session to drag-test
      it in a real browser - type-check and production build both pass
      clean. Apply the migration, then confirm a drag in the UI before
      relying on this.

- [ ] **6. Amendment option (infinite amendments + "power number")** 🟠 Heavy
      New `document_amendments` table (notes + timestamp per amendment),
      a count badge, and a notes-history dropdown. The hard part isn't the
      table - it's deciding whether logging an amendment resets a
      document's `status` from `verified` back to something needing
      re-verification, since that directly re-triggers the
      completion-percentage/stage-advance interaction already fixed three
      times (see #5). Needs a deliberate decision on that interaction
      before writing code, not just a UI add-on.

- [ ] **7. DCP-type checklist (DCP1 / DCP2 / DCP3)** 🟠 Heavy
      Note: today's "Stage 1/2/3" (`dcp_stage`) is the *within-license*
      journey (Name Approval → Licence Application → Data Submission), a
      different axis from what this item asks for - distinct DCP license
      *types*, each presumably needing its own checklist set. Requires a
      new `dcp_type` dimension threaded through `checklist_templates`,
      `applications`, the board view, the progress page, and Zoho folder
      templating. Cross-cutting, touches most of the domain model.

- [ ] **8. Flexible checklist editable by admin** 🔴 Heaviest (non-AI)
      `checklist_templates` is already versioned (`version`, `is_active`)
      but there is **no admin UI at all** - templates are only ever seeded
      via SQL migration today. Needs a full admin CRUD screen, a
      role-gated route, and - the hard part - versioning semantics that
      don't silently break completion-% for applications already in
      progress when a template changes. Build this **after #7**: designing
      the admin UI without the `dcp_type` dimension in mind means redoing
      it once #7 lands.

- [~] **7b. Login with Zoho** 🟠 Heavy - **code scaffolded this session,
      blocked on external setup**
      Requested separately, not from the original list. Zoho does expose a
      real OIDC discovery document and `id_token`
      (`https://accounts.zoho.com/.well-known/openid-configuration`), so
      this uses Supabase's **custom OIDC provider** support rather than a
      hand-rolled OAuth flow. Domain restricted to `@iacentre.co.ke` per
      your answer - anyone else's Zoho sign-in is rejected before a
      profile is created (`0015_restrict_zoho_signin_domain.sql`, checked
      via `raw_app_meta_data->>'provider'` so it doesn't affect
      dashboard-created email accounts like `admin@iacentre.co.ke`).
      Code done: `src/app/auth/callback/route.ts` (exchanges the OAuth
      code for a session), `/login`'s new "Sign in with Zoho" button, and
      `/auth/callback` added to the middleware's public paths. **Cannot be
      finished from code alone** - two external steps only someone with
      the actual accounts can do: (1) register a new Zoho OAuth client
      for user sign-in (`openid email profile` scopes) in the Zoho API
      Console - the existing `ZOHO_CLIENT_ID`/`SECRET` in `.env.local` are
      a *different*, server-to-server WorkDrive client and can't be reused
      for this; (2) add that client as a custom OIDC provider named
      exactly `custom:zoho` in the Supabase dashboard (Authentication →
      Providers), pointing at Zoho's discovery URL. Untestable end-to-end
      until both are done.

- [ ] **9. Claude document read/rename on arrival** 🔴 Heaviest
      Biggest lift on the list. There is currently **zero automatic
      matching** - case managers manually assign every pending upload to a
      checklist item (`actions/uploads.ts`), no fuzzy/filename heuristic
      exists to build on. Full scope: fetch file content from Zoho
      WorkDrive, extract text (PDF/image OCR as needed), call Claude to
      classify against the checklist list, rename via the Zoho WorkDrive
      API, auto-match or fall back to manual on low confidence - plus a
      privacy/security pass, since client KYC documents would be sent to
      an external API.

## On hold

- [ ] **FRC registration** - internal note only; explicitly **execute only
      upon approval**. Trivial to add (a text field) once someone signs
      off - not sized/scheduled until then.
