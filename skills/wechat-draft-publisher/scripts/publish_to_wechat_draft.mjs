#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import "dotenv/config";
import { markdownToWechatHtml } from "./markdown_to_wechat_html.mjs";

const TOKEN_ENDPOINT = "https://api.weixin.qq.com/cgi-bin/token";
const DRAFT_ADD_ENDPOINT = "https://api.weixin.qq.com/cgi-bin/draft/add";

function parseArgs(argv) {
  const args = {
    appid: "",
    appsecret: "",
    mdFile: "",
    title: "",
    author: "",
    digest: "",
    contentSourceUrl: "",
    thumbMediaId: "",
    needOpenComment: 0,
    onlyFansCanComment: 0,
    safeImageDomain: "",
    theme: "",
    dumpHtml: "",
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const value = argv[i + 1] ?? "";
    if (key === "--dump-html") args.dumpHtml = value;
    if (key === "--appid") args.appid = value;
    if (key === "--appsecret") args.appsecret = value;
    if (key === "--md-file") args.mdFile = value;
    if (key === "--title") args.title = value;
    if (key === "--author") args.author = value;
    if (key === "--digest") args.digest = value;
    if (key === "--content-source-url") args.contentSourceUrl = value;
    if (key === "--thumb-media-id") args.thumbMediaId = value;
    if (key === "--need-open-comment") args.needOpenComment = Number.parseInt(value, 10);
    if (key === "--only-fans-can-comment") args.onlyFansCanComment = Number.parseInt(value, 10);
    if (key === "--safe-image-domain") args.safeImageDomain = value;
    if (key === "--theme") args.theme = value;
    if (key.startsWith("--")) i += 1;
  }
  return args;
}

function assertRequired(args) {
  const required = [
    ["appid", args.appid],
    ["appsecret", args.appsecret],
    ["md-file", args.mdFile],
    ["title", args.title],
    ["thumb-media-id", args.thumbMediaId],
  ];
  for (const [k, v] of required) {
    if (!v) throw new Error(`Missing --${k}`);
  }
  if (![0, 1].includes(args.needOpenComment)) {
    throw new Error("--need-open-comment must be 0 or 1");
  }
  if (![0, 1].includes(args.onlyFansCanComment)) {
    throw new Error("--only-fans-can-comment must be 0 or 1");
  }
}

function mergeWithEnv(args) {
  return {
    ...args,
    appid: args.appid || process.env.WECHAT_APPID || "",
    appsecret: args.appsecret || process.env.WECHAT_APPSECRET || "",
    author: args.author || process.env.WECHAT_AUTHOR || "",
    digest: args.digest || process.env.WECHAT_DIGEST || "",
    contentSourceUrl: args.contentSourceUrl || process.env.WECHAT_CONTENT_SOURCE_URL || "",
    thumbMediaId: args.thumbMediaId || process.env.WECHAT_THUMB_MEDIA_ID || "",
    safeImageDomain: args.safeImageDomain || process.env.WECHAT_SAFE_IMAGE_DOMAIN || "",
    theme: args.theme || process.env.WECHAT_HTML_THEME || "wechat",
  };
}

async function apiGetJson(url) {
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`GET ${url} failed with status ${res.status}`);
  }
  return res.json();
}

async function apiPostJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    throw new Error(`POST ${url} failed with status ${res.status}`);
  }
  return res.json();
}

async function getAccessToken(appid, appsecret) {
  const query = new URLSearchParams({
    grant_type: "client_credential",
    appid,
    secret: appsecret,
  });
  const result = await apiGetJson(`${TOKEN_ENDPOINT}?${query.toString()}`);
  if (!result.access_token) {
    throw new Error(`Failed to get access_token: ${JSON.stringify(result)}`);
  }
  return result.access_token;
}

async function addDraft(accessToken, article) {
  const url = `${DRAFT_ADD_ENDPOINT}?access_token=${encodeURIComponent(accessToken)}`;
  return apiPostJson(url, { articles: [article] });
}

async function main() {
  const cliArgs = parseArgs(process.argv.slice(2));
  const args = mergeWithEnv(cliArgs);

  if (args.dumpHtml) {
    if (!args.mdFile) {
      throw new Error("Missing --md-file (required with --dump-html)");
    }
    const mdPath = path.resolve(args.mdFile);
    const markdown = await fs.readFile(mdPath, "utf8");
    const html = markdownToWechatHtml(markdown, {
      safeImageDomain: args.safeImageDomain,
      theme: args.theme,
    });
    const outPath = path.resolve(args.dumpHtml);
    await fs.writeFile(outPath, html, "utf8");
    process.stdout.write(
      `Wrote HTML (same string as draft API "content"): ${outPath}\n`
    );
    return;
  }

  assertRequired(args);

  const mdPath = path.resolve(args.mdFile);
  const markdown = await fs.readFile(mdPath, "utf8");
  const html = markdownToWechatHtml(markdown, {
    safeImageDomain: args.safeImageDomain,
    theme: args.theme,
  });

  const token = await getAccessToken(args.appid, args.appsecret);
  const article = {
    title: args.title,
    author: args.author,
    digest: args.digest,
    content: html,
    content_source_url: args.contentSourceUrl,
    thumb_media_id: args.thumbMediaId,
    need_open_comment: args.needOpenComment,
    only_fans_can_comment: args.onlyFansCanComment,
  };

  const result = await addDraft(token, article);
  if ((result.errcode ?? 0) !== 0) {
    throw new Error(`Draft API returned error: ${JSON.stringify(result)}`);
  }

  process.stdout.write("Draft published successfully.\n");
  process.stdout.write(`media_id: ${result.media_id ?? ""}\n`);
}

main().catch((error) => {
  process.stderr.write(`Publish failed: ${error.message}\n`);
  process.exitCode = 1;
});
