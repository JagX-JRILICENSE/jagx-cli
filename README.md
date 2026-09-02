# jagx-cli

Hands-off **multi-agent GROUP** coding CLI — MIT — **JagX & JRILICENSE**.

**v3.1.0** — agents approve their own work · Scaffold creates folders first · each agent says **done** · Review can send work back · 100 features · optional email / X / Supabase · free models (Groq, NVIDIA, OpenRouter)

Repo: https://github.com/JagX-JRILICENSE/jagx-cli

## Install

```bash
npm install -g jagx-cli
jagx doctor
jagx features
jagx version
```

Node **≥ 18** required.

## Group (leave it to the agents)

Default is **hands-off**: agents approve their own writes. Destructive shell stays blocked. Use `--ask` if you want to confirm every write.

```bash
jagx group "build a small express API with a hello page"
```

What happens:

1. **Group opens** — Lead, Scaffold, Backend, Frontend, Files, Shell, Design, Review
2. **Kickoff** — each agent states what they own
3. **Scaffold first** — creates `src/`, `test/`, `public/`, `.jagx/`, optional `src/api` … before anyone else writes
4. Specialists work and **announce done**
5. **Review** checks the board / folders and can flag rework
6. Transcript saved under `.jagx/groups/`

```bash
jagx group "…" --ask          # you confirm writes
jagx group chat               # interactive room
#   /run <goal>   /members   /exit
jagx group board
jagx group last
```

## Single coding agent

```bash
jagx code "add health endpoint" --stream
jagx code "…" --team
jagx code "…" --dry-run
```

Session state lives in `.jagx/session.json`.

## Free / cheap models

```bash
jagx config --provider groq --key gsk_...
jagx config --provider openrouter --key sk-or-...
jagx config --provider nvidia --key nvapi-...
jagx models
jagx models groq
```

After keys are set, doctor and models show which providers are good to use.

## Integrations (opt-in)

Coding is the main job. Social / email only run when keys exist and you ask (or pass `--allow-social` where supported).

- **Resend** email
- **Supabase** REST
- **X (Twitter)** post / reply
- HTTPS social webhook
- Architecture **blueprints** (`jagx blueprint`)

## Other commands

```bash
jagx doctor
jagx features          # 100-item catalog
jagx roadmap
jagx ledger            # token / cost usage
jagx init
jagx team
jagx image "…"
```

## Support

- GitHub: https://github.com/JagX-JRILICENSE/jagx-cli
- Issues & PRs welcome
- Support wallets may print in the terminal footer (BEP20 / TRC20) when enabled in theme

## License

MIT © JagX & JRILICENSE
