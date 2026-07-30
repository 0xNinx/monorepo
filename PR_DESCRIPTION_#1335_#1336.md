# Title
Contracts: test coverage for allowlist_registry, schema_registry, soroban_access_control, soroban_pausable

# Body

## Summary

Adds coverage to the four lowest-tested crates in the `contracts/` workspace:

| Crate | Before | After |
|---|---|---|
| `allowlist_registry` | 6 | 24 |
| `schema_registry` | 6 | 20 |
| `soroban_access_control` | 7 | 14 |
| `soroban_pausable` | 8 | 16 |

No contract logic was changed — this PR is tests only, per the "out of scope: changing contract behaviour" note on both issues. A few places where the existing behavior looked ambiguous or potentially unintended are documented below rather than silently asserted as correct.

Closes #1335
Closes #1336

## What's covered

### `allowlist_registry` (#1335)
- Authorization: `remove` and `bulk_add` rejected for non-admin callers (`add` already had coverage)
- Double-initialization rejected; `add`/`remove`/`bulk_add` all fail predictably before initialization; read-only queries (`is_member`, `get_entry`, `member_count`) return safe defaults instead of panicking before init
- Duplicate `remove` (removing an already-removed entry) fails on the second call
- Expiry boundary: `expires_at == now` rejected, `now + 1` accepted; `bulk_add` skips already-expired entries in a batch without erroring
- `member_count` and `get_entry` correctly exclude/reject expired entries
- `add`, `remove`, and `bulk_add` events asserted for topic and payload content (not just "an event fired")

### `schema_registry` (#1335)
- Authorization: `register_transition` rejected for non-admin callers
- Double-initialization panics as expected; `register_transition` fails predictably pre-init
- `register_transition` rejects `source == target`
- `execute_migration` version-mismatch path covered, including the `migration_rejected` event
- `execute_migration` success path covered, including the `migration_executed` event and the resulting version bump
- Idempotency (`AlreadyExecuted`) already had coverage; added monotonic `migration_id` incrementing across multiple migrations
- `get_receipt` (absent → present) and `verify_migration` (true / wrong-target / nonexistent-id) covered
- Invariant enforcement exercised properly: a *registered* downgrade transition and a major-version bump that doesn't reset minor to 0 both correctly fail `dry_run` / `execute_migration` with `InvariantViolation`. (The pre-existing "downgrade blocked" test only exercised an *unregistered* pair, i.e. `UnsupportedTransition` — it never actually reached the invariant-checking code path.)

### `soroban_access_control` (#1336)
- Authorization: `set_operator` rejected for non-admin callers (only `admin_only_operation`/`admin_or_operator_operation` had coverage before)
- Double-initialization panics; calling a privileged function before init panics predictably; calling with zero mocked authorizations (not just the wrong signer) fails, proving `require_auth()` is actually wired up
- `set_operator` overwrite: setting a new operator revokes the previous operator's privileges and grants the new one's, in the same test
- `admin_or_operator_operation` denies a caller when no operator has ever been set (not just when a *different* operator exists)
- Unauthorized-access event asserted for topic/payload content, exercised via a second operation (`set_operator`) to confirm the operation name in the event payload is correct per-call, not hardcoded

### `soroban_pausable` (#1336)
- Double-initialization panics; calling `pause` before init panics predictably; `is_paused()` before init safely defaults to `false`
- `pause`/`unpause` with zero mocked authorizations fail, proving `require_auth()` is actually enforced (not just the wrong-signer case, which already had coverage)
- Multi-cycle pause/unpause loop (3 iterations) proving `guarded_operation` toggles correctly every cycle, not just once
- `pause` and `unpause` events asserted for topic content (previously emitted but never asserted)

## Ambiguous / possibly-unintended behavior found (flagging per issue instructions, not fixed here)

1. **`allowlist_registry::add` silently overwrites an existing entry.** The `Error::AlreadyExists` variant is defined but never returned anywhere in the contract — re-adding an already-registered address just updates its label/expiry instead of erroring. Documented as current behavior in `test_add_duplicate_overwrites_existing_entry`. Is overwrite the intended semantics, or should this reject like the unused error variant suggests?

2. **`allowlist_registry::initialize` has no authorization check at all.** It takes no `caller` argument and never calls `require_auth()` on the `admin` it's given — any account can call it once, for any admin address, with zero authorizations mocked (see `test_initialize_succeeds_without_any_mocked_auth`). This is presumably fine if bootstrap security relies on deploy-time control, but flagging since every other privileged path in this crate does enforce auth.

3. **`schema_registry::execute_migration` has no admin check.** It calls `caller.require_auth()` but never compares `caller` to the registry admin, unlike `register_transition` (which goes through `require_admin`). Any address able to sign can execute an already-registered migration (`test_execute_migration_allows_non_admin_caller` documents this as current behavior). Given migrations mutate contract-wide schema state, this looks more like a genuine authorization gap than intended design — recommend a follow-up issue if confirmed.

4. **`schema_registry::register_transition` silently overwrites an existing (source, target) entry** rather than rejecting a duplicate registration. Documented in `test_register_transition_overwrites_existing_entry`. Similar question to #1 above — intended, or should re-registration be rejected?

5. **`soroban_access_control` doesn't implement role granting/revocation or admin transfer.** Issue #1336's scope for this crate asks for coverage of "role granting and revocation" and "admin transfer, including loss of the previous admin's authority." The actual crate surface is two generic authorization-check helpers (`require_admin_permission`, `require_admin_or_operator_permission`) plus a minimal test harness contract with `init`/`set_operator`/two gated operations — there is no grant/revoke or transfer-admin function anywhere in this crate to test. I did not add that functionality to the harness contract since that would be adding new behavior rather than testing existing behavior (out of scope per the issue). Flagging for maintainer confirmation: does this functionality live in a different crate, or does the issue scope need adjusting for what this crate actually does? Separately: since there's no admin-transfer path, the "contract cannot be left without an admin" invariant holds trivially — admin is immutable once set at init.

6. **`soroban_pausable`'s test harness has exactly one pause-gated operation** (`guarded_operation`). The issue asks to "enumerate operations gated by pause rather than testing one representative case" — there is only one to enumerate. Flagging in case maintainers want the harness contract expanded with more representative gated/ungated operations; I left it as-is to avoid changing contract behavior beyond what the issue authorized.

## Test plan
- [x] `cd contracts && cargo fmt --all -- --check`
- [x] `cargo clippy --workspace --all-targets --all-features`
- [x] `cargo test --workspace` — all tests pass, including the 47 new tests across the four crates (0 failures, 0 pre-existing test regressions)
