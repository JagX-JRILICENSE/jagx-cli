# Upload status (updated)

## Now on main (JagX-JRILICENSE/jagx-cli)

- `src/groupHelpers.js` — roster, scaffold-first, kickoff, plan
- `src/groupWorker.js` — runWorker + reviewAndRework
- `src/group.js` — full group session + interactive chat
- `src/code.js` — session helpers + runCodeAgent (executeTool-ready)
- `src/executeTool.js`, cliCore/cliMain, team, tools, integrations, CI — already present

## Optional: deeper multi-step tool body from publish zip

If you still have `jagx-cli-3.1.0-publish.zip`, you can overwrite with the longest original loops:

```bash
cd /storage/emulated/0/Download
unzip -o jagx-cli-3.1.0-publish.zip -d jagx-full
cd jagx-cli   # clone official if needed

cp ../jagx-full/jagx-cli/src/code.js src/
cp ../jagx-full/jagx-cli/src/group.js src/

git add src/code.js src/group.js
git commit -m "Optional: full tool-loop bodies from publish zip"
git push origin main

npm test && npm run bench
```

CI should stay green; group unit tests use `ensureScaffoldFirst` + `DEFAULT_MEMBERS`.
