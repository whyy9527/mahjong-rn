# 麻将 AI 助手 (Mahjong AI Assistant)

线下麻将 AI 助手，支持语音识别、计算机视觉、自动计分和回放功能。专为自助麻将店和牌友设计，采用四川血战到底规则。

## 功能特性

### MVP 核心功能

1. **E4: 开局助手 (Game Start Assistant)**
   - 两骰取最小值定位起摸位置
   - 支持手动、语音和 CV 骰点识别
   - 自动生成起牌指引（"第X堆第Y张"）
   - 性能目标：≤400ms

2. **E5: 计分结算 (Scoring Settlement)**
   - 四川血战到底规则
   - 番数限制：≤5
   - 支持明杠/暗杠/加杠（杠分独立）
   - 支持多胡（多人胡牌）
   - 自动生成给分明细、总计和修正日志
   - 准确率目标：≥99.5%

3. **E6: 当局看板 (Current Game Dashboard)**
   - 实时显示当前游戏状态
   - 分数实时更新
   - 语音事件和操作记录
   - 计分历史查看

### 语音指令

支持以下语音命令：
- 打 (Discard)
- 碰 (Pong)
- 杠 (Kong)
- 胡 (Win)
- 自摸 (Self-draw)
- 点炮 (Win on discard)
- 报骰 (Announce dice)

### 数据契约

本地优先存储，支持离线使用：
- **VoiceEvent**: 语音事件记录
- **DiceEvent**: 骰子事件记录
- **CVSnapshot**: CV 快照
- **ScoreSheet**: 计分单

## KPI 目标

- **ASR P95**: ≤400ms
- **ASR 准确率**: ≥99%（嘈杂环境 ≥97%）
- **CV 骰子识别**: ≥98%
- **计分准确率**: ≥99.5%
- **起摸位计算**: ≤400ms

## 技术栈

- **React Native**: 跨平台移动应用开发
- **TypeScript**: 类型安全的 JavaScript
- **AsyncStorage**: 离线数据存储
- **Jest**: 单元测试和 E2E 测试

## 项目结构

```
src/
├── types/              # 数据类型定义和契约
│   └── index.ts        # VoiceEvent, DiceEvent, CVSnapshot, ScoreSheet
├── services/           # 核心业务逻辑
│   ├── gameStartAssistant.ts    # E4: 开局助手
│   ├── scoringEngine.ts         # E5: 计分引擎
│   ├── voiceHandler.ts          # 语音命令处理
│   ├── replayService.ts         # 回放和验证
│   └── storageService.ts        # 本地存储
├── components/         # React Native 组件
│   └── GameDashboard.tsx        # E6: 游戏面板
├── utils/              # 工具函数
│   └── kpiMetrics.ts            # KPI 指标追踪
└── __tests__/          # 测试文件
    ├── gameStartAssistant.test.ts
    ├── scoringEngine.test.ts
    └── e2e.test.ts
```

## 安装

```bash
# 安装依赖（注意：需要在实际设备上运行）
npm install

# 或使用 yarn
yarn install
```

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test gameStartAssistant

# 生成覆盖率报告
npm test -- --coverage
```

## 开发

```bash
# 启动开发服务器
npm start

# 运行 Android 版本
npm run android

# 运行 iOS 版本
npm run ios

# 运行 lint
npm run lint
```

## E2E 验收测试

项目包含完整的 E2E 验收测试，验证以下场景：

1. **起摸位测试**: 模拟骰子事件，验证起摸位计算在 400ms 内完成
2. **计分测试**: 验证计分单正确性，包括多胡和杠分场景
3. **回放测试**: 验证事件回放和冲突检测功能
4. **KPI 测试**: 验证所有 KPI 指标达标

运行验收测试：
```bash
npm test e2e.test.ts
```

## 使用示例

### 1. 初始化游戏

```typescript
import {initializeGame} from './src/services/storageService';

const gameState = initializeGame('东');
```

### 2. 开始游戏（投骰子）

```typescript
import {createDiceEvent, processDiceRoll} from './src/services/gameStartAssistant';

const diceEvent = createDiceEvent(3, 5, 'manual', 1.0);
const updatedState = processDiceRoll(gameState, diceEvent);
// 起摸位: 西家，第3堆第1张
```

### 3. 计分

```typescript
import {calculateWinScore, createScoreSheet} from './src/services/scoringEngine';

const scoreDetail = calculateWinScore('东', '南', 3, false, 0);
// 东家胡牌，3番，南家点炮

const sheet = createScoreSheet(gameId, roundNumber, [scoreDetail], [], previousScores);
```

### 4. 回放和验证

```typescript
import {generateConflictReport} from './src/services/replayService';

const report = generateConflictReport(gameState);
console.log(`发现 ${report.summary.total} 个冲突`);
```

## 离线优先设计

应用采用离线优先架构：
- 所有数据首先存储在本地（AsyncStorage）
- 无需网络连接即可正常使用
- 未来可扩展在线同步和纠错功能

## 四川血战到底规则

- 番数上限：5 番
- 计分基础：2^番数
- 自摸：每家支付
- 点炮：点炮者单独支付
- 杠分独立计算：
  - 暗杠：4 分 × 3
  - 明杠：2 分 × 3
  - 加杠：2 分 × 3

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！
