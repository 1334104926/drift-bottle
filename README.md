# 🌊 漂流瓶 - Drift Bottle

一个浪漫的漂流瓶 H5 应用，让你可以在大海中扔出心声、捞起惊喜。

![Drift Bottle](https://img.shields.io/badge/漂流瓶-🌊-blue)

## 功能特点

- 🏺 **扔漂流瓶** - 写下你的心声，投入大海
- 🤚 **捞漂流瓶** - 随机捞起一个瓶子，遇见有趣的灵魂
- 💬 **回复漂流瓶** - 与投瓶者互动
- 🎨 **多彩瓶子** - 四种颜色可选
- 📱 **移动端适配** - 完美支持手机浏览

## 技术栈

- **前端**: HTML5 + CSS3 + JavaScript（原生）
- **后端**: Node.js + Express
- **数据库**: SQLite
- **部署**: Railway（免费额度）

## 本地运行

```bash
# 安装依赖
npm install

# 启动服务器
npm start

# 访问 http://localhost:3000
```

## 部署到 Railway（免费）

1. **Fork 本项目** 到你的 GitHub

2. **注册 Railway**
   - 访问 [railway.app](https://railway.app)
   - 使用 GitHub 登录

3. **创建新项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择你 Fork 的仓库

4. **等待部署完成**
   - Railway 会自动检测 Node.js 项目
   - 部署完成后会给你一个 URL

5. **完成！**
   - 访问给你的 URL 即可使用

## 部署到其他平台

### Vercel + 独立后端
由于 Vercel 主要支持静态部署，你需要：
1. 部署后端到 Railway/Render/Fly.io
2. 修改前端的 `API_BASE` 指向你的后端地址

### Docker 部署
```bash
docker build -t drift-bottle .
docker run -p 3000:3000 drift-bottle
```

## 项目结构

```
drift-bottle/
├── public/
│   └── index.html      # 前端页面
├── server.js           # 后端服务
├── package.json        # 依赖配置
├── railway.json        # Railway 配置
├── Dockerfile          # Docker 配置
└── README.md           # 说明文档
```

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/bottles` | POST | 扔新瓶子 |
| `/api/bottles/random` | GET | 随机捞瓶子 |
| `/api/bottles/:id/reply` | POST | 回复瓶子 |
| `/api/bottles/:id/replies` | GET | 获取回复列表 |
| `/api/stats` | GET | 获取统计数据 |

## License

MIT License - 随便用，玩得开心！

---

Made with 💙 by Your Name
