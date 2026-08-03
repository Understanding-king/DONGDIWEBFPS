# Test Evidence

## Test Environment

- Commit: `fcb9c78` baseline with uncommitted database-preparation changes
- Local URL: `http://127.0.0.1:5177/` during the cloud-client verification run
- Cloud project: Supabase `myarchive-dev`, Tokyo `ap-northeast-1`
- Tester: Codex browser regression
- Date: 2026-08-03 Asia/Shanghai

## Results

| ID | Type | Input | Expected | Actual | Pass | Fix | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DB-PREP-01 | static/build | `npm run verify` | Project checks and Vite build pass | 9 pages and 31 source files checked; Vite built successfully | yes | - | Terminal output from 2026-08-03 |
| DB-PREP-02 | local normal | Add a uniquely named note from the home page | Save confirmation appears and note is visible on `notes.html` | Confirmation appeared; exactly one matching note was visible | yes | - | Browser regression from 2026-08-03 |
| DB-PREP-03 | cleanup | Delete the temporary regression note through the local archive patch API | Test note is removed and original note count is restored | Test note removed; note count returned to 31 | yes | - | Local API response and browser reload |
| DB-PREP-04 | local read | Open `library.html` | Existing records load without console errors | 35 records rendered; no browser errors captured | yes | - | Browser DOM snapshot from 2026-08-03 |
| DB-CLOUD-01 | dependency | Run migration against a real Supabase project | Tables, indexes, triggers and RLS policies are created | Migration returned success; all three tables exist with RLS enabled and four policies each; `records` and `notes` each have one update trigger | yes | - | Supabase SQL Editor result, 2026-08-03 |
| DB-CLOUD-CLIENT-01 | static/build | Install Supabase client and run `npm run verify` | All project checks and the production build pass | 9 pages and 35 source files checked; Vite production build passed | yes | - | Terminal output from 2026-08-03 |
| DB-CLOUD-SHARED-01 | structure | Run the shared-space migration and inspect all cloud tables | RLS remains enabled, no table has `user_id`, and each table has one shared policy | `records`, `notes`, `categories`, and `archive_meta` each returned RLS `true`, `has_user_id=false`, and policy count 1 | yes | - | Supabase SQL Editor result, 2026-08-03 |
| DB-CLOUD-SHARED-02 | migration | Start the Web client against empty shared tables | The local archive uploads once and cloud reads return 35 records and 31 notes | Web toast reported 35/31; independent REST counts returned 35/31 and one migration-state row | yes | - | Browser regression and direct REST counts, 2026-08-03 |
| DB-CLOUD-SHARED-03 | write/delete | Save a uniquely named note through Web, confirm it in Supabase, then remove it | Cloud count changes 31 -> 32 -> 31 and the test row is fully removed | Exactly one row appeared; cleanup deleted one row and restored 31 notes | yes | - | Browser UI plus direct REST verification, 2026-08-03 |
| DB-CLOUD-SHARED-04 | reload read | Reload home and notes pages after cleanup | Web reads the final cloud state | Home rendered 35 records and notes page rendered 31 notes | yes | - | Browser regression on `127.0.0.1:5177`, 2026-08-03 |
| DB-CLOUD-SHARED-05 | failure | Cache valid cloud data, then start the same origin with an unavailable Supabase URL | Existing cache remains and the UI explains the dependency failure | Home rendered 35 records and displayed `云端暂不可用，当前显示本地缓存` | yes | - | Isolated browser regression on `127.0.0.1:5178`, 2026-08-03 |
| DB-CLOUD-02 | privacy | Verify second-account isolation | Not applicable after the user chose a no-login single shared space | Removed from current architecture; publishable-key holders have full archive access | n/a | - | User architecture decision, 2026-08-03 |
| DB-CLOUD-03 | cross-device | Create a note on one client and read it on the other | Same account sees the same note on both clients | Not run; Web and mobile clients are not connected yet | pending | - | Pending cloud test |

## Claims

The Web shared-cloud schema, initial 35/31 import, read/write/delete path, reload behavior, and cache fallback are verified. Mobile synchronization, deployment hardening, abuse protection, and attachment sharing are not yet supported claims. The current no-login design provides no user isolation.

## Demo Repetition

- Run 1: Web shared-cloud read/write/delete and cleanup succeeded
- Run 2: not run
- Run 3: not run
- Remaining unstable behavior: mobile synchronization and three consecutive full Demo runs are not yet verified
