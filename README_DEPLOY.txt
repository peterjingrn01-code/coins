1. Upload root index.html and the full JSLCoin folder to GitHub.
2. Cloudflare Worker: deploy only JSLCoin/Worker/worker.js. Do not upload the whole repository as assets.
3. Bind KV as DB.
4. Add secret OWNER_SETUP_KEY.
5. Deploy and test /status.
6. Open /JSLCoin/login.html, initialize Owner, then run Genesis once.
7. Test public Sign Up and Sign In from the root page.
