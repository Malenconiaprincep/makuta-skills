#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import MarkdownIt from "markdown-it";
import hljs from "highlight.js";
import { load } from "cheerio";

const WECHAT_SAFE_IMAGE_DOMAIN_PLACEHOLDER =
  "https://your-wechat-safe-domain.example.com/image";

/**
 * 多套内联主题（公众号对 class + 外链 CSS 支持不稳定，颜色尽量写进 style）
 * - wechat：默认，微信绿点缀
 * - minimal：中性灰，偏文档/说明
 * - calm：蓝系，偏健康/医疗科普
 */
export const HTML_THEMES = {
  wechat: {
    text: "#333333",
    textMuted: "#666666",
    accent: "#07c160",
    heading1: "#1a1a1a",
    heading2: "#2c3e50",
    heading3: "#34495e",
    heading4: "#455a64",
    quoteBg: "#f0f9f4",
    tableHeaderBg: "#e8f5e9",
    thBorder: "#c8e6c9",
    tdBorder: "#e0e0e0",
    codeInlineBg: "#f3f4f6",
    codeInlineFg: "#b91c1c",
    codeBlockBg: "#0f172a",
    codeBlockFg: "#e2e8f0",
    hrBorder: "#e5e5e5",
  },
  minimal: {
    text: "#333333",
    textMuted: "#6b7280",
    accent: "#4b5563",
    heading1: "#111827",
    heading2: "#1f2937",
    heading3: "#374151",
    heading4: "#4b5563",
    quoteBg: "#f9fafb",
    tableHeaderBg: "#f3f4f6",
    thBorder: "#d1d5db",
    tdBorder: "#e5e7eb",
    codeInlineBg: "#f3f4f6",
    codeInlineFg: "#374151",
    codeBlockBg: "#1f2937",
    codeBlockFg: "#e5e7eb",
    hrBorder: "#e5e7eb",
  },
  calm: {
    text: "#333333",
    textMuted: "#546e7a",
    accent: "#1565c0",
    heading1: "#0d47a1",
    heading2: "#1565c0",
    heading3: "#1976d2",
    heading4: "#1e88e5",
    quoteBg: "#e3f2fd",
    tableHeaderBg: "#bbdefb",
    thBorder: "#90caf9",
    tdBorder: "#e3f2fd",
    codeInlineBg: "#e8eaf6",
    codeInlineFg: "#c62828",
    codeBlockBg: "#0d1b2a",
    codeBlockFg: "#e3f2fd",
    hrBorder: "#bbdefb",
  },
};

export function resolveHtmlTheme(themeId = "wechat") {
  const id = typeof themeId === "string" && themeId ? themeId : "wechat";
  const theme = HTML_THEMES[id];
  if (!theme) {
    const names = Object.keys(HTML_THEMES).join(", ");
    throw new Error(`Unknown theme "${themeId}". Available: ${names}`);
  }
  return { id, ...theme };
}

function parseArgs(argv) {
  const args = {
    mdFile: "",
    outFile: "",
    safeImageDomain: WECHAT_SAFE_IMAGE_DOMAIN_PLACEHOLDER,
    theme: "",
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      args.help = true;
      continue;
    }
    if (token === "--md-file") {
      args.mdFile = argv[++i] ?? "";
      continue;
    }
    if (token === "--out-file") {
      args.outFile = argv[++i] ?? "";
      continue;
    }
    if (token === "--safe-image-domain") {
      args.safeImageDomain = argv[++i] ?? "";
      continue;
    }
    if (token === "--theme") {
      args.theme = argv[++i] ?? "";
    }
  }

  return args;
}

function defaultOutPath(mdPath) {
  const dir = path.dirname(mdPath);
  const base = path.basename(mdPath, path.extname(mdPath));
  return path.join(dir, `${base}.wechat.html`);
}

function escapeHtml(raw) {
  return raw
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function rewriteImageSrc(src, safeImageDomain) {
  if (!src) return src;
  const normalizedSrc = src.startsWith("//") ? `https:${src}` : src;
  if (!/^https?:\/\//i.test(normalizedSrc)) return src;

  if (normalizedSrc.startsWith(safeImageDomain)) return normalizedSrc;

  const glue = safeImageDomain.includes("?") ? "&" : "?";
  return `${safeImageDomain}${glue}url=${encodeURIComponent(normalizedSrc)}`;
}

function buildMarkdownIt(theme) {
  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    highlight(code, lang) {
      const langName = lang && hljs.getLanguage(lang) ? lang : "plaintext";
      const highlighted = hljs.highlight(code, { language: langName }).value;
      return `<pre style="background:${theme.codeBlockBg};color:${theme.codeBlockFg};padding:12px 14px;border-radius:8px;overflow:auto;border-left:4px solid ${theme.accent};"><code class="hljs language-${langName}" style="font-family:Menlo,Consolas,monospace;font-size:13px;line-height:1.6;">${highlighted}</code></pre>`;
    },
  });

  const defaultImageRule =
    md.renderer.rules.image ??
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.attrSet(
      "style",
      "max-width:100%;height:auto;border-radius:6px;display:block;margin:12px auto;"
    );
    token.attrSet("referrerpolicy", "no-referrer");
    return defaultImageRule(tokens, idx, options, env, self);
  };

  md.renderer.rules.table_open = () =>
    `<table style="width:100%;border-collapse:collapse;table-layout:fixed;margin:14px 0;font-size:14px;line-height:1.6;color:${theme.text};">`;
  md.renderer.rules.th_open = () =>
    `<th style="border:1px solid ${theme.thBorder};background:${theme.tableHeaderBg};color:${theme.heading2};padding:8px 10px;text-align:left;word-break:break-word;font-weight:600;">`;
  md.renderer.rules.td_open = () =>
    `<td style="border:1px solid ${theme.tdBorder};padding:8px 10px;word-break:break-word;color:${theme.text};">`;
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer nofollow");
    token.attrSet(
      "style",
      `color:${theme.accent};text-decoration:underline;font-weight:500;`
    );
    return self.renderToken(tokens, idx, options);
  };

  const headingOpen =
    md.renderer.rules.heading_open ??
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    const tag = token.tag;
    const styles = {
      h1: `font-size:22px;font-weight:700;color:${theme.heading1};margin:24px 0 16px;line-height:1.35;`,
      h2: `font-size:19px;font-weight:700;color:${theme.heading2};margin:22px 0 12px;line-height:1.4;`,
      h3: `font-size:17px;font-weight:600;color:${theme.heading3};margin:18px 0 10px;line-height:1.45;border-left:4px solid ${theme.accent};padding-left:10px;`,
      h4: `font-size:16px;font-weight:600;color:${theme.heading4};margin:16px 0 8px;`,
      h5: `font-size:15px;font-weight:600;color:${theme.textMuted};margin:14px 0 6px;`,
      h6: `font-size:15px;font-weight:600;color:${theme.textMuted};margin:12px 0 6px;`,
    };
    token.attrSet("style", styles[tag] ?? styles.h4);
    return headingOpen(tokens, idx, options, env, self);
  };

  const paragraphOpen =
    md.renderer.rules.paragraph_open ??
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.paragraph_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.attrSet(
      "style",
      `margin:12px 0;font-size:16px;line-height:1.75;color:${theme.text};`
    );
    return paragraphOpen(tokens, idx, options, env, self);
  };

  const bqOpen =
    md.renderer.rules.blockquote_open ??
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.blockquote_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.attrSet(
      "style",
      `margin:14px 0;padding:14px 16px;border-left:4px solid ${theme.accent};background:${theme.quoteBg};color:${theme.text};font-size:15px;line-height:1.75;border-radius:0 8px 8px 0;`
    );
    return bqOpen(tokens, idx, options, env, self);
  };

  const bulletOpen =
    md.renderer.rules.bullet_list_open ??
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.bullet_list_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.attrSet(
      "style",
      `margin:12px 0;padding-left:1.15em;line-height:1.75;color:${theme.text};`
    );
    return bulletOpen(tokens, idx, options, env, self);
  };

  const orderedOpen =
    md.renderer.rules.ordered_list_open ??
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.ordered_list_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.attrSet(
      "style",
      `margin:12px 0;padding-left:1.25em;line-height:1.75;color:${theme.text};`
    );
    return orderedOpen(tokens, idx, options, env, self);
  };

  const liOpen =
    md.renderer.rules.list_item_open ??
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.list_item_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.attrSet("style", "margin:6px 0;");
    return liOpen(tokens, idx, options, env, self);
  };

  const strongOpen =
    md.renderer.rules.strong_open ??
    ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options));
  md.renderer.rules.strong_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];
    token.attrSet("style", `font-weight:700;color:${theme.heading2};`);
    return strongOpen(tokens, idx, options, env, self);
  };

  md.renderer.rules.code_inline = (tokens, idx) => {
    const token = tokens[idx];
    return `<code style="background:${theme.codeInlineBg};color:${theme.codeInlineFg};padding:2px 6px;border-radius:4px;font-size:14px;font-family:Menlo,Consolas,monospace;">${escapeHtml(token.content)}</code>`;
  };

  md.renderer.rules.hr = () =>
    `<hr style="border:none;border-top:1px solid ${theme.hrBorder};margin:22px 0;" />\n`;

  return md;
}

/**
 * GFM 任务列表 `- [ ]` 在 markdown-it 默认下会原样输出成正文里的 `[ ]`；
 * 公众号编辑器也不可靠支持 <input type="checkbox">。这里把行首的 [ ] / [x] 换成 Unicode 方框 + 内联样式。
 */
function applyWechatTaskListMarkers($, theme) {
  const taskRe = /^\s*\[\s*([xX]?)\s*\]\s*/;
  $("li").each((_, el) => {
    const $li = $(el);
    const $p = $li.children("p").first();
    const $target = $p.length ? $p : $li;
    const html = $target.html();
    if (!html || !taskRe.test(html)) return;
    const m = html.match(taskRe);
    if (!m) return;
    const checked = Boolean(m[1]);
    const marker = checked
      ? `<span style="display:inline-block;margin-right:6px;color:${theme.accent};font-size:18px;line-height:1;vertical-align:-2px;">☑</span>`
      : `<span style="display:inline-block;margin-right:6px;color:${theme.textMuted};font-size:18px;line-height:1;vertical-align:-2px;">☐</span>`;
    $target.html(html.replace(taskRe, marker));
    $li.attr("data-wechat-task", "1");
  });

  $("ul, ol").each((_, u) => {
    const $list = $(u);
    const $lis = $list.children("li");
    if (!$lis.length) return;
    const allTask = $lis.toArray().every((li) => $(li).attr("data-wechat-task") === "1");
    if (allTask) {
      const prev = $list.attr("style") || "";
      $list.attr(
        "style",
        `${prev}${prev ? ";" : ""}list-style:none;padding-left:0;margin:12px 0;`
      );
    }
  });

  $("[data-wechat-task]").removeAttr("data-wechat-task");
}

/**
 * 公众号对原生 <ul>/<ol>/<li> 支持差：改成「一块外层 + 多条内层 <p>」，无序加「• 」，有序加「1. 」「2. 」…
 * 不能用外层 <p> 包内层 <p>（非法 HTML，解析器会拆碎）；外层用 <div>，样式与段落块一致。
 */
function convertListsToNestedParagraphs($, theme) {
  const outerStyle = `margin:12px 0;font-size:16px;line-height:1.75;color:${theme.text};`;
  const innerStyle = `margin:4px 0;font-size:16px;line-height:1.75;color:${theme.text};`;

  while (true) {
    const leaves = $("ul, ol").filter(
      (_, el) => $(el).find("ul, ol").length === 0
    );
    if (!leaves.length) break;

    leaves.each((_, el) => {
      const $list = $(el);
      const tag = (el.tagName || "").toLowerCase();
      let body = "";

      if (tag === "ul") {
        $list.children("li").each((__, li) => {
          const inner = $(li).html() ?? "";
          body += `<p style="${innerStyle}">• ${inner}</p>`;
        });
      } else {
        let n = 0;
        $list.children("li").each((__, li) => {
          n += 1;
          const inner = $(li).html() ?? "";
          body += `<p style="${innerStyle}">${n}. ${inner}</p>`;
        });
      }

      $list.replaceWith(`<div style="${outerStyle}">${body}</div>`);
    });
  }
}

function sanitizeAndAdapt(html, safeImageDomain, theme) {
  const $ = load(html, { decodeEntities: false });

  // 草稿/图文已有「标题」字段，正文里首个 # 会与顶栏重复，去掉首个 <h1>
  const $firstH1 = $("h1").first();
  if ($firstH1.length) {
    const $after = $firstH1.next();
    $firstH1.remove();
    const tag = ($after[0]?.tagName || "").toLowerCase();
    if (tag === "hr") $after.remove();
  }

  $("script,iframe,object,embed,style,link").remove();

  $("[src]").each((_, el) => {
    const current = $(el).attr("src");
    const next = rewriteImageSrc(current ?? "", safeImageDomain);
    if (next) $(el).attr("src", next);
  });

  $("table").each((_, table) => {
    if ($(table).parent().hasClass("wechat-table-wrapper")) return;
    $(table).wrap(
      '<div class="wechat-table-wrapper" style="width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;"></div>'
    );
  });

  $("*").each((_, node) => {
    const attrs = node.attribs || {};
    Object.keys(attrs).forEach((name) => {
      if (name.toLowerCase().startsWith("on")) {
        $(node).removeAttr(name);
      }
    });
  });

  $("blockquote p").each((_, el) => {
    const $p = $(el);
    const prev = $p.attr("style") || "";
    $p.attr(
      "style",
      `${prev}${prev ? ";" : ""}margin:6px 0;color:${theme.text};`
    );
  });

  applyWechatTaskListMarkers($, theme);
  convertListsToNestedParagraphs($, theme);

  const inner = $("body").html() ?? $.root().html() ?? "";
  return `<section style="font-size:16px;line-height:1.75;color:${theme.text};max-width:100%;box-sizing:border-box;">${inner}</section>`;
}

export function markdownToWechatHtml(markdown, options = {}) {
  const safeImageDomain =
    options.safeImageDomain || WECHAT_SAFE_IMAGE_DOMAIN_PLACEHOLDER;
  const theme = resolveHtmlTheme(options.theme);
  const md = buildMarkdownIt(theme);
  const rendered = md.render(markdown);
  return sanitizeAndAdapt(rendered, safeImageDomain, theme);
}

async function runCli() {
  const parsed = parseArgs(process.argv.slice(2));

  if (parsed.help) {
    process.stdout.write(`Usage: node markdown_to_wechat_html.mjs [options]

Options:
  --md-file <path>           Input Markdown (default: test.md in cwd)
  --out-file <path>          Output HTML (default: <name>.wechat.html next to input)
  --safe-image-domain <url>  WeChat-safe image proxy base URL
  --theme <name>             HTML style preset: wechat | minimal | calm (default: wechat)
  -h, --help                 Show this help

Examples:
  node markdown_to_wechat_html.mjs
  node markdown_to_wechat_html.mjs --theme calm --md-file test.md --out-file preview.html
`);
    return;
  }

  const mdPath = path.resolve(parsed.mdFile || "test.md");
  const outputPath = path.resolve(parsed.outFile || defaultOutPath(mdPath));

  try {
    await fs.access(mdPath);
  } catch {
    throw new Error(
      `Markdown file not found: ${mdPath}\n` +
        "Pass --md-file <path> or create test.md in the current directory."
    );
  }

  const markdown = await fs.readFile(mdPath, "utf8");
  const html = markdownToWechatHtml(markdown, {
    safeImageDomain: parsed.safeImageDomain,
    theme: parsed.theme || "wechat",
  });
  await fs.writeFile(outputPath, html, "utf8");
  process.stdout.write(`Generated: ${outputPath}\n`);
}

const isMainModule =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  runCli().catch((error) => {
    process.stderr.write(`Convert failed: ${escapeHtml(String(error.message))}\n`);
    process.exitCode = 1;
  });
}
