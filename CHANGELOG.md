# Changelog

## 3.1.1

- **Specialist starters**: backend/files write `src/server.js` + `package.json`; frontend/design write `public/index.html`; shell writes `scripts/dev.sh` (never overwrite existing)
- **Doctor**: free-model tips (Groq / OpenRouter / NVIDIA), group + code module load checks
- **package.json**: homepage, bugs URL, richer keywords; version **3.1.1**
- Group tests: dry-run session + scaffold folder integration
- PUBLISH.md: prefer `git clone` from GitHub (tree complete)

## 3.1.0

- **100 features** (`jagx features`) + honest **`jagx roadmap`**
- Support wallets printed in the terminal (BEP20 + TRC20)
- Email (Resend), Supabase REST, X post/reply, HTTPS social webhook — **opt-in plugins**, confirm unless `--allow-social`
- Architecture **blueprints** (`jagx blueprint`, Architect role, mermaid)
- Coding remains the main job; social never runs unless you connect keys and ask
- **Group modules on GitHub main**: `groupHelpers` / `groupWorker` / `group` session + chat
- **Scaffold creates real folders** (`src`, `test`, `public`, `.jagx`, task-aware `src/api` …)
- **Review** checks board + basic filesystem notes
- **Coding agent** session under `.jagx/session.json` + executeTool-ready entry

## 3.0.0

### Hands-off group
- Group default is **hands-off** — agents approve their own writes (`--ask` to confirm yourself)
- **Scaffold always first** — folders before any specialist writes code
- Agents **announce done** in the room
- **Review rework loop** — missing work / mistakes sent back to the owner (up to 2 rounds)
- Parallel **write locks** so two agents cannot clobber the same file
- Persistent board: `jagx group board` / `jagx group last`
- `@mentions` in `jagx group chat`
- `mkdir` / `glob` / `move_file` / `delete_file` tools
- `jagx features` — 60+ shipped capabilities

## 2.3.0

### Terminal multi-agent GROUP
- `jagx group "task"` — roster, kickoff intros, work board, dependency-aware execution, debrief
- `jagx group chat` — interactive room (`/run`, `/members`, `/exit`)
- Chat-style timestamps + agent names in the terminal
- Transcripts under `.jagx/groups/`
- `jagx team` and `jagx code --team` use the same group runner

## 2.2.0

- **Agent-step streaming** (`--stream` on `jagx code` / team): live token output per step
- **Optional Playwright preview**: `preview_url` upgrades when `playwright` is installed
- **PUBLISH.md** + `prepublishOnly` test gate
- Doctor reports Playwright availability

## 2.1.0

### Six feature sets
1. **Image agent** — `generate_image` tool + `jagx image`
2. **Skills packs** — `.jagx/skills/*.md`
3. **Usage ledger** — token + est. USD (`jagx ledger`)
4. **Parallel team workers**
5. **Live preview_url**
6. **Richer roster** — Image + Review

## 2.0.0

### Multi-agent
- `jagx team` and free-model providers (NVIDIA, OpenRouter, Groq)

## 1.x

- Core CLI, coding agent loop, path sandbox, MIT license
