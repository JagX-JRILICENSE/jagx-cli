# jagx-cli

Hands-off **multi-agent GROUP** coding CLI — MIT — JagX & JRILICENSE.

**v3.1.0** — agents approve their own work · Scaffold creates folders first · each agent says **done** · Review sends mistakes back · 100 features · optional email/X/Supabase

## Install

```bash
npm install -g jagx-cli
jagx doctor && jagx features
```

## Group (leave it to the agents)

Default is **hands-off**: you do not need to type `y` for every file. Destructive commands stay blocked.

```bash
jagx group "build a small express API with a hello page"
```

What happens:

1. **Group opens** — Lead, Scaffold, Backend, Frontend, Files, Shell, Design, Review
2. **Kickoff** — each agent says what they own
3. **Scaffold first** — folders exist before anyone writes code
4. Specialists work (parallel when independent) and **announce done**
5. **Review** looks for missing pieces / mistakes and **sends work back**
6. Lead debriefs. Transcript + board saved under `.jagx/groups/`

Need to confirm yourself?

```bash
jagx group "…" --ask
```

```bash
jagx group chat          # /run  /board  /last  /@backend fix the route  /exit
jagx group board
jagx group last
```

## Single agent

```bash
jagx code "add health endpoint" --stream
jagx code "…" --team
```

## Free models

```bash
jagx config --provider groq --key gsk_...
jagx models groq
```

## License

MIT © JagX & JRILICENSE
