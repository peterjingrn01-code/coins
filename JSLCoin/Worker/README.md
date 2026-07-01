# JSLCoin Worker API

Upload these files into:

`coins / JSLCoin / Worker /`

Files:
- `worker.js`
- `wrangler.toml`
- `package.json`
- `README.md`

API routes:
- `GET /status`
- `GET /transactions`
- `POST /genesis`
- `POST /issue`
- `POST /register`
- `POST /buy`
- `POST /sell`
- `POST /send`
- `POST /pair-confirm`

This is an in-memory Worker backend for first closed-loop testing. Durable storage can be added later.
