# JSL Coin Network v1.1 Final - Genesis Edition

## Deploy order
1. Cloudflare Worker: replace the real `worker.js` with this package's `worker.js`, then Deploy.
2. Test: `https://api.jsl-ian.com/status`
3. Test Genesis: `https://api.jsl-ian.com/genesis`
4. GitHub: upload/replace `index.html`, `ownerpage.html`, `userpage.html`.

## Important
When `/genesis` returns an `owner_key`, save it. Owner issue operations require this key.
