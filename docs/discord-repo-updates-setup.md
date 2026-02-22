# Discord Repo Updates Setup

This repository posts commit/PR updates to Discord via:
- `.github/workflows/discord-repo-updates.yml`

Commit message format on `push` events:
- `🏐 Commit: [repo-name] user - branch - short-sha - commit subject`
- `<compare-url>`

## 1) Discord setup

1. Open your Discord server.
2. Go to `Server Settings` -> `Integrations` -> `Webhooks`.
3. Create a new webhook for your target channel (for example `#repo-updates`).
4. Copy the webhook URL.

## 2) GitHub setup

1. Open the GitHub repo.
2. Go to `Settings` -> `Secrets and variables` -> `Actions`.
3. Add repository secret:
   - `DISCORD_REPO_UPDATES_WEBHOOK_URL`
4. Paste the Discord webhook URL as the secret value.

## 3) Validate end-to-end

1. Push this workflow to the default branch.
2. Open GitHub `Actions` -> `Discord Repo Updates`.
3. Run `workflow_dispatch` with an optional `test_message`.
4. Confirm message arrives in Discord.
5. Push a real commit and confirm the two-line commit message format.

## Notes

- PR events from forks usually cannot access repository secrets, so those runs may fail to post.
- Regenerate the webhook URL immediately if it is exposed.
