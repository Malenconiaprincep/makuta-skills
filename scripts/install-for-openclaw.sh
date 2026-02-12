#!/usr/bin/env bash
# 把本仓库 .cursor/skills/ 下的所有 skills 复制到 OpenClaw 的 skills 目录，便于在 OpenClaw 中使用。
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE="$REPO_ROOT/.cursor/skills"
TARGET="${OPENCLAW_SKILLS_DIR:-$HOME/.openclaw/skills}"

if [[ ! -d "$SOURCE" ]]; then
  echo "错误: 未找到 $SOURCE"
  exit 1
fi

mkdir -p "$TARGET"
for dir in "$SOURCE"/*/; do
  name=$(basename "$dir")
  if [[ -f "$dir/SKILL.md" ]]; then
    cp -R "$dir" "$TARGET/"
    echo "已安装: $name -> $TARGET/$name"
  fi
done
echo "完成。OpenClaw skills 目录: $TARGET"
