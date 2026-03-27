---
name: wechat-draft-publisher
description: Publish Markdown content to WeChat Official Account drafts by fetching access_token with appid/appsecret and calling the draft add API. Use when user asks to send markdown, article content, or posts into WeChat draft box.
---

# WeChat Draft Publisher

## Purpose

Convert a local Markdown file into HTML content and publish it into a WeChat Official Account draft via API.

## When To Use

- User asks to send `.md` content to WeChat drafts
- User mentions `appid`, `appsecret`, `access_token`, or WeChat draft APIs
- User wants scriptable publishing workflow for公众号草稿箱

## Quick Workflow

1. Prepare required fields:
   - `appid`
   - `appsecret`
   - `thumb_media_id` (already uploaded permanent media id)
   - `title`
   - Markdown file path
2. Run the utility script (Node.js):

```bash
cd skills/wechat-draft-publisher/scripts
npm install
npm run publish -- \
  --md-file "../../../article.md" \
  --title "文章标题" \
  --thumb-media-id "YOUR_THUMB_MEDIA_ID"
```

You can also use `.env` in `scripts` directory:

```bash
cp .env.example .env
# fill your real values in .env
npm run publish -- \
  --md-file "../../../article.md" \
  --title "文章标题"
```

Command line args take priority over `.env` values.

To debug what gets sent as `content` without calling the API, dump the exact HTML string:

```bash
npm run publish -- \
  --dump-html ./draft-content.html \
  --md-file "./test-bp-diary.md" \
  --theme minimal
```

(`WECHAT_SAFE_IMAGE_DOMAIN` from `.env` still applies to image URLs in the dump.)

3. Script does:
   - get `access_token` from `cgi-bin/token`
   - convert Markdown to HTML
   - call `cgi-bin/draft/add`
   - print returned `media_id`

## Markdown-it Converter (WeChat Adapted)

If you need full control over HTML structure, use the Node converter:

```bash
cd skills/wechat-draft-publisher/scripts
npm install
npm run convert -- \
  --md-file "../../../article.md" \
  --out-file "../../../article.wechat.html" \
  --safe-image-domain "https://your-wechat-safe-domain.example.com/image"
```

Quick local preview: put `test.md` in `scripts`, then run `npm run convert` (no args). It reads `test.md` and writes `test.wechat.html` next to it. Use `npm run convert -- --theme calm` to try another preset styles (`wechat`, `minimal`, `calm`). Use `npm run convert -- --help` for options.

This converter uses:
- `markdown-it` with custom render rules
- code block highlight (`highlight.js`)
- post-render cleanup/adaptation for WeChat editor:
  - rewrite image URLs to your configured safe domain format
  - wrap tables for horizontal scroll and add WeChat-friendly inline styles
  - remove potentially unsafe tags and inline event handlers

## Required Notes

- The account must have API permissions for draft operations.
- `thumb_media_id` must be valid and usable by the same公众号.
- Markdown conversion depends on npm packages:
  - `markdown-it`
  - `highlight.js`
  - `cheerio`

## Common Options

- `--digest`: Article summary
- `--content-source-url`: Original link
- `--need-open-comment`: `0` or `1`
- `--only-fans-can-comment`: `0` or `1`
- Env fallback:
  - `WECHAT_APPID`
  - `WECHAT_APPSECRET`
  - `WECHAT_AUTHOR`
  - `WECHAT_DIGEST`
  - `WECHAT_CONTENT_SOURCE_URL`
  - `WECHAT_THUMB_MEDIA_ID`
  - `WECHAT_SAFE_IMAGE_DOMAIN`
  - `WECHAT_HTML_THEME` (`wechat` \| `minimal` \| `calm`; overridable with `--theme`)

## Additional Resource

- API details and request schema: [reference.md](reference.md)

## Cursor Agent Skills

This skill lives at `skills/wechat-draft-publisher/` (repo root), not under `.cursor/`. If you want Cursor to auto-load it as a project skill, either add a symlink from `.cursor/skills/` to this folder, or register the skill path in Cursor settings so it points at `skills/wechat-draft-publisher/SKILL.md`.
