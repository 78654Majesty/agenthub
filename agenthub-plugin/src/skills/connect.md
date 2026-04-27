# ah:connect

Connect or create a local AgentHub wallet.

> Current phase: Dev C product path. This flow uses the in-process Wallet Bridge SDK and Gateway public-auth. No local wallet HTTP service or manual setup command is required.

## Steps

1. **Call `wallet_connect`** — This is the only required tool in the minimal path.
2. **Create or load local wallet**
   - If `~/.agenthub/dev-wallet.json` does not exist, create a new Solana keypair and persist it as a development wallet.
   - If the file exists, load the existing keypair.
3. **Authenticate with Gateway**
   - Request `GET /v1/public/auth/challenge?wallet={pubkey}`.
   - Sign the returned `challenge` message locally.
   - Submit `POST /v1/public/auth/verify` with `{ wallet, signature }`.
4. **Cache login state**
   - Store the returned JWT in plugin memory for follow-up commands in the same plugin process.
5. **Return result**
   - Display the wallet pubkey.
   - Confirm that the auth token has been cached.

## Error handling

- If Gateway is unreachable, report the error and suggest checking the gateway URL config.
- If `JWT_SECRET` or `DATABASE_URL` is missing on the Gateway side, report the server-side startup/configuration issue.
- If the local wallet file is unreadable or malformed, report that the development wallet must be recreated.
