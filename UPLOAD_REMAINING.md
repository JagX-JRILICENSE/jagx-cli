# Finish upload (code.js + group.js)

These two files are large (~18–26 KB). Upload them from Termux with the publish zip:

```bash
cd /storage/emulated/0/Download
unzip -o jagx-cli-3.1.0-publish.zip -d jagx-full
cd jagx-cli   # or: git clone https://github.com/JagX-JRILICENSE/jagx-cli.git && cd jagx-cli

cp ../jagx-full/jagx-cli/src/code.js src/
cp ../jagx-full/jagx-cli/src/group.js src/
# optional (split modules already on GitHub):
# cp ../jagx-full/jagx-cli/src/executeTool.js src/   # if present in zip after rebuild

git add src/code.js src/group.js
git commit -m "Add code agent loop and group runner"
git push origin main

npm test && npm run bench
```

Repo already has: CLI (cli/cliCore/cliMain), executeTool, codeCore, codeSession, team, tools, integrations, tests, CI.
