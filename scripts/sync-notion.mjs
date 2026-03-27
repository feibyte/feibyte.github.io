import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import { Client } from "@notionhq/client";

const ROOT_DIR = process.cwd();
const MANIFEST_PATH = path.join(ROOT_DIR, ".notion-sync", "manifest.json");
const POSTS_ROOT = {
  zh: path.join(ROOT_DIR, "blog-cn", "source", "_posts"),
  en: path.join(ROOT_DIR, "blog-en", "source", "_posts"),
};
const ASSETS_ROOT = {
  zh: path.join(ROOT_DIR, "blog-cn", "source", "notion-assets"),
  en: path.join(ROOT_DIR, "blog-en", "source", "notion-assets"),
};
const PAGE_SIZE = 100;
const MAX_HEADING_DEPTH = 3;

const args = new Set(process.argv.slice(2));
const isDryRun = args.has("--dry-run");

const notionToken = process.env.NOTION_TOKEN;
const notionDatabaseId = process.env.NOTION_DATABASE_ID;

if (!notionToken || !notionDatabaseId) {
  console.error("Missing NOTION_TOKEN or NOTION_DATABASE_ID.");
  process.exit(1);
}

const notion = new Client({ auth: notionToken });

async function main() {
  const manifest = await loadManifest();
  const pages = await queryAllPages();
  const publishedPageIds = new Set();

  for (const page of pages) {
    const status = getStatus(page);
    if (status !== "Published") {
      if (manifest.pages[page.id]) {
        await removeSyncedPage(manifest, page.id, `status=${status.toLowerCase()}`);
      }
      continue;
    }

    const lang = getLang(page);
    if (!lang) {
      console.warn(`Skipping ${page.id}: missing or unsupported lang.`);
      continue;
    }

    publishedPageIds.add(page.id);
    await syncPublishedPage(manifest, page, lang);
  }

  for (const pageId of Object.keys(manifest.pages)) {
    if (!publishedPageIds.has(pageId) && manifest.pages[pageId].status === "Published") {
      await removeSyncedPage(manifest, pageId, "page no longer returned from database");
    }
  }

  await saveManifest(manifest);
}

async function queryAllPages() {
  const pages = [];
  let cursor;

  while (true) {
    const response = await notion.databases.query({
      database_id: notionDatabaseId,
      page_size: PAGE_SIZE,
      start_cursor: cursor,
    });

    pages.push(...response.results);

    if (!response.has_more || !response.next_cursor) {
      break;
    }

    cursor = response.next_cursor;
  }

  return pages;
}

async function syncPublishedPage(manifest, page, lang) {
  const pageId = page.id;
  const title = getTitle(page);

  if (!title) {
    console.warn(`Skipping ${pageId}: missing Name title.`);
    return;
  }

  const bodyBlocks = await fetchAllBlocks(pageId);
  const assetDir = path.join(ASSETS_ROOT[lang], pageId);
  const markdown = await blocksToMarkdown({
    blocks: bodyBlocks,
    assetDir,
    assetUrlBase: `/notion-assets/${pageId}`,
  });

  const existing = manifest.pages[pageId] ?? {};
  const publishDate = existing.publishDate ?? page.created_time ?? new Date().toISOString();
  const updated = page.last_edited_time;
  const category = getSingleValue(page.properties.Category);
  const topic = getSingleValue(page.properties.Topic);
  const tags = getMultiValues(page.properties.Tags);
  const frontmatter = buildFrontmatter({
    title,
    date: publishDate,
    updated,
    categories: compact([category]),
    tags: compact(topic ? [topic, ...tags] : tags),
    notionPageId: pageId,
  });
  const filePath = path.join(POSTS_ROOT[lang], `${pageId}.md`);

  if (!isDryRun) {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.mkdir(assetDir, { recursive: true });
    await fs.writeFile(filePath, `${frontmatter}\n${markdown.trim()}\n`, "utf8");
  }

  manifest.pages[pageId] = {
    filePath: path.relative(ROOT_DIR, filePath),
    lang,
    notionTitle: title,
    publishDate,
    status: "Published",
    updated,
  };

  console.log(`${isDryRun ? "[dry-run] " : ""}synced ${pageId} -> ${manifest.pages[pageId].filePath}`);
}

async function removeSyncedPage(manifest, pageId, reason) {
  const entry = manifest.pages[pageId];
  if (!entry) {
    return;
  }

  const filePath = path.join(ROOT_DIR, entry.filePath);
  const assetDir = path.join(ASSETS_ROOT[entry.lang], pageId);

  if (!isDryRun) {
    await fs.rm(filePath, { force: true });
    await fs.rm(assetDir, { force: true, recursive: true });
  }

  delete manifest.pages[pageId];
  console.log(`${isDryRun ? "[dry-run] " : ""}removed ${pageId} (${reason})`);
}

async function fetchAllBlocks(blockId) {
  const blocks = [];
  let cursor;

  while (true) {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: PAGE_SIZE,
      start_cursor: cursor,
    });

    blocks.push(...response.results);

    if (!response.has_more || !response.next_cursor) {
      break;
    }

    cursor = response.next_cursor;
  }

  return blocks;
}

async function blocksToMarkdown({ blocks, assetDir, assetUrlBase, depth = 0 }) {
  const chunks = [];

  for (const block of blocks) {
    const rendered = await renderBlock(block, { assetDir, assetUrlBase, depth });
    if (rendered) {
      chunks.push(rendered);
    }
  }

  return chunks.join("\n\n").replace(/\n{3,}/g, "\n\n");
}

async function renderBlock(block, context) {
  switch (block.type) {
    case "paragraph":
      return richTextToMarkdown(block.paragraph.rich_text);
    case "heading_1":
      return `${"#".repeat(Math.min(context.depth + 1, MAX_HEADING_DEPTH))} ${richTextToMarkdown(block.heading_1.rich_text)}`;
    case "heading_2":
      return `${"#".repeat(Math.min(context.depth + 2, MAX_HEADING_DEPTH))} ${richTextToMarkdown(block.heading_2.rich_text)}`;
    case "heading_3":
      return `${"#".repeat(Math.min(context.depth + 3, MAX_HEADING_DEPTH))} ${richTextToMarkdown(block.heading_3.rich_text)}`;
    case "bulleted_list_item":
      return renderListItem(block, context, "-");
    case "numbered_list_item":
      return renderListItem(block, context, "1.");
    case "to_do": {
      const prefix = block.to_do.checked ? "- [x]" : "- [ ]";
      const text = richTextToMarkdown(block.to_do.rich_text);
      return `${"  ".repeat(context.depth)}${prefix} ${text}`.trimEnd();
    }
    case "toggle":
      return renderToggle(block, context);
    case "quote":
      return richTextToMarkdown(block.quote.rich_text)
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
    case "callout":
      return `> ${richTextToMarkdown(block.callout.rich_text)}`;
    case "divider":
      return "---";
    case "code":
      return renderCodeBlock(block.code.rich_text, block.code.language);
    case "image":
      return renderImage(block, context);
    case "bookmark":
      return block.bookmark.url;
    case "embed":
      return block.embed.url;
    case "video":
      return renderMediaLink(block.video, "Video");
    case "file":
      return renderMediaLink(block.file, "File");
    case "equation":
      return `$$${block.equation.expression}$$`;
    case "table_of_contents":
      return "<!-- toc -->";
    case "child_page":
      return `## ${block.child_page.title}`;
    default:
      if (block.has_children) {
        const childBlocks = await fetchAllBlocks(block.id);
        return blocksToMarkdown({
          blocks: childBlocks,
          assetDir: context.assetDir,
          assetUrlBase: context.assetUrlBase,
          depth: context.depth + 1,
        });
      }
      return "";
  }
}

async function renderListItem(block, context, marker) {
  const richText = block[block.type].rich_text;
  const line = `${"  ".repeat(context.depth)}${marker} ${richTextToMarkdown(richText)}`.trimEnd();

  if (!block.has_children) {
    return line;
  }

  const childBlocks = await fetchAllBlocks(block.id);
  const nested = await blocksToMarkdown({
    blocks: childBlocks,
    assetDir: context.assetDir,
    assetUrlBase: context.assetUrlBase,
    depth: context.depth + 1,
  });

  return `${line}\n${nested}`;
}

async function renderToggle(block, context) {
  const summary = richTextToMarkdown(block.toggle.rich_text);
  if (!block.has_children) {
    return `<details><summary>${escapeHtml(summary)}</summary></details>`;
  }

  const childBlocks = await fetchAllBlocks(block.id);
  const content = await blocksToMarkdown({
    blocks: childBlocks,
    assetDir: context.assetDir,
    assetUrlBase: context.assetUrlBase,
    depth: context.depth + 1,
  });

  return `<details><summary>${escapeHtml(summary)}</summary>\n\n${content}\n\n</details>`;
}

async function renderImage(block, context) {
  const image = block.image;
  const sourceUrl = image.type === "external" ? image.external.url : image.file.url;
  const caption = richTextToMarkdown(image.caption);
  const extension = guessExtension(sourceUrl);
  const fileName = `${block.id}${extension}`;
  const absoluteAssetPath = path.join(context.assetDir, fileName);
  const assetUrl = `${context.assetUrlBase}/${fileName}`;

  if (!isDryRun) {
    await fs.mkdir(context.assetDir, { recursive: true });
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to download image ${sourceUrl}: ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    await fs.writeFile(absoluteAssetPath, buffer);
  }

  const altText = caption || "image";
  return `![${escapeMarkdown(altText)}](${assetUrl})`;
}

function renderMediaLink(file, label) {
  const sourceUrl = file.type === "external" ? file.external.url : file.file.url;
  return `[${label}](${sourceUrl})`;
}

function renderCodeBlock(richText, language) {
  const content = richText.map((item) => item.plain_text).join("");
  return `\`\`\`${language === "plain text" ? "" : language}\n${content}\n\`\`\``;
}

function richTextToMarkdown(richText = []) {
  return richText
    .map((item) => {
      const text = item.plain_text ?? "";
      if (item.type === "equation") {
        return `$${item.equation.expression}$`;
      }
      if (item.type !== "text") {
        return text;
      }

      let value = escapeMarkdown(text);
      const { annotations, href } = item;

      if (annotations.code) {
        value = `\`${value}\``;
      }
      if (annotations.bold) {
        value = `**${value}**`;
      }
      if (annotations.italic) {
        value = `*${value}*`;
      }
      if (annotations.strikethrough) {
        value = `~~${value}~~`;
      }
      if (annotations.underline) {
        value = `<u>${value}</u>`;
      }
      if (href ?? item.text.link?.url) {
        value = `[${value}](${href ?? item.text.link.url})`;
      }
      return value;
    })
    .join("");
}

function buildFrontmatter({ title, date, updated, categories, tags, notionPageId }) {
  const lines = ["---"];
  lines.push(`title: ${quoteYaml(title)}`);
  lines.push(`date: ${formatHexoDate(date)}`);
  lines.push(`updated: ${formatHexoDate(updated)}`);

  if (categories.length > 0) {
    lines.push(`categories: [${categories.map(quoteYamlInline).join(", ")}]`);
  }
  if (tags.length > 0) {
    lines.push(`tags: [${tags.map(quoteYamlInline).join(", ")}]`);
  }

  lines.push(`notion_page_id: ${quoteYamlInline(notionPageId)}`);
  lines.push("---");
  return lines.join("\n");
}

async function loadManifest() {
  try {
    const content = await fs.readFile(MANIFEST_PATH, "utf8");
    return JSON.parse(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      return { pages: {} };
    }
    throw error;
  }
}

async function saveManifest(manifest) {
  if (isDryRun) {
    return;
  }

  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true });
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

function getTitle(page) {
  const property = page.properties.Name;
  if (!property || property.type !== "title") {
    return "";
  }
  return property.title.map((item) => item.plain_text).join("").trim();
}

function getStatus(page) {
  const property = page.properties.Status;
  if (!property) {
    return "";
  }

  if (property.type === "status") {
    return property.status?.name ?? "";
  }
  if (property.type === "select") {
    return property.select?.name ?? "";
  }
  return "";
}

function getLang(page) {
  const property = page.properties.lang;
  const value = getSingleValue(property)?.toLowerCase();
  if (value === "zh" || value === "en") {
    return value;
  }
  return "";
}

function getSingleValue(property) {
  if (!property) {
    return "";
  }

  switch (property.type) {
    case "select":
      return property.select?.name ?? "";
    case "status":
      return property.status?.name ?? "";
    case "rich_text":
      return property.rich_text.map((item) => item.plain_text).join("").trim();
    case "title":
      return property.title.map((item) => item.plain_text).join("").trim();
    default:
      return "";
  }
}

function getMultiValues(property) {
  if (!property) {
    return [];
  }

  if (property.type === "multi_select") {
    return property.multi_select.map((item) => item.name).filter(Boolean);
  }

  return [];
}

function compact(values) {
  return values.filter(Boolean);
}

function formatHexoDate(value) {
  return new Date(value).toISOString().slice(0, 19).replace("T", " ");
}

function quoteYaml(value) {
  return JSON.stringify(value ?? "");
}

function quoteYamlInline(value) {
  return JSON.stringify(value ?? "");
}

function escapeMarkdown(value) {
  return value.replace(/([\\`*_{}\[\]()#+\-.!])/g, "\\$1");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function guessExtension(url) {
  try {
    const pathname = new URL(url).pathname;
    const extension = path.extname(pathname);
    if (extension) {
      return extension;
    }
  } catch {
    return ".png";
  }
  return ".png";
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
