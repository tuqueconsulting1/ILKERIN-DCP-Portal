# Test Guide — Ilkerin DCP Portal

What to test, how to test it, and its current status. Status reflects what has
actually been verified and how — not assumed to work. Three verification
methods appear below:

- **DB script** — a script mirroring the real server action's logic, run
  directly against the live Supabase project, asserting the resulting data.
  Confirms the business logic/data layer is correct.
- **Browser** — a real headless-browser login + click-through against the
  running app, with a screenshot as evidence.
- **Code review only** — read carefully, builds and lints clean, but not
  exercised live. Weakest form of verification — treat as "should work,"
  not "confirmed working."

Re-run anything marked **Code review only** yourself before trusting it in
front of a client.

## 1. Authentication & access

| Test | Steps | Expected | Status |
|---|---|---|---|
| Login works | Go to `/login`, enter valid case-manager credentials, submit | Redirects to `/` (dashboard) | ✅ Pass — DB script + Browser (real login completed in a live browser session) |
| Unauthenticated redirect | Visit `/` without a session | Redirects to `/login` | ✅ Pass — Browser (curl got HTTP 307 to `/login`) |
| Input text visible | Type in email/password fields | Dark text clearly visible on white background | ✅ Pass — Browser screenshot, computed style confirmed dark text on white |
| Sign out | Click "Sign out" | Returns to `/login`, session cleared | ⚠️ Code review only |

## 2. Add client

| Test | Steps | Expected | Status |
|---|---|---|---|
| Add client, existing folder | Click "+ Add client", enter company name + stage, paste a WorkDrive folder link | Client, application, and full checklist for that stage are created | ✅ Pass — DB script |
| Add client, new folder | Same, but leave the WorkDrive field blank | A subfolder is auto-created under the "Clients" Team Folder in Zoho, an upload-permission share link is generated, both saved on the client | ✅ Pass — DB script + real Zoho API calls (folder + link actually created live) |
| Modal opens and renders correctly | Click "+ Add client" | Modal centered over a full-page dark backdrop, all fields visible | ✅ Pass — Browser screenshot |
| Add client, Zoho failure handling | Simulate a Zoho API failure during auto-create | Client is still created; a warning is shown instead of blocking | ⚠️ Code review only (not simulated) |
| Required field validation | Submit with empty company name | Error shown, nothing created | ⚠️ Code review only |

## 3. Case whiteboard (dashboard)

| Test | Steps | Expected | Status |
|---|---|---|---|
| Board view renders | Load `/` | Kanban columns per stage + Complete, cards show progress/badges | ✅ Pass — Browser screenshot |
| List view renders | Toggle to List | Table view with same data | ⚠️ Code review only (board view confirmed; list view toggle not separately screenshotted) |
| Notification badges | Create overdue task / expiring document / pending CBK query | Corresponding badge appears on the card/row | ✅ Pass (data) — DB script confirms `application_board` view counts are correct; a live badge wasn't showing on the test data used for the screenshot |
| Brand colors applied | Any page | Dark charcoal `#212629` / orange `#f85814` used for header, primary buttons, links, progress bars | ✅ Pass — Browser screenshot |

## 4. Case detail page

| Test | Steps | Expected | Status |
|---|---|---|---|
| Case page renders | Click into a client from the board | Company name, stage, checklist, tasks, CBK log, danger zone all render | ✅ Pass — Browser screenshot |
| Mark received / Reject | Click each action on a checklist item | Status updates, badge color changes | ✅ Pass — DB script |
| Verify via checkbox, instant response | Check the "Verified" checkbox on a checklist item | Checkbox and status badge update immediately (optimistic UI, no wait for the network); write persists; unchecking reverts to "received" | ✅ Pass — Browser: checkbox showed checked and badge showed "Verified" in a screenshot taken ~119ms after the click (well under a real network round-trip), confirmed still correct after settling, and confirmed the actual DB `completion_pct` recalculated correctly (0% → 50% for 1 of 2 items) |
| Auto stage-advance | Verify every item in the current stage | Stage advances (1→2→3), next stage's checklist is seeded, `completion_pct` resets to reflect the new stage | ✅ Pass — DB script, full 1→2→3 progression tested |
| Stage 3 does not auto-complete | Verify all Stage 3 items | Application stays `active` at 100%, does not flip to `complete` on its own | ✅ Pass — DB script |
| Explicit case completion | Click "Licence received — Complete case" on a Stage 3 case | `status` becomes `complete`; checklist, uploads, tasks, CBK log all lock from further edits | ✅ Pass — DB script (action logic mirrored); locked "Complete" state confirmed visually on a real completed case |
| Back a stage | Click "← Back to Stage X" | Stage reverts; that stage's checklist resets to `missing`; `completion_pct` recalculates to 0% for it | ✅ Pass — DB script, including the two bugs found and fixed (duplicate documents on re-advance; stale completion_pct) |
| Re-advance after going back | After going back, re-verify and re-advance | No duplicate documents created; `completion_pct` correctly reflects the new stage, not stuck at the old 100% | ✅ Pass — DB script (regression test for the two bugs above) |
| Rename client | Click "Edit" next to the company name, change it, save | Name updates everywhere it's shown | ✅ Pass — DB script |
| Delete client, dialog renders & guard blocks wrong input | Open "Delete client", leave the field empty/wrong | Modal centered correctly; Delete button visibly disabled until the exact phrase is typed | ✅ Pass — Browser screenshot (dialog + disabled state confirmed; typing the exact match not attempted, to avoid deleting real data) |
| Delete client, cascade | Type `delete {exact company name}`, confirm | Client, application, documents, tasks, and CBK correspondence are all removed | ✅ Pass — DB script (cascade confirmed empty on all four tables after delete) |
| Add/complete task | Add a task with a due date, check it off | Task appears, strikes through when done | ✅ Pass — DB script |
| Task checkbox is instant | Check a task off | Strikes through immediately, same optimistic pattern as the checklist checkbox | ⚠️ Code review only (same code pattern as the checklist checkbox above, which was browser-verified, but not separately re-tested here) |
| Log CBK query | Submit a query with a response deadline | Entry appears; a linked task is auto-created with that deadline as its due date | ✅ Pass — DB script |
| Mark CBK responded | Click "Mark responded", enter a response | Entry shows responded + response text; the linked task auto-closes | ✅ Pass — DB script |

## 5. WorkDrive integration

| Test | Steps | Expected | Status |
|---|---|---|---|
| Poll detects a real upload | Upload a file into a client's WorkDrive folder, call the polling route | A `pending_uploads` row is created with correct file name/URL/timestamp | ✅ Pass — real file uploaded via Zoho API, real HTTP call to `/api/cron/poll-workdrive`, row confirmed |
| Poll is idempotent | Call the polling route again without new uploads | No duplicate `pending_uploads` row | ✅ Pass — confirmed `queued: 0` on the repeat call |
| Match upload to checklist item | Pick a checklist item for a pending upload, click "Match" | Document status flips to `received`, file metadata attached, pending upload marked `matched` | ✅ Pass — DB script |
| Ignore upload | Click "Ignore" on a pending upload | Marked `ignored`, disappears from the queue | ⚠️ Code review only |
| Cron auth | Call `/api/cron/poll-workdrive` without the correct bearer token | 401 Unauthorized | ⚠️ Code review only (not re-tested since the `/api/*` middleware-exclusion fix) |
| Cron schedule valid for plan | Deployed cron runs on Vercel Hobby's daily limit | Deploys successfully, runs once daily | ✅ Pass — user confirmed a successful production deploy after switching to a daily schedule |

## 6. Visualize progress

| Test | Steps | Expected | Status |
|---|---|---|---|
| Ring percentages correct | Client partway through Stage 2, Stage 1 complete, Stage 3 not started | Stage 1 ring 100%, Stage 2 ring matches verified/total, Stage 3 ring 0% and marked "Not started" | ✅ Pass — DB script exactly matched hand-computed expected values |
| Remaining checklist list | Same scenario | Lists every non-verified document that already exists, with stage + status | ✅ Pass — DB script (5 remaining items, matched) |
| Remaining tasks list | Client with one open task | Task appears with its due date | ✅ Pass — DB script |
| Rings render correctly on screen | Open the progress page in a browser | Three concentric rings, correct fill, centered overall % | ✅ Pass — Browser screenshot |
| "Visualize" links from the board/case page | Click "Visualize progress" / "Visualize →" | Navigates to that client's progress page | ✅ Pass — Browser (navigated successfully) |
| Overall % consistent with case status | View progress for a **completed** case that was started partway through (e.g. at Stage 3, skipping 1/2) | Overall % shows 100%, matching the "Complete" status on the case page — not diluted by unreached stages' template capacity | ✅ Pass, after a fix — **bug found via browser testing**: originally showed 27% overall for a completed Stage-3-only case, contradicting the case page's "100% complete." Fixed by treating any `complete` case as 100% overall regardless of which stages it actually tracked |

## 7. Guided tour ("Guide me")

| Test | Steps | Expected | Status |
|---|---|---|---|
| Dashboard tour starts and steps through | Click "Guide me" on the dashboard | Spotlight + tooltip walks through Add client → View toggle → Stage column → Complete column → Sign out | ✅ Pass — Browser screenshot, steps 1 and 2 confirmed correctly spotlighted and positioned |
| Case page tour | Click "Guide me through this case" | Walks through WorkDrive link → Visualize progress → Checklist → Tasks → CBK log | ✅ Pass — Browser screenshot, step 1 confirmed |
| Spotlight correctly surrounds the target element | Any tour step | The highlighted cutout exactly matches the target element's real screen position | ✅ Pass, after a fix — **real bug found and fixed**: the spotlight was rendering 70+ px away from its target. Root cause: the page-level `.animate-fade-in` wrapper's `translateY` keyframe made that ancestor a CSS containing block for `position: fixed` descendants (a genuine, easy-to-hit CSS gotcha — any ancestor with an active/filled transform breaks descendant `fixed` positioning). This also silently affected the Add Client and Delete Client modals' true screen position. Fixed by removing the `translateY` from the fade-in keyframe (now a pure opacity fade); re-verified all three (tour spotlight, Add Client modal, Delete Client modal) render at their correct, viewport-accurate positions after the fix |
| Skip / Escape closes tour | Click "Skip tour" or press Escape mid-tour | Tour closes immediately | ✅ Pass — Browser ("Skip tour" click confirmed closing the tour both times it was used) |
| Tour survives missing target | Start the case-page tour with no CBK entries yet | Still highlights the (empty) CBK section correctly, since the target is the section wrapper, not its contents | ⚠️ Code review only |

## 8. Documentation & branding

| Test | Steps | Expected | Status |
|---|---|---|---|
| `/documentation` loads without login | Visit `/documentation` in a fresh/incognito session | Page loads (200), no redirect to `/login` | ✅ Pass — Browser + curl (confirmed 200, not the 307 redirect unauthenticated pages get) |
| Guide is reachable from every page | Click "📖 Guide" in the header | Navigates to `/documentation` | ✅ Pass — Browser screenshot (link renders and navigates) |
| Logo legible on the dark header | Load any page | The Ilkerin wordmark (white "ilkerin" + orange flame/"CONSULTING") is clearly visible against the dark header bar | ✅ Pass, after a fix — **real bug found via screenshot**: the logo's dark "ilkerin" ink is nearly the same color as the header background, rendering it essentially invisible (only the orange survived). Fixed by generating a white-ink "light" variant of the wordmark specifically for the dark header; re-verified visible and legible |

## 9. Stage subfolders & notifications

| Test | Steps | Expected | Status |
|---|---|---|---|
| Stage subfolders created (new client, auto-created folder) | Add a client without pasting a WorkDrive link | Root folder created, plus three subfolders ("Stage 1 - Approval of Name", "Stage 2 - Application for Licence", "Stage 3 - Data Submission & Licensing") inside it | ✅ Pass — real Zoho API calls, all three subfolder IDs returned and confirmed listable |
| Stage subfolders created (existing linked folder) | Add a client pasting an existing `/folder/{id}` WorkDrive link | Same three subfolders created inside that existing folder | ⚠️ Code review only (same code path as the auto-created case above, just a different folder-id source — not separately re-tested with a manually-pasted link) |
| One subfolder failing doesn't block the others | Simulate a failure creating one stage's subfolder | The other two still get created; client creation isn't blocked | ⚠️ Code review only (the try/catch-per-stage logic wasn't actually forced to fail) |
| Polling checks the stage subfolder, not just the root | Upload a file directly into a client's Stage 1 subfolder, run the polling route | File is queued as a pending upload even though the root folder is empty | ✅ Pass — real file uploaded via the Zoho API directly into a real Stage 1 subfolder; the actual `/api/cron/poll-workdrive` route queued it (`queued: 1`) |
| Document received → notification logged | Match a pending upload to a checklist item (or click "Mark received" manually) | A `notification_log` row is inserted: `"{item} received for {client}"` | ✅ Pass — DB script mirroring the exact action logic; row confirmed in the database with the correct item name and client name |
| Notifications grouped by client | Open the notification bell | Notifications are grouped under their client's name, not a flat list | ✅ Pass (query) — ran the exact query the bell component uses and confirmed it returns rows grouped correctly by `company_name`; the dropdown's own rendering wasn't screenshotted this round (the browser-automation tool's path handling broke again mid-session — see the tooling note below) |
| Notification bell renders / badge / dropdown open | Click the 🔔 in the header | Badge shows unread count; dropdown opens listing notifications | ⚠️ Not tested this session (tooling issue, not attempted against real UI — same component patterns as other dropdowns already browser-verified earlier in this project) |
| Deleting a client with notifications on record | Delete a client that has at least one notification logged | Client, application, documents, and the notification are all removed — no leftover row, no blocked delete | ✅ Pass, after a fix — **real bug found**: `notification_log`'s foreign key to `applications` was missing `ON DELETE CASCADE` since the very first schema migration, so the delete silently failed (client remained, notification remained orphaned) whenever a notification existed. Fixed by adding the cascade; re-ran the same delete and confirmed both rows gone |

## Summary

**Confirmed working via direct database/API testing:** authentication,
add-client (both folder paths), all checklist/stage-advance/completion logic
(including two real bugs found and fixed there), client rename/delete with
cascade, tasks, CBK correspondence + linked-task automation, and WorkDrive
upload detection + matching.

**Confirmed working via a real browser session this round** (login, board,
case detail, Add Client modal, Delete Client dialog, progress rings, both
guided tours): rendering and brand styling are correct, and this pass caught
and fixed two real bugs that DB-script testing alone could never have
found, since they were purely visual/DOM-positioning issues:

1. **Fixed-position overlays (tour spotlight, both modals) were mispositioned**
   due to a CSS containing-block side effect from the `.animate-fade-in`
   wrapper's `translateY` keyframe on ancestor elements.
2. **A completed case that started partway through (e.g. Stage 3 only) showed
   a misleading "27% overall"** on the progress page, contradicting its own
   "100% complete" status shown one click away.

**Confirmed working via a real, live Zoho + Supabase pipeline this round**
(stage subfolder creation, polling a real stage subfolder, matching, and
notification logging) — and it caught a **serious regression before it
reached production**: `notification_log`'s missing `ON DELETE CASCADE` would
have silently broken "Delete client" for almost every real client going
forward, the moment they had a single document marked received. Nothing in
code review or a build/lint pass would have surfaced this — only actually
running the delete after generating a real notification did.

**Tooling note (update):** the browser-automation skill's path handling,
which was working reliably earlier this project (leading-slash path +
`MSYS2_ARG_CONV_EXCL="*"`), broke again mid-session after what looked like
an extension auto-update changed its install path. Re-verify it's working
before relying on it in a future session rather than assuming the earlier
fix still holds.

**Still only code-reviewed, not exercised live:** sign-out, form validation
edge cases, the "Ignore upload" action, cron bearer-token rejection, and the
tour's behavior when a target section has no content yet.

**Tooling note for future browser testing in this repo:** the
`browser-automation` skill's `--script` flag fails on Windows with a path
"protocol" error unless (a) the script path is passed with a **leading `/`**
before the drive letter (e.g. `/C:/Users/...`, not `C:\Users\...`), because
the tool's own path-joining logic breaks otherwise, and (b) the shell command
is run with `MSYS2_ARG_CONV_EXCL="*"` set, because Git Bash otherwise mangles
that leading-slash argument before Node ever sees it. Both are required
together. Separately, simulating a login form via `--eval` by setting
`input.value` directly is unreliable — React's controlled-input re-renders
can silently reset a second field's value before it's read. Use Playwright's
`page.locator(...).fill(...)` inside a real `--script` file instead, which
worked reliably once the path issue above was solved.
