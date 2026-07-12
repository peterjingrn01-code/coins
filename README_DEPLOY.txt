JSLCoin Omega 7.1 Audited

Required bindings:
DB = D1 database jslcoin_network_db
KV = KV namespace JSLCoin_DB
Secret = OWNER_SETUP_KEY

Optional password delivery:
RESEND_API_KEY
RESET_FROM_EMAIL
For testing only: RESET_TEST_MODE=true

Deployment:
1. Run worker/schema.sql once in D1.
2. Deploy worker/worker.js.
3. Bind DB and KV under the exact names above.
4. Add OWNER_SETUP_KEY secret.
5. Upload site/index.html and site/JSLCoin/ to GitHub Pages.
6. Open /status; confirm version 7.1, d1 true, kv true.
7. Owner Setup -> Genesis -> Fund Treasury -> public signup/login tests.
