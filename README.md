# Boundless Network ETH 质押管理平台

一个现代化的 Web 应用，用于在 Boundless Network 上管理 ETH 质押和提取操作。

## 🌟 功能特点

### 💰 核心功能
- **ETH 质押**：将 ETH 质押到 Boundless 计算网络
- **ETH 提取**：从 Boundless 网络提取已质押的资金
- **余额查询**：查询任意地址在 Boundless 网络中的质押余额
- **实时统计**：显示质押余额、可用余额和总价值（含 USD 估值）

### 🔗 Web3 集成
- **多钱包支持**：支持 MetaMask 等主流 Web3 钱包
- **Base 主网专用**：专门为 Base 主网优化
- **自动网络切换**：智能检测并切换到 Base 主网
- **真实合约交互**：与 Boundless 质押合约直接交互

### 🎯 用户体验
- **现代化 UI**：使用 Tailwind CSS 构建的响应式界面
- **实时反馈**：操作状态的即时通知和进度提示
- **交易监控**：实时跟踪交易从提交到确认的全过程
- **交易历史**：完整的操作记录和 BaseScan 链接

## 🚀 快速开始

### 环境要求
- 现代浏览器（支持 Web3）
- MetaMask 或其他 Web3 钱包
- Base 主网连接

### 本地运行
1. 克隆项目
```bash
git clone <your-repo-url>
cd boundless-staking
```

2. 启动本地服务器
```bash
# 使用 Python
python3 -m http.server 8000

# 或使用 Node.js
npx serve .

# 或使用任何静态文件服务器
```

3. 打开浏览器访问 `http://localhost:8000`

## 🏗️ 技术架构

### 前端技术栈
- **HTML5**：语义化标记
- **Tailwind CSS**：现代化样式框架
- **JavaScript (ES6+)**：原生 JavaScript，无框架依赖
- **Web3.js**：以太坊区块链交互
- **Lucide Icons**：现代图标库

### 区块链集成
- **网络**：Base 主网 (Chain ID: 8453)
- **合约地址**：`0x26759dbB201aFbA361Bec78E097Aa3942B0b4AB8`
- **合约类型**：EIP-1967 透明代理合约
- **主要方法**：
  - `deposit()` - 质押 ETH
  - `withdraw(uint256)` - 提取 ETH
  - `balanceOf(address)` - 查询余额

## 📁 项目结构

```
boundless-staking/
├── index.html              # 主页面
├── boundless-script.js     # 核心 JavaScript 逻辑
├── README.md               # 项目说明
├── package.json            # 项目配置
└── .gitignore             # Git 忽略文件
```

## 🔧 核心功能说明

### 钱包连接
- 自动检测 Web3 钱包
- 支持桌面和移动设备
- 智能错误处理和用户引导

### 网络管理
- 自动检测当前网络
- 一键切换到 Base 主网
- 自动添加网络配置

### 质押操作
- 输入验证和余额检查
- Gas 费估算和优化
- 交易确认界面
- 实时状态跟踪

### 提取操作
- 质押余额验证
- 安全的提取流程
- 交易状态监控

## 🛡️ 安全特性

- **地址验证**：确保输入有效的以太坊地址
- **余额检查**：防止超额操作
- **Gas 费预留**：自动预留交易费用
- **交易确认**：所有重要操作都需要用户确认
- **错误处理**：完善的错误捕获和用户提示

## 📊 数据管理

- **本地存储**：交易历史持久化保存
- **实时价格**：从 CoinGecko API 获取 ETH 价格
- **状态同步**：自动同步钱包和网络状态变化

## 🎨 界面设计

- **响应式设计**：适配各种设备屏幕
- **现代化风格**：简洁美观的用户界面
- **直观操作**：清晰的操作流程和状态提示
- **无障碍支持**：良好的可访问性设计

## 🔗 相关链接

- [Boundless Network](https://boundless.network/)
- [Base Network](https://base.org/)
- [BaseScan](https://basescan.org/)
- [MetaMask](https://metamask.io/)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请通过以下方式联系：
- GitHub Issues
- 项目讨论区

---

**注意**：本项目仅用于教育和演示目的。使用前请确保了解相关风险，并在测试网络上充分测试。