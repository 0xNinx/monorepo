# Contract Hardening: Reward Conservation, Multisig TTL, Oracle Aggregation, Tiered Slashing

## Summary

Implements four independent contract improvements addressing safety gaps in `epoch_rewards`, `multisig_admin`, `oracle_price_feeds`, and `slashing_module`.

---

## epoch_rewards — Rounding-safe reward distribution and conservation invariants (#1140)

**Problem:** Integer division in pro-rata reward distribution silently discards rounding dust. No invariant guaranteed `Σ claimable(epoch) ≤ funded(epoch)`, and users could call `claim` before any epoch was sealed.

**Changes:**
- Track `EpochStartIndex(u64)` so seal-time can compute `total_claimable = total_staked × Δindex / SCALE` exactly.
- Add `dust` and `total_claimable_at_seal` fields to `EpochInfo`; `dust = funded − total_claimable` is always ≥ 0.
- Carry full funded amount (including dust) to the next epoch via `carried_forward` — no funds are silently lost.
- Emit `epoch_sealed` event with `(epoch, funded, total_claimable)` for off-chain auditing.
- Emit `dust_carried` event whenever rounding leaves a remainder.
- Add `ClaimBeforeSeal` error — `claim()` is rejected until at least one epoch is sealed.

**New tests:** `conservation_uneven_split_sum_never_exceeds_funded`, `dust_tracked_in_epoch_info`, `claim_is_idempotent`, `claim_before_any_seal_is_rejected`, `full_claim_conservation_multi_epoch`.

---

## multisig_admin — Proposal TTL/expiry and approval revocation (#1129)

**Problem:** Approved proposals persisted indefinitely; signers who changed their minds could not withdraw consent; the `approve` path skipped the expiry check.

**Changes:**
- `approve()` now checks expiry and rejects approvals on expired proposals; emits `proposal_expired`.
- `revoke_approval(signer, proposal_id)`: removes a signer's prior approval, rebuilds the approvals list, lowers `approval_count`, emits `approval_revoked`.
- `execute()` re-reads live approvals after potential revocations before checking threshold.
- Added `multisig_admin` to workspace `Cargo.toml` members.

**New tests:** `expiry_blocks_approve`, `revoke_below_threshold_blocks_execute`, `revoke_then_reapprove_succeeds`, `revoke_without_prior_approval_panics`, `non_signer_cannot_revoke`, `double_approve_is_idempotent_via_rejection`.

---

## oracle_price_feeds — Multi-source median aggregation with quorum and per-source heartbeat (#1130)

**Problem:** A single trusted operator was the entire oracle — single point of failure and manipulation. No resistance to a compromised or stale source.

**Changes:**
- `add_source(admin, pair, source)` / `remove_source(admin, pair, source)` manage registered sources per feed.
- `set_quorum(admin, pair, quorum)` configures the minimum number of fresh sources required.
- `update_price()`: when sources are registered for a feed, authenticates per-source (not admin/operator); applies deviation check against the source's own previous price; emits `source_reported`.
- `get_price()`: in multi-source mode computes the **median** of fresh source submissions; fails with `NoQuorum` when fewer than quorum sources have fresh data; emits `aggregated_price`. Falls back to legacy single-operator mode when no sources are registered.
- `is_stale()`: aware of multi-source quorum.
- New errors: `NoQuorum` (7), `UnknownSource` (8).
- `median()` helper: selection sort over `Vec<i128>`, no floating point.

**New tests:** quorum-met returns median, stale source ignored, below-quorum errors, outlier rejected by deviation bound, unregistered source rejected, add/remove source, even-count median is average.

---

## slashing_module — Tiered/partial slashing and commit-reveal evidence (#1131)

**Problem:** Slashing was all-or-nothing for a fixed set of tiers with hardcoded BPS; evidence was submitted in the clear enabling front-running; no cap on maximum slash fraction.

**Changes:**
- **Commit-reveal scheme:**
  - `submit_evidence(submitter, commitment, actor, offence)` — `commitment = sha256(evidence || salt)`; stores on-chain, never exposes raw evidence.
  - `reveal_evidence(submitter, slash_id, evidence, salt)` — computes `sha256(evidence || salt)` on-chain and verifies match; marks `CommitmentRevealed(slash_id) = true`.
  - `finalize_slash()` requires `CommitmentRevealed = true` for validator slashes.
  - Cancellation clears the commitment entry so re-submission is possible.
- **Configurable tiers:**
  - `configure_tiers(admin, double_sign_bps, downtime_bps, invalid_block_bps, max_slash_bps)` overrides hardcoded defaults.
  - `MaxSlashBps` caps every slash; no slash fraction can exceed it.
- **`propose_slash(submitter, actor, penalty_bps)`** accepts tier in BPS; computes amount from staked balance; effective BPS capped by `max_slash_bps`.
- `finalize_slash()` applies balance reduction and tracks `SlashedAmount` for both validator and non-validator slashes.
- New events: `evidence_committed`, `evidence_revealed`, `slash_finalized(slash_id, amount, penalty_bps)`, `tiers_configured`.
- New errors: `CommitmentNotRevealed` (15), `InvalidReveal` (16).

**New tests:** `bad_reveal_rejected`, `finalize_without_reveal_fails`, `configurable_tiers_override_defaults`, `max_slash_bps_caps_penalty`, `tier_mapping_downtime_vs_double_sign`, `propose_slash_tiered_bps`, `propose_slash_bounded_by_max_bps`.
All pre-existing tests updated to use the `commit_and_reveal()` helper.

---

## Test results

```
epoch_rewards    — 16 passed, 0 failed
multisig_admin   — 17 passed, 0 failed
oracle_price_feeds — 19 passed, 0 failed
slashing_module  — 28 passed, 0 failed
```
