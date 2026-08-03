# Competition State

Updated: 2026-08-03 Asia/Shanghai

## Status

- Track: unverified
- Official build clock running: unverified
- Time remaining: unknown
- Current phase: 3 - Supabase single-space data-path validation
- Phase pass condition: The no-login shared database path works end to end with a recorded fallback and explicit security limitation.
- Verified evidence: Supabase `records`, `notes`, `categories`, and `archive_meta` have RLS enabled, one shared policy each, and no `user_id`; the Web client uploaded and read back 35 records and 31 notes. A temporary note was created through the Web UI, confirmed in Supabase, deleted, and the count returned to 31. Cloud failure preserved the 35-record cache.
- Main blocker or risk: Anyone who obtains the publishable key can read and write the entire archive; this is acceptable only for the team's current single-user development decision.
- Next concrete deliverable: Connect the mobile client to the same shared tables and run one Web-to-mobile note synchronization test.
- Acceptance condition: A temporary note created on one client appears on the other after refresh and is removed from both after cleanup.
- Student owner: unassigned; the team must confirm ownership before implementation.

## Rules And Sources

- Latest checked official source: unverified; organizer materials must be checked before the official build window.
- Source date: unverified
- Required platform/model: unverified
- Required Agent/Skill/multimodal capability: unverified
- Required submissions: unverified
- Pitch format: unverified
- Confirmed reuse policy: unverified
- Unresolved rule and organizer question: Which pre-event code, schemas, prompts, data, and assets may be reused, and how must they be disclosed?

## Product Snapshot

- Target user: International high-school students.
- Specific situation: Capturing and retrieving experiences for later reflection and application material.
- Pain evidence: unverified
- One-line solution: Record experiences once, then organize and retrieve them with AI assistance.
- Core AI action: Summarize, classify, transcribe, and retrieve experience material.
- Deterministic rules: Shared-record identity, date normalization, category constraints, storage boundaries, and explicit save/delete behavior.
- User-visible result: A searchable experience archive with notes, calendar views, and relationship visualization.
- MVP: Existing local Web core plus one verified cross-device database slice.
- Non-goals: Full Web deployment, cloud attachment storage, realtime collaboration, and production AI proxy in this database phase.
- Three-minute Demo: unverified

## Validation And Stability

- Highest technical risk: Cross-device shared writes without authentication expose the full archive to anyone holding the publishable key.
- Spike result and evidence: Shared schema migration, 35/31 import, Web cloud read/write/delete, migration idempotency marker, and local-cache failure fallback are verified. Mobile behavior remains unverified. See `docs/test-evidence.md`.
- Core Demo status: Web cloud flow works; mobile-to-Web synchronization is pending.
- Test-set size: 1 cloud structure inspection, 1 initial import, 1 Web write/delete cleanup, 1 reload read, and 1 dependency-failure fallback completed; 0 mobile cross-device tests completed.
- Known limitations: Attachments remain local; the shared database has no user authentication or abuse protection.
- Critical dependency fallback: Preserve the current local JSON and browser-cache path until cloud acceptance passes.
- Recording/offline fallback: Existing local Demo; exact competition fallback unverified.

## Submission Readiness

- Runnable Demo: Web shared-cloud flow and local fallback reverified on 2026-08-03; mobile flow pending
- GitHub / README: repository exists; current local changes are not yet committed
- Product document: partial README and database contract
- Architecture and AI workflow: partial
- Test evidence: Web shared-cloud and fallback evidence recorded in `docs/test-evidence.md`; mobile evidence missing
- Pitch deck and timed script: unverified
- Contribution record: missing
- Backup: local JSON rolling backup exists; cloud backup unverified
- Q&A ownership: unverified
