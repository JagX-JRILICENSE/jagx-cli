# Publish jagx-cli to npm (including Termux)

Official source: https://github.com/JagX-JRILICENSE/jagx-cli  
CI is green on `main` (Node 18/20/22).

## Recommended: publish from a clean Git clone

```bash
cd /storage/emulated/0/Download   # or ~/storage/downloads
rm -rf jagx-cli
git clone https://github.com/JagX-JRILICENSE/jagx-cli.git
cd jagx-cli

node -v          # need >= 18
npm whoami       # must print your npm user (e.g. yyfds)
# if 401:
npm login --auth-type=web

npm test
npm run bench
npm publish --access public

npm view jagx-cli version
npx jagx-cli@latest version
```

## Why publish used to fail

`prepublishOnly` runs:

```bash
npm test && npm run bench
```

An incomplete unzip (missing `src/roadmap.js` or stubs) caused:

```
ERR_MODULE_NOT_FOUND: Cannot find module '.../src/roadmap.js'
```

Login was fine; the tree was incomplete. **GitHub `main` is now complete** for CI.

## Optional: publish zip

If you still use `jagx-cli-3.1.0-publish.zip`:

```bash
rm -rf jagx-cli
unzip jagx-cli-3.1.0-publish.zip
cd jagx-cli
ls src/roadmap.js src/group.js src/code.js
npm test && npm run bench
npm publish --access public
```

Always `rm -rf` before unzip so old partial trees do not mix.

## Name already taken?

Scope it in `package.json`:

```json
"name": "@yyfds/jagx-cli"
```

Then:

```bash
npm publish --access public
```

## Skip prepublishOnly (not recommended)

Only if tests already passed:

```bash
npm publish --access public --ignore-scripts
```

## Termux tips

- Node ≥ 18 (`node -v`)
- `npm login --auth-type=web` then open the URL in the phone browser
- `npm whoami` 401 → not logged in
- Prefer `git clone` over mixed unzip folders
