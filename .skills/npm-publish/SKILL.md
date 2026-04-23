---
name: npm-publish
description: Publish @syndicats/agent-skills to npm. Use when the user asks to publish, release, or push a new version to npm. Handles version bumping, pre-publish checks, build verification, and the actual npm publish command. Also use when the user asks to prepare a release.
---

# npm Publish Workflow

Publish `@syndicats/agent-skills` to the npm registry.

## Pre-flight Checks

Run all checks before publishing. Stop and fix any failures.

1. **Working tree clean** — `git status` must show no uncommitted changes
2. **Build** — run `npm run build` (aliased via `prepublishOnly`, but run explicitly to catch errors early)
3. **Type check** — `npx tsc --noEmit` must pass
4. **CLI smoke test** — `node dist/cli/index.js --version` must print the expected version
5. **Version consistency** — `package.json` version must match `program.version()` in `src/cli/index.ts`
6. **No stale references** — `grep -r "agentskills.in" src/` must return zero results
7. **npm auth** — `npm whoami` must succeed. If it fails, ask the user to run `! npm login`

## Version Bump

Ask the user which bump level to apply: `patch`, `minor`, or `major`.

```bash
npm version <patch|minor|major> --no-git-tag-version
```

Note: `.npmrc` has `git-tag-version=false`, so `npm version` will not create a git tag or commit. After bumping:

1. Update `program.version()` in `src/cli/index.ts` to match the new version
2. Rebuild: `npm run build`
3. Verify: `node dist/cli/index.js --version`

## Publish

```bash
npm publish --access public
```

The `--access public` flag is required for scoped packages (`@syndicats/*`) on first publish. Subsequent publishes don't strictly need it but it's harmless to include.

## Post-publish

1. Commit the version bump:
   ```
   chore: Release v<version>
   ```
2. Create a git tag: `git tag v<version>`
3. Remind the user to push: `git push && git push --tags`
4. Verify on npm: `npm view @syndicats/agent-skills version`
