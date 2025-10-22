# 快速开始 (Quick Start Guide)

## 前置要求

- Node.js >= 16
- npm 或 yarn
- React Native 开发环境 (仅用于移动端部署)

## 安装

```bash
# 克隆仓库
git clone https://github.com/whyy9527/mahjong-rn.git
cd mahjong-rn

# 安装依赖
npm install
```

## 开发

### 运行测试

```bash
# 运行所有测试
npm test

# 生成覆盖率报告
npm test -- --coverage

# 监视模式
npm test -- --watch
```

### 运行应用 (需要 React Native 环境)

```bash
# 启动开发服务器
npm start

# 运行 Android 版本
npm run android

# 运行 iOS 版本
npm run ios
```

### Lint

```bash
npm run lint
```

## 快速示例

### 1. 初始化游戏并投骰子

```typescript
import {initializeGame} from './src/services/storageService';
import {
  createDiceEvent,
  processDiceRoll,
  generateGuidanceMessage,
} from './src/services/gameStartAssistant';

// 初始化游戏，东家做庄
let gameState = initializeGame('东');

// 投骰子: 3 和 5
const diceEvent = createDiceEvent(3, 5, 'manual', 1.0);

// 处理骰子并计算起摸位
gameState = processDiceRoll(gameState, diceEvent);

// 获取起牌指引
const guidance = generateGuidanceMessage(gameState.startingPosition);
console.log(guidance); // "西家起牌，从右数第3堆第1张开始"
```

### 2. 计算和记录胡牌

```typescript
import {
  calculateWinScore,
  createScoreSheet,
  verifyScoreSheet,
} from './src/services/scoringEngine';

// 东家 3 番点炮南家
const scoreDetail = calculateWinScore('东', '南', 3, false, 0);

// 初始分数
const initialScores = {
  东: 0,
  南: 0,
  西: 0,
  北: 0,
};

// 创建计分单
const scoreSheet = createScoreSheet(
  gameState.id,
  1,  // 第 1 局
  [scoreDetail],
  [],  // 无杠
  initialScores
);

// 验证计分单
const errors = verifyScoreSheet(scoreSheet);
if (errors.length === 0) {
  console.log('计分单正确！');
  console.log('东家:', scoreSheet.totalScores['东']);  // 8
  console.log('南家:', scoreSheet.totalScores['南']);  // -8
}
```

### 3. 处理自摸

```typescript
// 东家 2 番自摸
const scoreDetail = calculateWinScore('东', undefined, 2, true, 0);

const scoreSheet = createScoreSheet(
  gameState.id,
  2,
  [scoreDetail],
  [],
  {'东': 8, '南': -8, '西': 0, '北': 0}  // 上局分数
);

// 自摸时每家支付
console.log('东家:', scoreSheet.totalScores['东']);  // 8 + 12 = 20
console.log('南家:', scoreSheet.totalScores['南']);  // -8 - 4 = -12
console.log('西家:', scoreSheet.totalScores['西']);  // 0 - 4 = -4
console.log('北家:', scoreSheet.totalScores['北']);  // 0 - 4 = -4
```

### 4. 处理杠牌

```typescript
import {applyKongScore} from './src/services/scoringEngine';

// 东家暗杠
const scores = applyKongScore('东', 'concealed', {
  东: 0,
  南: 0,
  西: 0,
  北: 0,
});

console.log('东家:', scores['东']);  // 12 (4 * 3)
console.log('南家:', scores['南']);  // -4
console.log('西家:', scores['西']);  // -4
console.log('北家:', scores['北']);  // -4
```

### 5. 回放和冲突检测

```typescript
import {
  generateConflictReport,
  replayVoiceEvents,
} from './src/services/replayService';

// 生成冲突报告
const report = generateConflictReport(gameState);

console.log(`发现 ${report.summary.total} 个冲突`);
console.log(`高优先级: ${report.summary.high}`);
console.log(`中优先级: ${report.summary.medium}`);
console.log(`低优先级: ${report.summary.low}`);

// 回放语音事件
const replayed = replayVoiceEvents(gameState.voiceEvents);
replayed.forEach(({event, replayTime}) => {
  console.log(`${event.playerId}: ${event.command} (置信度: ${event.confidence})`);
});
```

### 6. 本地存储

```typescript
import {
  saveGameState,
  loadGameState,
  loadCurrentGame,
} from './src/services/storageService';

// 保存游戏状态
await saveGameState(gameState);

// 加载当前游戏
const currentGame = await loadCurrentGame();

// 加载特定游戏
const specificGame = await loadGameState('game_123456');
```

### 7. KPI 追踪

```typescript
import {
  generateKPIReport,
  validateKPIMetrics,
  formatKPIReport,
} from './src/utils/kpiMetrics';

// 生成 KPI 报告
const metrics = generateKPIReport(
  gameState.voiceEvents,
  gameState.diceEvents,
  [100, 150, 120]  // 起摸位计算时间
);

// 验证 KPI
const validation = validateKPIMetrics(metrics);
if (validation.pass) {
  console.log('所有 KPI 达标！');
} else {
  console.log('未达标项:', validation.failures);
}

// 格式化报告
console.log(formatKPIReport(metrics));
```

## 数据流程

```
1. 初始化游戏 (initializeGame)
   ↓
2. 投骰子 (createDiceEvent → processDiceRoll)
   ↓
3. 游戏进行 (voiceEvents, actions)
   ↓
4. 记录胡牌 (calculateWinScore → createScoreSheet)
   ↓
5. 保存状态 (saveGameState)
   ↓
6. 回放验证 (generateConflictReport)
```

## 四川血战到底规则速查

### 计分规则
- 基础分: 2^番数 (番数限制 ≤5)
- 点炮: 点炮者单独支付
- 自摸: 每家平均支付 (×3)

### 杠分 (独立计算)
- 暗杠: 4 分 × 3 = 12 分
- 明杠: 2 分 × 3 = 6 分
- 加杠: 2 分 × 3 = 6 分

### 番数示例
| 番数 | 分值 |
|------|------|
| 1番  | 2分  |
| 2番  | 4分  |
| 3番  | 8分  |
| 4番  | 16分 |
| 5番  | 32分 |

## 故障排除

### 测试失败
```bash
# 清理缓存并重新运行
npm test -- --clearCache
npm test
```

### 依赖问题
```bash
# 删除并重新安装
rm -rf node_modules package-lock.json
npm install
```

### TypeScript 错误
```bash
# 重新构建 TypeScript
npx tsc --noEmit
```

## 下一步

- 查看 [API.md](./API.md) 了解完整 API 文档
- 查看 [TEST_SUMMARY.md](./TEST_SUMMARY.md) 了解测试详情
- 查看 [README.md](./README.md) 了解项目概览

## 需要帮助？

- 提交 Issue: https://github.com/whyy9527/mahjong-rn/issues
- 查看文档: 项目根目录的 Markdown 文件
- 运行测试查看示例: `npm test`
