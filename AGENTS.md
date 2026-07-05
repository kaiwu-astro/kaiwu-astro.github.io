# Repository Guidelines

## 项目结构与模块组织

这是一个用于 GitHub Pages 的静态个人学术网站。

- `index.html` 是主页，包含站点内容和各个区块的结构。
- `assets/css/style.css` 负责页面布局、响应式规则和主题样式。
- `assets/js/script.js` 负责少量前端交互。
- `assets/images/` 存放 SVG 标志和站点头像。
- `KaiWU_CV.pdf` 是站点中提供下载的简历文件。

仓库没有独立的源码目录、构建目录或生成产物目录。新增资源请放在 `assets/` 下，并使用相对路径，保证 GitHub Pages 可正常访问。

## 构建、测试与本地开发命令

这个项目不需要包管理器，也不需要构建步骤。常用本地命令如下：

```sh
python3 -m http.server 8000
```

在本地启动静态服务器，地址为 `http://localhost:8000`。

```sh
git status
```

查看提交前有哪些文件发生了变化。

```sh
curl -IL https://kaiwu-astro.github.io/
```

检查已部署的 GitHub Pages 网站是否能正常响应。

## 代码风格与命名约定

HTML、CSS 和 JavaScript 都使用两个空格缩进。HTML 结构要语义化且易读，各区块应使用清晰的 `id`，例如 `about`、`career`、`work`、`contact`。

新增资源文件名使用小写和连字符风格，例如 `profile-photo.jpg`、`conference-logo.svg`。优先使用原生 CSS 和原生 JavaScript，除非确有必要，否则不要引入框架。

## 测试指南

仓库没有自动化测试套件。提交或发布前请手动检查：

- 使用 `python3 -m http.server 8000` 在本地打开站点。
- 检查桌面和移动端宽度下的布局是否正常。
- 确认导航标签、外部链接和简历下载都可用。
- 检查浏览器控制台是否有报错。

如果新增 JavaScript 行为，保持逻辑简洁，并直接验证受影响的交互。

## 提交与 Pull Request 规范

当前提交历史采用简短、祈使式的提交信息，例如：

```text
Build personal academic website
```

请沿用同样风格：用一句简洁的话描述用户能看到的变化。Pull Request 应包含简短说明、视觉改动截图，以及你做过的手动检查说明。如有关联 issue，也请一并链接。

## Agent 操作要求

每次 agent 修改仓库后，必须先完成相关本地测试或手动检查。测试通过后，直接使用 `$commit` skill 创建提交；提交完成后，将当前分支推送到 `origin`。不要把未验证的改动提交或推送。

## 安全与配置提示

不要提交私人草稿、未公开文档、凭据或本地配置文件。仓库里只放用于公开展示的资源。替换简历时尽量保持公开文件名不变，以免现有链接失效。
