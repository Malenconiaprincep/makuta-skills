#!/usr/bin/env npx ts-node
/**
 * 打开指定 URL 的网页并截图为 PNG 文件。
 * 用法: npm run screenshot -- <URL> [输出路径]
 * 示例: npm run screenshot -- https://example.com ./screenshot.png
 */

import { chromium } from "playwright";
import * as path from "path";

const DEFAULT_OUTPUT = path.join(process.cwd(), "screenshot.png");

async function main(): Promise<void> {
  const url = process.argv[2];
  const outputPath = process.argv[3] ?? DEFAULT_OUTPUT;

  if (!url) {
    console.error("用法: npm run screenshot -- <URL> [输出路径]");
    process.exit(1);
  }

  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
    await page.screenshot({
      path: outputPath,
      fullPage: true,
    });
    console.log(`截图已保存: ${path.resolve(outputPath)}`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
