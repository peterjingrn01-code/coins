# JSLCoin 3.0

Persistent JSLCoin Alpha package.

Upload frontend files into `coins / JSLCoin /`:
- index.html
- ownerpage.html
- userpage.html
- dashboard.html
- transactions.html
- style.css
- app.js

Upload Worker files into `coins / JSLCoin / Worker /`:
- worker.js
- wrangler.toml
- package.json

Cloudflare:
- Worker project: `jslcoin`
- Custom Worker domain/API: `https://jslcoin.jsl-ian.com`
- Frontend domain: `https://coins.jsl-ian.com/JSLCoin/`
- KV namespace: `JSLCoin_DB`
- Binding variable name: `DB`

If Dashboard binding fails on mobile, deploy from GitHub with `wrangler.toml`, replacing the KV namespace id.


## Branding and links added
- `logo.png` is included in the frontend folder.
- Logo links to `https://www.jsl-ian.com`.
- Footer links include JSL-ian Home, Coins Portal, and JSLCoin API Status.
