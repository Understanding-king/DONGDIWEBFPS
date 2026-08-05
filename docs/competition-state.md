# Competition State

Updated: 2026-08-05 11:21 Asia/Shanghai

## Status

- Track: unverified
- Official build clock running: unverified
- Time remaining: unknown
- Current phase: 3 - Supabase single-space data-path validation
- Phase pass condition: The no-login shared database path works end to end with a recorded fallback and explicit security limitation.
- Verified evidence: Supabase `records`, `notes`, `categories`, and `archive_meta` have RLS enabled, one shared policy each, and no `user_id`; the Web client uploaded and read back the shared archive, and its write/delete and cache fallback paths passed. The evidence-grounded growth page now produces two traceable radars from original record fields; deterministic rules, empty input, year switching, evidence navigation, desktop layout, and mobile layout have each passed one focused check.
- Main blocker or risk: Anyone who obtains the publishable key can read and write the entire archive. Growth scores are explainable keyword-rule outputs, not a validated psychological or educational measurement, and can still need human review for wording context.
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
- One-line solution: Record experiences once, then organize, retrieve, and turn them into traceable growth evidence with AI assistance and deterministic rules.
- Core AI action: Summarize, classify, transcribe, and retrieve experience material.
- Deterministic rules: Shared-record identity, date normalization, category constraints, storage boundaries, explicit save/delete behavior, trait evidence levels, normalized trait scores, and year-over-year domain points.
- User-visible result: A searchable experience archive with notes, calendar views, relationship visualization, and a source-linked personal growth profile.
- MVP: Existing local Web core plus one verified cross-device database slice.
- Non-goals: Full Web deployment, cloud attachment storage, realtime collaboration, and production AI proxy in this database phase.
- Three-minute Demo: unverified

## Validation And Stability

- Highest technical risk: Cross-device shared writes without authentication expose the full archive to anyone holding the publishable key.
- Spike result and evidence: Shared schema migration, initial import, Web cloud read/write/delete, migration idempotency marker, local-cache failure fallback, and the deterministic growth-profile slice are verified. Mobile database behavior remains unverified. See `docs/test-evidence.md`.
- Core Demo status: Web cloud flow and one growth-profile browser run work; mobile-to-Web synchronization and three consecutive full Demo runs are pending.
- Test-set size: Existing cloud checks plus 1 growth-rule fixture set, 1 empty-input rule check, 1 source-link interaction, 1 zero-baseline year check, 1 desktop layout check, and 1 mobile layout check completed; 0 mobile cross-device database tests completed.
- Known limitations: Attachments remain local; the shared database has no user authentication or abuse protection; keyword scoring does not understand every negation or implicit context and must remain reviewable evidence, not an objective personality diagnosis.
- Critical dependency fallback: Preserve the current local JSON and browser-cache path until cloud acceptance passes.
- Recording/offline fallback: Existing local Demo; exact competition fallback unverified.

## Submission Readiness

- Runnable Demo: Web shared-cloud flow and local fallback reverified on 2026-08-03; growth profile passed one browser run on 2026-08-05; mobile flow pending
- GitHub / README: repository exists; current local changes are not yet committed
- Product document: partial README and database contract
- Architecture and AI workflow: partial
- Test evidence: Web shared-cloud and fallback evidence recorded in `docs/test-evidence.md`; mobile evidence missing
- Pitch deck and timed script: unverified
- Contribution record: missing
- Backup: local JSON rolling backup exists; cloud backup unverified
- Q&A ownership: unverified
