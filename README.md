# 🍯 努力当厨师的芳宝 — 食谱工作台

一个为 30 岁女生设计的、圆润可爱风格的**纯前端食谱记录工作台**，手机优先，无后端、无广告。

## ✨ 功能
- **首页**：13 个食物分类卡片（鸡肉 / 猪肉 / 鱼肉 / 虾类 / 螃蟹 / 鱿鱼 / 蔬菜 / 豆腐 / 鸡蛋 / 点心 / 烘培 / 咖啡 / 饮料）
- **无限量食谱**：每个分类可无限加入食谱，名字逐一列出，点进去看做法
- **食谱详情**：可加成品照片、美化排序的材料与步骤；顶部「＋ 加入新食谱」无限添加
- **A4 打印**：每个食谱一键打印 / 存为 PDF，A4 尺寸，打印样式与屏幕一致
- **食材知识页**：每个食材 / 调味料的名字、用法、💚 健康小知识，配**水彩手绘风照片**（canvas 程序化生成，非 SVG）
- **积分 & 宠物**：每加一个食谱 +5 积分，小厨神宠物随积分进化（雏鸟→大厨→厨神）
- **雪花飘落**动效，温柔莓紫粉 `#7d4c69` + 雾蓝绿 `#a7cccf` 配色
- **本地自动保存**：所有食谱 / 积分 / 宠物数据存 localStorage，关闭页面不丢失

## 🔤 字体
- 中文：鼎猎珠海体（`assets/fonts/DingLieZhuHaiTi.ttf`）
- 英文 / 数字：TC Antiquated Sans（`assets/fonts/TCAntiquatedSans-Regular.otf`）

## 🗂 结构
```
index.html
assets/css/style.css
assets/js/data.js        分类 & 食材知识数据
assets/js/watercolor.js  水彩画生成器
assets/js/app.js         主逻辑
assets/fonts/            两个字体文件
```

## ▶ 本地预览
```bash
cd workspace
python3 -m http.server 8123
# 浏览器打开 http://localhost:8123
```

## ☁ 部署
- 永久公网地址（GitHub Pages）：**https://nicole96fang.github.io/recipe-workbench/**
- 仓库：**https://github.com/nicole96fang/recipe-workbench**

## 💾 数据永久保存（不会隔天不见）
数据采用**本地 + 云端双保险**：
- **本地**：localStorage 即时保存（关页不丢，离线可用）。
- **云端（永久真源）**：点侧边栏底部「☁ 云同步 · 永久保存」，填入你的 GitHub Token（勾选 `repo` 权限），点「保存到云端」。
  - 文本数据写入仓库 `data/backup.json`
  - 每张照片写入 `data/photos/<id>.txt`
  - 开启「自动同步」后，每次改动自动备份。
- **跨设备 / 清缓存恢复**：打开 App 时若本地为空，会自动从云端（公开只读）恢复；也可点「↺ 从云端恢复」。
- ⚠️ 注意：本仓库为 **public**，云端备份（含照片）对任何人可见。
  - GitHub Pages **免费版仅支持 public 仓库**；若将仓库设为 private，公网地址会失效（数据仍在，只是网页打不开）。
  - 若要隐私又保留公网：可对备份内容加密后再存，或改用私人 gist / 自有服务器。

> Token 只存在你浏览器本机 localStorage，不会发送给任何人；仅用于写入你自己的仓库。

