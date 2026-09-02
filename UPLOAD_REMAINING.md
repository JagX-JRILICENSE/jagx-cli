# Status: upload complete for v3.1.0 mainline

## On GitHub main now

- Multi-agent **group** (`groupHelpers` + `groupWorker` + `group` session/chat)
- Scaffold creates real folders; review checks board
- Coding agent session + executeTool-ready entry
- CLI, providers, integrations, 100 features, CI (Node 18/20/22)
- Tests cover dry-run group session + scaffold folders

## Publish

See **PUBLISH.md** — prefer:

```bash
git clone https://github.com/JagX-JRILICENSE/jagx-cli.git
cd jagx-cli
npm test && npm run bench
npm publish --access public
```

## Optional deeper loops

Longest original multi-step provider tool loops can still be copied from a local publish zip over `src/code.js` / full group worker if you want maximum model-driven editing. CI already passes without that.
