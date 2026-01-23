---
title: Two TypeScript Config Issues I Recently Hit
date: 2026-01-23 18:49:49
categories: [Explorations]
tags: [FE]
thumbnail: /gallery/thumbnails/typescript.png
---


Recently I ran into two TypeScript configuration issues, so I’m sharing them here in case they save someone else a few hours of head-scratching.

## 1. Types: Vitest vs Jasmine

We’re in the process of migrating our tests from Karma (Jasmine) to Vitest.

At some point, I removed this line from one of my Vitest test files:

`import '@testing-library/jasmine-dom';`


Immediately, tons of lint and type errors popped up, all complaining that describe (and friends) could not be found.

This felt wrong — Vitest tests don’t use Jasmine at all, so why would removing a Jasmine import break things?

### Our TS setup

We have three TypeScript config files:

- `tsconfig.json`
→ base config, also used by the IDE (Cursor / VS Code)

- `tsconfig.app.json`
→ referenced by tsconfig.json, used by the app

- `tsconfig.eslint.json`
→ used by ESLint

- `tsconfig.spec.json`
→ used by Karma tests

This distinction is important:

❌ Type errors during yarn lint
→ problem is in `tsconfig.eslint.json`

❌ Type errors shown in the IDE
→ problem is in `tsconfig.json` (this is what the IDE uses by default)

### Fixing the lint issue

For linting, the fix was straightforward. Since we currently have both Jasmine and Vitest in the codebase, ESLint still needs to know about Jasmine globals:   
```
env: {
  jasmine: true,
}
```

That alone fixed the lint errors.

Fixing the type issue

The type errors were caused by this setting:

```"types": []```


When types is explicitly set, TypeScript stops auto-including global types. So we must add Vitest globals back manually:

```"types": ["vitest/globals", "node"]```


Additionally, we had to update typeRoots:

```"typeRoots": ["./node_modules", "./node_modules/@types"]```


Why?
Because the default is only `node_modules/@types`, but not all type definitions actually live there. Vitest’s types are under `node_modules`, so without this change, TypeScript simply couldn’t see them.

## 2. Paths: tsconfig.paths vs Yarn Workspaces

The second issue was related to path resolution, and it showed up only in Karma tests.

We have a library called ui-lib.

In TS files, this works fine:

`import { something } from 'ui-lib/directive';`


In global.scss, this also works:

`@import 'ui-lib/directive/directive.scss';`


But when running **Karma tests**, it failed with an error saying the SCSS path couldn’t be resolved.

### The real cause

We had paths configured in tsconfig for ui-lib.

The problem is:
👉 `tsconfig.paths` is only understood by the **TypeScript compiler**, not by Karma, Sass, or other tooling unless explicitly wired up.

So Karma had no idea how to resolve that SCSS path.

Do we even need `tsconfig.paths`?

We’re using **Nx + Yarn workspaces**, which already handle package resolution very well.

So the question became: do we actually need `tsconfig.paths` here?

Answer: no.

If Yarn workspaces are working properly, you usually don’t need `tsconfig.paths` for internal packages.

There are valid use cases for `paths`, for example:

Creating an alias like `@utils` that points to a folder inside `src`

Aliases that are not real packages

But for workspace libraries like `ui-lib`, `paths` just add unnecessary complexity.

### The fix

Stick with Yarn workspace resolution

Remove unnecessary `tsconfig.paths`

Update `ui-lib`’s exports field to correctly expose the paths we need

Once that was done, the SCSS resolution issue disappeared — in Karma and everywhere else.

## Final takeaway

Be very clear about which TS config is used by which tool

If Yarn workspaces already solve the problem, don’t fight them

Hope this helps someone else avoid the same traps 🙂