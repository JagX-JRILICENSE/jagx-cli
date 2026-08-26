# Publish jagx-cli to npm (including Termux)

## Why your publish failed

`prepublishOnly` runs:

```bash
npm test && npm run bench
```

Your extracted folder was **missing `src/roadmap.js`**, so tests crashed:

```
ERR_MODULE_NOT_FOUND: Cannot find module '.../src/roadmap.js'
```

Login was fine (`npm whoami` → `yyfds`). The blocker was the incomplete tree, not npm auth.

## Clean publish (recommended)

1. Delete the old extract and use the **complete** zip (`jagx-cli-3.1.0-publish.zip`).

```bash
cd ~/storage/downloads   # or /storage/emulated/0/Download
rm -rf jagx-cli
unzip jagx-cli-3.1.0-publish.zip
cd jagx-cli
ls src/roadmap.js       # must exist
```

2. Confirm you are logged in:

```bash
npm whoami
# should print: yyfds
# if not:
npm login --auth-type=web
```

3. Run checks yourself (same as prepublishOnly):

```bash
npm test
npm run bench
```

4. Publish (public package):

```bash
npm publish --access public
```

5. Verify:

```bash
npm view jagx-cli version
npx jagx-cli@latest version
```

## Emergency fix (if you keep the old folder)

```bash
cd /path/to/jagx-cli
node scripts/ensure-roadmap.mjs
ls src/roadmap.js
npm test && npm run bench
npm publish --access public
```

## Skip prepublishOnly (not recommended)

Only if tests already passed and the tarball is complete:

```bash
npm publish --access public --ignore-scripts
```

## Name already taken?

If npm says `jagx-cli` is taken, scope it:

```bash
# change package.json "name" to "@yyfds/jagx-cli"
npm publish --access public
```

## Termux tips

- Always `rm -rf jagx-cli` before unzip so you never mix old/partial trees.
- Node ≥ 18 (`node -v`).
- OTP/login: `npm login --auth-type=web` then open the URL in the phone browser.
- `npm whoami` 401 → not logged in.
