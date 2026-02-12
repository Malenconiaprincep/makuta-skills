# Makuta Skills

Cursor / OpenClaw 可用的 Agent Skills 项目，使用 **TypeScript** 编写脚本，**一个仓库里放多个 skills**。

## 多 Skill 结构说明

每个 skill = **一个子目录**，Cursor 会扫描 `.cursor/skills/` 下**所有**子目录并加载，没有数量限制。

```
makuta-skills/
├── package.json
├── tsconfig.json
├── .cursor/
│   └── skills/                    # 所有 skill 都在这里，每个子目录一个
│       ├── webpage-screenshot/    # skill 1
│       │   └── SKILL.md
│       ├── example-second-skill/  # skill 2（占位示例）
│       │   └── SKILL.md
│       └── (继续在这里加新目录…)  # skill 3, 4, …
├── scripts/                       # 各 skill 的可执行脚本（按需）
│   ├── webpage-screenshot/
│   │   └── capture.ts
│   └── (其他 skill 的脚本…)
├── dist/
└── README.md
```

- **新增一个 skill**：在 `.cursor/skills/` 下新建目录（如 `my-skill/`），放入 `SKILL.md` 即可，无需改任何总配置。
- **为 skill 写脚本**：在 `scripts/` 下建同名目录，用 TypeScript 实现，在 SKILL.md 里写清如何调用。

## 当前 Skills

| Skill | 说明 |
|-------|------|
| [webpage-screenshot](.cursor/skills/webpage-screenshot/) | 打开指定网页并截图保存 |
| [example-second-skill](.cursor/skills/example-second-skill/) | 占位示例，演示多 skill 结构 |

---

## 在 Cursor 里使用

- 打开本仓库后，Cursor 会自动加载 `.cursor/skills/` 下的所有 skills。
- 直接说「打开某网页并截图」等，Agent 会按 description 匹配并应用对应 skill。

---

## 在 OpenClaw 上安装这些 skills

OpenClaw 从自己的目录加载 skills，和 Cursor 的 `.cursor/skills/` 是两套路径。可以用下面两种方式之一，让 OpenClaw 用到本仓库里的 skills。

### 方式一：复制到 OpenClaw 的 skills 目录（推荐）

把本仓库里的 skill 目录复制到 OpenClaw 的本地 skills 目录：

```bash
# 在项目根目录执行（会复制当前所有 skills）
./scripts/install-for-openclaw.sh
```

或手动复制单个 skill：

```bash
mkdir -p ~/.openclaw/skills
cp -r .cursor/skills/webpage-screenshot ~/.openclaw/skills/
```

之后在 OpenClaw 里可用 `/webpage-screenshot` 或通过自然语言触发。

### 方式二：通过配置让 OpenClaw 直接读本仓库（不复制）

编辑 OpenClaw 配置 `~/.openclaw/openclaw.json`，在 `skills.load.extraDirs` 里加上本仓库的 **绝对路径** 下的 `.cursor/skills`：

```json
{
  "skills": {
    "load": {
      "extraDirs": [
        "/Users/你的用户名/workspace/makuta-skills/.cursor/skills"
      ]
    }
  }
}
```

保存后，OpenClaw 会扫描该目录下的所有 skill 子目录；你在这边改 SKILL.md 或加新 skill，OpenClaw 会通过 watch 自动刷新（若已开启 watch）。

**说明**：OpenClaw 的 SKILL.md 格式与 Cursor 兼容（name、description 等）。若 OpenClaw 要求声明工具权限，可在 SKILL.md 的 YAML 头里增加 `tools: Bash, Read, Write` 等字段，按官方文档配置即可。

---

## 发布到 ClawHub (clawhub.ai / clawhub.com)

ClawHub 是 OpenClaw 的**公共 Skills 注册中心**：可以浏览、搜索、安装别人发的 skill，也可以把自己的 skill 发上去，让别人用。

- 网站：**[clawhub.com](https://clawhub.com)**（clawhub.ai 一般会指向同一平台）
- 需要先安装 **ClawHub CLI**，登录后再发布。

### 1. 安装并登录 CLI

```bash
# 任选一种安装
npm i -g clawhub
# 或
pnpm add -g clawhub

# 登录（会打开浏览器或使用 token）
clawhub login
# 或
clawhub login --token <你的API令牌>
```

### 2. 发布单个 skill

在**项目根目录**执行，把 `webpage-screenshot` 发到 ClawHub：

```bash
clawhub publish .cursor/skills/webpage-screenshot \
  --slug webpage-screenshot \
  --name "Webpage Screenshot" \
  --version 1.0.0 \
  --changelog "首次发布：打开网页并截图为 PNG" \
  --tags latest
```

其他 skill 同理：把路径改成 `.cursor/skills/<skill 目录名>`，并改 `--slug`、`--name`。

### 3. 一次扫描并发布多个 skills（同步）

若希望把当前仓库里 `.cursor/skills/` 下**所有** skill 都扫描并发布/更新到 ClawHub：

```bash
# 在项目根目录执行
clawhub sync --root .cursor/skills --all
```

首次会为每个 skill 创建版本；之后修改了再跑同一命令会提示版本号递增（可用 `--bump patch|minor|major`、`--changelog "说明"` 等）。不加 `--all` 时会交互式确认每个要上传的 skill。

### 4. 发布后

- 在 [clawhub.com](https://clawhub.com) 上可以搜到你的 skill，别人可通过 `clawhub install <slug>` 安装。
- 更新后重新执行 `clawhub publish` 或 `clawhub sync` 即可发布新版本。

### 5. 发布并用 OpenClaw 安装测试（推荐流程）

**第一步：安装 ClawHub CLI 并登录**

```bash
npm i -g clawhub
clawhub login
```

**第二步：在项目根目录发布 skill**

```bash
cd /Users/user/workspace/makuta-skills
chmod +x scripts/publish-to-clawhub.sh
./scripts/publish-to-clawhub.sh
```

或不用脚本，直接：

```bash
clawhub publish .cursor/skills/webpage-screenshot \
  --slug webpage-screenshot \
  --name "Webpage Screenshot" \
  --version 1.0.0 \
  --changelog "打开指定网页并截图为 PNG" \
  --tags latest
```

**第三步：安装并启动 OpenClaw**

若尚未安装 OpenClaw，按官方文档安装：<https://docs.openclaw.ai/zh-CN/install>。

**第四步：在 OpenClaw 工作区用 ClawHub 安装刚发布的 skill**

```bash
# 进入你的 OpenClaw 工作目录（或任意目录，ClawHub 默认会装到当前目录的 ./skills）
cd ~/你的OpenClaw工作目录
clawhub install webpage-screenshot
```

安装后 skill 会出现在该目录的 `./skills/webpage-screenshot/`。若 OpenClaw 配置为从 `./skills` 加载，下次启动 OpenClaw 会话即可使用。

**第五步：在 OpenClaw 里触发 skill 做测试**

- 用斜杠命令：输入 `/webpage-screenshot`，再按提示给 URL。
- 或用自然语言：例如「打开 https://example.com 并截图」「对某网页截图」等，Agent 会按 description 自动匹配该 skill。

说明：从 ClawHub 安装到的只有 SKILL.md（说明文档）。若 skill 里写的是「运行 npm run screenshot」，需要在**本仓库**里才有对应脚本；在 OpenClaw 里 Agent 可改用内置浏览器能力或按 SKILL 说明执行其他可行步骤。

---

## 开发

```bash
# 安装依赖（首次）
npm install

# 安装 Playwright 浏览器（首次使用截图 skill 时）
npx playwright install chromium

# 编译 TypeScript
npm run build

# 运行网页截图（示例）
npm run screenshot -- https://example.com
```

手动运行截图：在项目根目录执行 `npm run screenshot -- <URL>`，可选第二个参数为输出路径。

### 怎么测试截图脚本

在项目根目录按顺序执行：

```bash
# 1. 安装依赖（若还没装过）
npm install

# 2. 安装 Chromium（首次必须，Playwright 会下载浏览器）
npx playwright install chromium

# 3. 跑一次测试：对 example.com 截图并保存为 test-screenshot.png
npm run test:screenshot
```

成功的话会输出类似：`截图已保存: /Users/你/makuta-skills/test-screenshot.png`，当前目录下会多出 `test-screenshot.png`，打开看是否是 example.com 的页面截图。

**自定义测试**：换任意 URL 和输出路径：

```bash
npm run screenshot -- https://www.baidu.com ./我的截图.png
```
