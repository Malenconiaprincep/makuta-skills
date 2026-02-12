#!/usr/bin/env bash
# 发布 webpage-screenshot skill 到 ClawHub。在项目根目录执行。
set -e
cd "$(dirname "$0")/.."
SKILL_DIR=".cursor/skills/webpage-screenshot"
if [[ ! -f "$SKILL_DIR/SKILL.md" ]]; then
  echo "错误: 未找到 $SKILL_DIR/SKILL.md"
  exit 1
fi
echo "发布目录: $SKILL_DIR"
echo "若未登录会先要求登录。"
clawhub publish "$SKILL_DIR" \
  --slug webpage-screenshot \
  --name "Webpage Screenshot" \
  --version 1.0.0 \
  --changelog "打开指定网页并截图为 PNG" \
  --tags latest \
  "$@"
echo "发布完成。可在 https://clawhub.com 搜索 webpage-screenshot，或用 OpenClaw 执行: clawhub install webpage-screenshot"
