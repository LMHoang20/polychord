# TonyPoly 🎹

A free, browser-based playground for jazz harmony. No accounts, no tracking, no build step: plain HTML, CSS and JavaScript, with recorded classical instruments (piano, harpsichord, organ, harp, guitar, strings, violin, cello, flute, oboe, clarinet, French horn) played through the Web Audio API.

| Tool | What it does |
| --- | --- |
| **Polychord Analyzer** | Decodes two stacked chords into an upper structure (e.g. D over C → Cmaj13(#11)), or encodes an interpretation back into a polychord. Shows the pitch-class set, a scale hint and ranked chord interpretations, and plays everything back. |
| **Modulation** | Ear training for key changes. Generates a diatonic progression (8 chords for 2 keys, 16 for 3) that moves through 2–3 keys, optionally with a melody of chord tones, plays it, and grades your transcription. Enharmonic spellings and common quality spellings are accepted. |
| **Randomizer** | Random practice prompts (notes, scales, frets, or any custom list). The setup lives in the URL, so you can bookmark or share it. |

## Running locally

Any static file server works. The site lives in `public/`:

```sh
npm run dev               # serves public/ at http://localhost:3000
# or
python3 -m http.server -d public 8000
```

Opening the HTML files directly via `file://` mostly works too. Only the Randomizer's URL persistence needs a server.

## Tests

The tests need Node 22 or later and have no dependencies:

```sh
npm test
```

They load the real browser scripts from `public/js/` into a sandbox with a minimal fake DOM, so they test what actually ships: the music-theory core, polychord decode/encode, modulation generation and answer checking, and the Randomizer's handling of shared URL configs.

## Project layout

```
public/            everything that gets deployed
  *.html           one page per tool, plus donate.html and 404.html
  css/styles.css   shared styles
  assets/instruments/<name>/<midi>.mp3
                   instrument recordings, one every 3 semitones from C2 to C7
  js/theory.js     music-theory core (no DOM, no audio)
  js/audio.js      Web Audio playback (instrument samples, synth fallback) and small DOM helpers
  js/<page>.js     page logic
test/              node:test suites + a script loader
vercel.json        hosting config: output dir and security headers (CSP etc.)
bot/               issue bot that runs in Docker with Claude Code (not deployed)
```

The scripts are classic `<script>` tags that share globals, in this load order: `theory.js` → `audio.js` → page script.

## Deployment

The site is hosted on Vercel as a static site. `vercel.json` serves `public/` as is and sets security headers. There is no build or install step.

```sh
vercel          # preview
vercel --prod   # production
```

Connecting the GitHub repo to the Vercel project gives a preview deploy for every pull request and a production deploy from `main`.

## Issue bot

People on an allowlist can get changes made without writing code. A bot implements their request and opens a pull request that closes the issue. A maintainer still reviews and merges it.

The bot can run two ways. Turn on only one, or both will answer:

- **Docker + Claude Code** (`bot/`): runs on your own machine and polls GitHub. See [bot/README.md](bot/README.md).
- **GitHub Actions + Gemini** (`.github/workflows/issue-bot.yml`): runs on GitHub, set up below. Gemini's free tier allows only 20 requests a day, which isn't enough for one change, so it needs billing turned on. Turn it off with `gh workflow disable issue-bot.yml`.

Either way:

- **Ask:** open any issue (the *Change request* form helps, but a plain issue works too, e.g. from the mobile app), or comment `/bot <what you want>` on any issue. The repo owner can also comment `/bot` to hand an issue to the bot.
- **Check:** the bot replies with a link to the PR, where Vercel posts a preview link.
- **Revise:** comment `/bot <what to change>` on the bot's PR.

The AI only gets to read and edit files and run `npm test`. Only changes to `public/`, `test/` and `README.md` are kept, and the AI never holds a GitHub token. Both versions read the allowlist from the `ISSUE_BOT_ALLOWLIST` repo variable.

GitHub Actions setup (once):

```sh
gh variable set ISSUE_BOT_ALLOWLIST --body '["some-login"]'   # JSON array of GitHub logins
gh secret set GEMINI_API_KEY                                  # key from aistudio.google.com/apikey
gh api -X PUT repos/{owner}/{repo}/actions/permissions/workflow \
  -f default_workflow_permissions=read -F can_approve_pull_request_reviews=true
```

The last command lets Actions open pull requests. Optionally set the `GEMINI_MODEL` variable to choose a model. Vercel previews must be public for the requester to see them: in the Vercel project, open **Settings → Deployment Protection** and turn off **Vercel Authentication**.

## Contributing

Issues and pull requests are welcome. Please keep the zero-dependency, no-build approach, add tests for logic changes, and run `npm test` before opening a PR.

## License

Code: [MIT](LICENSE).

Instrument recordings in `public/assets/instruments/`: Fluid R3 GM soundfont by Frank Wen, rendered by [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts), [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). See [CREDITS.txt](public/assets/instruments/CREDITS.txt).
