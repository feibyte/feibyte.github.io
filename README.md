# Notion Sync

This repository can sync published posts from a Notion database into the existing Hexo blogs.

## Database fields

- `Name`: title
- `Topic`: optional, appended into tags
- `Tags`: optional multi-select
- `lang`: `zh` or `en`
- `Status`: `Draft`, `Published`, `Archived`

## Environment variables

```bash
export NOTION_TOKEN="secret_xxx"
export NOTION_DATABASE_ID="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

The integration only needs read access to the target database and pages.

## Usage

```bash
npm install
npm run sync:notion:dry-run
npm run sync:notion
```

Synced posts are written to:

- `blog-cn/source/_posts/<page-id>.md`
- `blog-en/source/_posts/<page-id>.md`

Downloaded images are written to:

- `blog-cn/source/notion-assets/<page-id>/`
- `blog-en/source/notion-assets/<page-id>/`

Local sync state is stored in `.notion-sync/manifest.json`.

In GitHub Actions, the sync output and `.notion-sync/manifest.json` should be committed back to the repository so future runs keep stable publish dates and deletion state.

## GitHub Actions

The workflow is defined in `.github/workflows/publish-notion-blog.yml`.

Add these repository secrets before running it:

- `NOTION_TOKEN`
- `NOTION_DATABASE_ID`

Then trigger `Publish Notion Blog` from the Actions tab.
