# JSLCoin Omega 5.1 Core

This package keeps the existing page map while replacing local-only state with one Cloudflare Worker/KV source of truth.

## Upload
Upload the contents of `JSLCoin/` over `coins/JSLCoin/`.

## Worker
Deploy `JSLCoin/Worker/worker.js`, and bind a KV namespace as `DB`.

## Important
- The browser stores only the session token.
- Users, balances and ledger live in Worker KV.
- Existing `JSLCoin_STATE_v4` data is normalized when read.
- Test reset codes are returned on-screen until email delivery is connected.
