---
title: Page Object Model Pattern
date: 2025-10-16 23:17:22
categories: [Explorations]
tags: [E2E]
thumbnail: /gallery/thumbnails/playwright.png
---
Every team seems to have its own pattern for writing E2E tests.
Joining a new team made me realise that Page Object Models (POM) are still surprisingly debated.
Why do people argue about it so much? Why is there no standard way?

The truth is: there is no universally agreed best practice for Page Objects in modern E2E testing.

Here’s my perspective after working across Selenium, Cypress, and now Playwright.

## What Page Objects try to solve

At its core, POM tries to address two concerns:

1. Encapsulation – keep UI knowledge and selectors inside page objects
2. Separation of Responsibilities – tests describe behaviour, page objects describe UI interactions

## Selenium: Strict Separation
In Selenium, I used to follow a very rigid pattern: page objects handled only actions and navigation, while assertions lived exclusively in the test files.
```js
SendMoneyPage
  .selectBSB()
  .fillBSBAccount(bsb, accountName, accountNumber)
  .tapCheck() // returns MatchResultPage
  .run((page) => {
      // Assertions ONLY in tests
      expect(page.getContact()).toEqual({});
  })
  .tapContinue(); // returns next page
```
### Rules:
1. Page Objects contain no assertions
2. Page Objects describe behaviour and navigation only
3. Verification logic stays in tests

This may look strange if you’ve never used classic POM, but it follows the principles from Martin Fowler’s original article on [Page Object](https://martinfowler.com/bliki/PageObject.html)

## Cypress: Function-Based helpers
Cypress takes the opposite stance. It discourages Page Objects completely and encourages simple reusable functions:

```js
function fillBSBAccount(bsb: string, accountName: string, accountNumber: string) {
    cy.getByLabel('bsb').type(bsb);
    cy.getByLabel('accountName').type(accountName);
    cy.getByLabel('accountNumber').type(accountNumber);
}
```
Cypress philosophy:
“Just write the story.”
Its fluent command chain makes POM feel unnecessary.

## Playwright: Pragmatic Page Objets
Playwright reintroduces Page Objects, but with a different philosophy.

The key difference:
Playwright has built-in auto-waiting, auto-retry, and strong assertions.

These features fundamentally change how POM should be structured.

## The key realisation

The classic “Separation of Responsibilities” becomes less practical with Playwright.

Example: checking if a button is visible.

A strict POM approach:
```js
expect(page.isButtonVisible()).toBe(true)
```
This is actually worse:

isButtonVisible() doesn’t retry

Assertions on booleans don’t retry

You bypass Playwright’s reliability system

The recommended approach:
```js
expect(page.buttonLocator).toBeVisible(); // Built-in auto-retry
```

Playwright’s documentation emphasises::
> Page objects simplify authoring by creating a higher-level API which suits your application and simplify maintenance by capturing element selectors in one place and create reusable code to avoid repetition.

## So… is "Separation of Responsibilities" still relevant?

Not really.

E2E tests are naturally narrative-driven. They read like stories:

"Log in, click this, expect that."

Cypress embraces this.
Playwright mostly embraces this too, with optional structure via Page Objects.

Encapsulation still matters — grouping selectors and common actions improves readability and maintenance.
But strict, academic POM rules? They matter far less today.

## Final thought

There is no universal “correct” Page Object pattern anymore.
Modern frameworks — especially Playwright — optimise for reliability, not structure.

So instead of asking:

“What is the right Page Object pattern?”

A better question is:

“Why am I using this pattern, and is it helping my tests stay readable, maintainable, and reliable?”

That’s the actual purpose of Page Objects — everything else is just preference.