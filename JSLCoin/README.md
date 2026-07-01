# JSLCoin 3.1 Login Edition

Persistent JSLCoin Alpha package with Login / Logout and current-user session.

Upload all files into `coins / JSLCoin /`, replacing existing files.

Frontend files:
- index.html
- ownerpage.html
- userpage.html
- dashboard.html
- transactions.html
- style.css
- app.js
- logo.png

Worker files in `coins / JSLCoin / Worker /`:
- worker.js
- wrangler.toml
- package.json

Cloudflare:
- Worker project: `jslcoin`
- API domain: `https://jslcoin.jsl-ian.com`
- Frontend: `https://coins.jsl-ian.com/JSLCoin/`
- KV namespace: `JSLCoin_DB`
- Binding variable: `DB`
- Namespace ID included in `Worker/wrangler.toml`

New in 3.1:
- Login
- Logout
- Current User
- Auto-login after Register
- Buy / Sell / Send / Pair Confirm use current logged-in user
- User balances visible on User and Dashboard
