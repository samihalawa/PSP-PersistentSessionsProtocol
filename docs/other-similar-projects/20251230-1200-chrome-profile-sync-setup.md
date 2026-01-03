# Session: Chrome Profile Sync & MCP Browser Configuration

## 元信息
- **创建时间**: 2025-12-30 12:00
- **状态**: 进行中

## 上下文摘要
用户希望所有浏览器自动化工具（chrome-devtools-mcp、puppeteer、playwright、browsermcp）都使用其默认Chrome配置文件。已完成MCP配置，设置了环境变量，创建了辅助脚本。用户最后开始询问如何创建自己的协议来管理浏览器会话同步。

## 已完成任务
- [x] 阅读 chrome-devtools-mcp README 完整文档
- [x] 配置 chrome-devtools MCP 使用 `--browser-url=http://127.0.0.1:9222`
- [x] 配置 puppeteer MCP 使用环境变量连接运行中的Chrome
- [x] 配置 browsermcp（使用Chrome扩展，自动继承配置文件）
- [x] 在 ~/.zshrc 添加 Puppeteer/Playwright 环境变量
- [x] 创建 `~/.local/bin/chrome-debug` 启动脚本
- [x] 创建 `~/.local/bin/chrome-profile-sync` 同步脚本
- [x] 创建 `~/.local/bin/chrome-profile-git` Git同步脚本
- [x] 研究会话管理SaaS选项（Partizion, SessionBox, GoLogin, Multilogin, Browserbase等）

## 未完成任务
- [ ] 🔴 高优先级: 用户想创建自己的协议来管理浏览器会话同步
- [ ] 🟡 中优先级: 可能需要集成 Browserbase API 到 MCPs
- [ ] 🟢 低优先级: 设置 iCloud symlink 自动同步配置文件

## 关键文件
- `~/.claude.json` - MCP服务器配置（chrome-devtools, puppeteer, browsermcp）
- `~/.zshrc` - 环境变量配置（PUPPETEER_*, PLAYWRIGHT_*, CHROME_*）
- `~/.local/bin/chrome-debug` - Chrome远程调试启动脚本
- `~/.local/bin/chrome-profile-sync` - 配置文件同步到云存储
- `~/.local/bin/chrome-profile-git` - 配置文件Git同步
- `/Users/samihalawa/Library/Application Support/Google/Chrome/Default` - 用户Chrome默认配置文件

## 注意事项
- Chrome 136+ 安全限制：不允许对默认配置文件使用远程调试
- 解决方案：Chrome必须带 `--remote-debugging-port=9222` 运行
- 当前Chrome已在端口9222运行远程调试 ✓
- `@modelcontextprotocol/server-puppeteer` 已弃用，chrome-devtools-mcp是推荐替代品
- browsermcp 通过Chrome扩展工作，自动使用用户配置文件

## 环境变量配置
```bash
CHROME_USER_DATA_DIR=/Users/samihalawa/Library/Application Support/Google/Chrome
PUPPETEER_BROWSER_URL=http://127.0.0.1:9222
PUPPETEER_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome
```

## MCP配置摘要
```json
"chrome-devtools": { "args": ["chrome-devtools-mcp@latest", "--browser-url=http://127.0.0.1:9222"] }
"puppeteer": { "env": { "PUPPETEER_BROWSER_URL": "http://127.0.0.1:9222" } }
"browsermcp": { "args": ["@browsermcp/mcp@latest"] }  // 使用Chrome扩展
```

## 下一步行动
1. 用户想创建自己的协议来管理浏览器会话 - 需要澄清具体需求
2. 可能的方向：自定义MCP服务器用于会话管理、WebSocket协议、或类似Browserbase的API
3. 先询问用户具体想实现什么功能
