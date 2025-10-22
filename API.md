# API 文档 (API Documentation)

## 核心服务 (Core Services)

### 1. 开局助手 (Game Start Assistant) - E4

#### `calculateStartingPosition`
计算起摸位置

**参数:**
- `dice1: number` - 第一个骰子值 (1-6)
- `dice2: number` - 第二个骰子值 (1-6)
- `dealer: PlayerPosition` - 庄家位置 ('东'/'南'/'西'/'北')

**返回:**
```typescript
{
  minValue: number;        // 最小骰子值
  startPlayer: PlayerPosition; // 起牌玩家
  stackNumber: number;     // 堆数
  tileNumber: number;      // 张数
  guidance: string;        // 指引文本
}
```

**示例:**
```typescript
const result = calculateStartingPosition(3, 5, '东');
// result.guidance = "第3堆第1张"
```

#### `processDiceRoll`
处理骰子事件并更新游戏状态

**参数:**
- `gameState: GameState` - 当前游戏状态
- `diceEvent: DiceEvent` - 骰子事件

**返回:** `GameState` - 更新后的游戏状态

#### `createDiceEvent`
创建骰子事件

**参数:**
- `dice1: number` - 骰子1
- `dice2: number` - 骰子2
- `method?: 'manual' | 'cv' | 'voice'` - 检测方法 (默认: 'manual')
- `confidence?: number` - 置信度 (默认: 1.0)
- `cvImageData?: string` - CV图像数据 (可选)

**返回:** `DiceEvent`

### 2. 计分引擎 (Scoring Engine) - E5

#### `calculateWinScore`
计算胡牌得分

**参数:**
- `winner: PlayerPosition` - 赢家
- `loser: PlayerPosition | undefined` - 输家 (自摸时为undefined)
- `fan: number` - 番数 (自动限制≤5)
- `isSelfDraw: boolean` - 是否自摸
- `kongScore?: number` - 杠分 (默认: 0)

**返回:** `ScoreDetail` - 得分详情

**示例:**
```typescript
// 3番点炮
const score = calculateWinScore('东', '南', 3, false, 0);
// score.totalScore = 8 (2^3)

// 自摸
const score = calculateWinScore('东', undefined, 2, true, 0);
// score.totalScore = 12 (2^2 * 3)
```

#### `calculateKongScore`
计算杠分

**参数:**
- `kongType: 'concealed' | 'exposed' | 'add'` - 杠类型

**返回值:**
- 暗杠: 4分
- 明杠: 2分
- 加杠: 2分

#### `createScoreSheet`
创建计分单

**参数:**
- `gameId: string` - 游戏ID
- `roundNumber: number` - 局数
- `scoreDetails: ScoreDetail[]` - 得分详情数组 (支持多胡)
- `kongDetails: Array<{player, type, score}>` - 杠详情
- `previousScores: Record<PlayerPosition, number>` - 上局分数
- `adjustments?: ScoreAdjustment[]` - 调整记录 (可选)

**返回:** `ScoreSheet` - 完整计分单

#### `verifyScoreSheet`
验证计分单正确性

**参数:**
- `scoreSheet: ScoreSheet` - 待验证计分单
- `expectedTotal?: number` - 期望总和 (默认: 0)

**返回:** `string[]` - 错误消息数组 (空数组表示正确)

### 3. 语音处理 (Voice Handler)

#### `processVoiceCommand`
处理语音命令 (异步)

**参数:**
- `audioData: string` - Base64音频数据
- `isNoisy?: boolean` - 是否嘈杂环境 (默认: false)

**返回:** 
```typescript
Promise<{
  command: VoiceCommandType;
  confidence: number;
  processingTime: number;
}>
```

#### `createVoiceEvent`
创建语音事件

**参数:**
- `command: VoiceCommandType` - 识别的命令
- `playerId: PlayerPosition` - 玩家ID
- `confidence: number` - 置信度
- `processingTime: number` - 处理时间(ms)
- `audioData?: string` - 音频数据 (可选)

**返回:** `VoiceEvent`

#### 支持的语音命令
- `'打'` - 打牌/弃牌
- `'碰'` - 碰牌
- `'杠'` - 杠牌
- `'胡'` - 胡牌
- `'自摸'` - 自摸胡牌
- `'点炮'` - 点炮胡牌
- `'报骰'` - 报骰子

### 4. 回放服务 (Replay Service)

#### `replayVoiceEvents`
回放语音事件

**参数:**
- `voiceEvents: VoiceEvent[]` - 语音事件数组

**返回:** 
```typescript
Array<{
  event: VoiceEvent;
  replayTime: number;
}>
```

#### `generateConflictReport`
生成冲突报告

**参数:**
- `gameState: GameState` - 游戏状态
- `expectedScores?: Record<PlayerPosition, number>` - 期望分数 (可选)

**返回:**
```typescript
{
  conflicts: ReplayConflict[];
  summary: {
    total: number;
    high: number;
    medium: number;
    low: number;
  };
}
```

#### `verifyActionSequence`
验证操作序列一致性

**参数:**
- `actions: GameAction[]` - 游戏操作数组

**返回:** `ReplayConflict[]` - 冲突数组

#### `verifyScoreSheetConsistency`
验证计分单一致性

**参数:**
- `scoreSheet: ScoreSheet` - 计分单

**返回:** `ReplayConflict[]` - 冲突数组

### 5. 存储服务 (Storage Service)

#### `initializeGame`
初始化新游戏

**参数:**
- `dealer: PlayerPosition` - 起始庄家

**返回:** `GameState` - 新游戏状态

#### `saveGameState`
保存游戏状态 (异步)

**参数:**
- `gameState: GameState` - 游戏状态

**返回:** `Promise<void>`

#### `loadGameState`
加载游戏状态 (异步)

**参数:**
- `gameId: string` - 游戏ID

**返回:** `Promise<GameState | null>`

#### `loadCurrentGame`
加载当前游戏 (异步)

**返回:** `Promise<GameState | null>`

#### `saveVoiceEvent`
保存语音事件 (异步)

**参数:**
- `gameId: string` - 游戏ID
- `voiceEvent: VoiceEvent` - 语音事件

**返回:** `Promise<void>`

#### `saveDiceEvent`
保存骰子事件 (异步)

**参数:**
- `gameId: string` - 游戏ID
- `diceEvent: DiceEvent` - 骰子事件

**返回:** `Promise<void>`

#### `saveScoreSheet`
保存计分单 (异步)

**参数:**
- `gameId: string` - 游戏ID
- `scoreSheet: ScoreSheet` - 计分单

**返回:** `Promise<void>`

### 6. KPI 指标 (KPI Metrics)

#### `generateKPIReport`
生成 KPI 报告

**参数:**
- `voiceEvents: VoiceEvent[]` - 语音事件
- `diceEvents: DiceEvent[]` - 骰子事件
- `startPositionTimes: number[]` - 起摸位计算时间
- `groundTruthVoice?: string[]` - 语音真实值 (可选)
- `groundTruthDice?: Array<{dice1, dice2}>` - 骰子真实值 (可选)
- `isNoisy?: boolean` - 是否嘈杂环境 (默认: false)

**返回:** `KPIMetrics`

#### `validateKPIMetrics`
验证 KPI 指标

**参数:**
- `metrics: KPIMetrics` - KPI 指标

**返回:**
```typescript
{
  pass: boolean;
  failures: string[];
}
```

#### `formatKPIReport`
格式化 KPI 报告为可读字符串

**参数:**
- `metrics: KPIMetrics` - KPI 指标

**返回:** `string` - 格式化报告

## 数据类型 (Data Types)

### 核心类型

#### `PlayerPosition`
玩家位置: `'东' | '南' | '西' | '北'`

#### `VoiceCommandType`
语音命令类型: `'打' | '碰' | '杠' | '胡' | '自摸' | '点炮' | '报骰'`

#### `KongType`
杠类型: `'concealed' | 'exposed' | 'add'` (暗杠/明杠/加杠)

#### `ActionType`
操作类型: `'discard' | 'pong' | 'kong' | 'win' | 'self-draw'`

### 数据契约

#### `VoiceEvent`
```typescript
{
  id: string;
  timestamp: number;
  command: VoiceCommandType;
  playerId: PlayerPosition;
  confidence: number;
  audioData?: string;
  processingTime: number;
}
```

#### `DiceEvent`
```typescript
{
  id: string;
  timestamp: number;
  dice1: number;
  dice2: number;
  minValue: number;
  detectionMethod: 'manual' | 'cv' | 'voice';
  confidence: number;
  cvImageData?: string;
}
```

#### `ScoreSheet`
```typescript
{
  id: string;
  gameId: string;
  timestamp: number;
  roundNumber: number;
  scores: Record<PlayerPosition, number>;
  details: ScoreDetail[];
  adjustments: ScoreAdjustment[];
  kongDetails: Array<{player, type, score}>;
  totalScores: Record<PlayerPosition, number>;
  verified: boolean;
}
```

#### `GameState`
```typescript
{
  id: string;
  createdAt: number;
  currentRound: number;
  dealer: PlayerPosition;
  startingPosition: {...};
  players: Record<PlayerPosition, {name?, score, isDealer}>;
  actions: GameAction[];
  voiceEvents: VoiceEvent[];
  diceEvents: DiceEvent[];
  cvSnapshots: CVSnapshot[];
  scoreSheets: ScoreSheet[];
  status: 'waiting' | 'playing' | 'scoring' | 'finished';
}
```

## KPI 目标

| 指标 | 目标 |
|------|------|
| ASR P95 | ≤400ms |
| ASR 准确率 | ≥99% |
| ASR 嘈杂准确率 | ≥97% |
| CV 骰子识别 | ≥98% |
| 计分准确率 | ≥99.5% |
| 起摸位计算 | ≤400ms |

## 使用示例

### 完整游戏流程

```typescript
import {
  initializeGame,
  saveGameState,
} from './services/storageService';
import {
  createDiceEvent,
  processDiceRoll,
} from './services/gameStartAssistant';
import {
  calculateWinScore,
  createScoreSheet,
} from './services/scoringEngine';

// 1. 初始化游戏
let game = initializeGame('东');

// 2. 投骰子
const dice = createDiceEvent(4, 6);
game = processDiceRoll(game, dice);
// 起摸位: 第4堆第2张

// 3. 记录胡牌
const score = calculateWinScore('东', '南', 3, false, 0);
const sheet = createScoreSheet(
  game.id,
  1,
  [score],
  [],
  {东: 0, 南: 0, 西: 0, 北: 0}
);

// 4. 保存状态
await saveGameState(game);
```

### 回放和验证

```typescript
import {generateConflictReport} from './services/replayService';

const report = generateConflictReport(gameState);

if (report.summary.high > 0) {
  console.log('发现严重冲突:', report.conflicts);
}
```

### KPI 追踪

```typescript
import {generateKPIReport, formatKPIReport} from './utils/kpiMetrics';

const metrics = generateKPIReport(
  voiceEvents,
  diceEvents,
  startPositionTimes
);

console.log(formatKPIReport(metrics));
```
