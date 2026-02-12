---
name: example-second-skill
description: 示例占位 skill，用于演示「一个项目下可有多个 skills」。新增 skill 时复制此目录并改 name/description。
---

# 示例第二个 Skill

这是一个**占位 skill**，用来说明本项目支持多个 skills：每个 skill 对应 `.cursor/skills/` 下的一个**子目录**。

## 如何新增一个 skill

1. 在 `.cursor/skills/` 下新建目录，如 `my-new-skill/`
2. 在该目录下创建 `SKILL.md`，写好 YAML 头（name、description）和说明正文
3. 若需要可执行逻辑，在 `scripts/my-new-skill/` 下用 TypeScript 实现，并在 SKILL.md 里写清调用方式

无需改任何总配置，Cursor 会自动扫描 `.cursor/skills/` 下所有子目录并加载。
