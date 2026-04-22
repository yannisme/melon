这是一次新的尝试，基于 **Flarum 2.x** 构建。目前社区已在使用中。初期因未适配其他扩展，且可能存在较多 Bug，欢迎大家积极反馈与提出建议，帮助这款主题变得更加完善。

------

## Melon - 🍈哈密瓜
![GitHub](https://img.shields.io/github/license/yannisme/melon?style=flat-square) ![GitHub last commit](https://img.shields.io/github/last-commit/yannisme/melon?style=flat-square) ![GitHub release (latest by date)](https://img.shields.io/github/v/release/yannisme/melon?style=flat-square) ![Packagist Downloads](https://img.shields.io/packagist/dt/yannisme/melon?style=flat-square)
一款清新、模块化的 **Flarum 2.0** 主题，支持自定义样式、暗色模式与多种页面布局选项。

-----

#### 功能特性

##### 🎨 自定义

- 主色调、头部背景色与文字颜色
- 暗色模式下的背景色、表面色与文字颜色
- 圆角大小控制
- 侧边栏开关
- 帖子卡片样式（圆角 / 扁平 / 阴影）
- 帖子列表紧凑模式
- 贴内头像大小

##### 🧩 模块化页面布局（每个模块可独立开关）

| 模块           | 页面       | 说明                                                         |
| :------------- | :--------- | :----------------------------------------------------------- |
| **首页布局**   | `/`        | 分类卡片网格 + 最近讨论、精选标签、自定义链接                |
| **标签页**     | `/tags`    | 标签云 + 分类卡片及热门帖子标题                              |
| **帖子列表页** | `/t/{tag}` | 博客风格帖子列表，支持摘要、点赞数、回复数、排序和无限滚动   |
| **帖子内容页** | `/d/{id}`  | 时间线布局，侧边栏（楼层跳转、参与者、事件）、楼层编号，CSS 参数微调 |


------

#### 安装
```
composer require yannisme/melon
```


#### 清理缓存
```
php flarum cache:clear
```
#### 卸载
```
composer remove yannisme/melon
```

----

#### 许可证

MIT


------

#### 更新日志

##### 修复

1. 让 melon-hero-subtitle 支持 HTML 渲染
2. 修复首页标签区域错位的问题
3. 修复后台管理页面的暗夜模式
4. 修复 participants 和楼层跳转（Floor Jump）的问题
5. 修复逗号问题
6. 修复首页"最新讨论"板块的缓存问题
7. 修复楼层编号显示问题
8. 修复标题加粗错误
9. 修复删除帖子的问题
10. 修复加载时的闪烁问题
11. 修复部分页面返回空白的问题

##### 适配

- 适配中文语言环境
