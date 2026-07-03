# JSLCoin 4.0 Official

First commercially functioning JSLCoin product package for JSL-ian Technologies.

## Included
- Owner Login / Logout
- User Register / Login / Logout
- Session token security
- Password hashing in Cloudflare Worker
- Owner-only Genesis and Issue
- User-only Buy / Sell / Send / Pair Confirm
- Persistent KV ledger and balances
- Dashboard and Ledger tables
- JSL-ian logo and links

## Deployment
Upload/overwrite all files in `coins / JSLCoin /`.
Keep the Cloudflare Worker project name `jslcoin`.
KV binding must be:

```toml
[[kv_namespaces]]
binding = "DB"
id = "7944d5e70e8e472eb58686570e749c96"
```

Frontend: `https://coins.jsl-ian.com/JSLCoin/`
API: `https://jslcoin.jsl-ian.com/status`
