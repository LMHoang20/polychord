# Issue bot (Docker + Claude Code)

Runs the issue bot on your own machine. Every minute it checks GitHub for new issues and `/bot` comments from people in the `ISSUE_BOT_ALLOWLIST` repo variable. The repo owner can always use `/bot`. For each request, Claude Code makes the change and the bot opens or updates a pull request that closes the issue. How requesters use it is described in the main [README](../README.md#issue-bot).

## How it's isolated

Everything runs in one container with its own clone of the repo in a Docker volume. Your working copy isn't touched.

- **The bot process** (`bot.mjs`, root in the container) holds the GitHub token and the clone.
- **Claude** runs as a separate `agent` user on a plain copy of the files, with no `.git` folder. It can't read the GitHub token, the clone, or the bot's environment.
- **Claude's tools** are limited to reading and editing files in that copy and running `npm test`. Everything else is denied.
- **Afterwards** the bot reruns `npm test` as `agent`, then copies back only `public/`, `test/` and `README.md`, rejecting symlinks. It commits, pushes and opens the PR itself.
- **Container limits:** the container drops all Linux capabilities except the five it needs, and `no-new-privileges` is on.

Claude's own token is visible to Claude, since it needs it. Nothing on your Mac outside the container is reachable.

## Setup

1. **GitHub token:** create a fine-grained token at https://github.com/settings/personal-access-tokens/new.
   - Repository access: only this repo.
   - Permissions: Contents, Issues and Pull requests set to *Read and write*; Variables set to *Read*.

   The bot pushes and comments as you, so CI and Vercel previews run on its PRs as usual.
2. **Claude login:** either
   - run `claude setup-token` for a long-lived token that uses your Claude subscription (log in with the account you want billed), or
   - use an Anthropic API key, billed per use.
3. **Config:** `cp bot/.env.example bot/.env` and fill it in. `bot/.env` is git-ignored.
4. **Allowlist:** if it isn't set already, `gh variable set ISSUE_BOT_ALLOWLIST --body '["their-login"]'`.
5. **Turn off the GitHub Actions version** so only one bot answers: `gh workflow disable issue-bot.yml`.
6. **Start it:**

   ```sh
   docker compose -f bot/compose.yml up -d --build
   docker compose -f bot/compose.yml logs -f      # watch what it does
   ```

It restarts with Docker. Requests made while your machine is asleep or Docker is stopped are picked up when it's back. On first start it only acts on requests made from then on; comment `/bot` on an older issue to hand it over.

## Day to day

```sh
docker compose -f bot/compose.yml logs -f                  # follow the log
docker compose -f bot/compose.yml stop                     # pause
docker compose -f bot/compose.yml up -d --build            # start, or apply changes to bot/
docker compose -f bot/compose.yml down --volumes           # remove, including the clone and state
```
