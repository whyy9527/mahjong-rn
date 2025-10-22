/**
 * E6: Current Game Dashboard Component
 * Displays current game state, scores, and actions
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {GameState, PlayerPosition} from '../types';
import {
  loadCurrentGame,
  saveGameState,
  initializeGame,
} from '../services/storageService';
import {
  createDiceEvent,
  processDiceRoll,
  generateGuidanceMessage,
} from '../services/gameStartAssistant';
import {
  calculateWinScore,
  createScoreSheet,
} from '../services/scoringEngine';

export const GameDashboard: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGame();
  }, []);

  const loadGame = async () => {
    try {
      const loaded = await loadCurrentGame();
      if (loaded) {
        setGameState(loaded);
      } else {
        // Initialize new game if none exists
        const newGame = initializeGame('东');
        setGameState(newGame);
        await saveGameState(newGame);
      }
    } catch (error) {
      console.error('Failed to load game:', error);
    } finally {
      setLoading(false);
    }
  };

  const startGame = async () => {
    if (!gameState) return;

    // Simulate dice roll
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const diceEvent = createDiceEvent(dice1, dice2, 'manual', 1.0);

    const updatedState = processDiceRoll(gameState, diceEvent);
    const guidance = generateGuidanceMessage(updatedState.startingPosition);

    setGameState(updatedState);
    await saveGameState(updatedState);

    Alert.alert('游戏开始', guidance);
  };

  const addWin = async (winner: PlayerPosition, loser?: PlayerPosition) => {
    if (!gameState) return;

    const isSelfDraw = loser === undefined;
    const fan = Math.floor(Math.random() * 5) + 1; // Random fan 1-5

    const scoreDetails = [
      calculateWinScore(winner, loser, fan, isSelfDraw, 0),
    ];

    const initialScores = {
      '东': gameState.players['东'].score,
      '南': gameState.players['南'].score,
      '西': gameState.players['西'].score,
      '北': gameState.players['北'].score,
    };

    const sheet = createScoreSheet(
      gameState.id,
      gameState.currentRound,
      scoreDetails,
      [],
      initialScores
    );

    // Update player scores
    const updatedPlayers = {...gameState.players};
    (Object.keys(sheet.totalScores) as PlayerPosition[]).forEach(pos => {
      updatedPlayers[pos].score = sheet.totalScores[pos];
    });

    const updatedState = {
      ...gameState,
      players: updatedPlayers,
      scoreSheets: [...gameState.scoreSheets, sheet],
      currentRound: gameState.currentRound + 1,
    };

    setGameState(updatedState);
    await saveGameState(updatedState);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>加载中...</Text>
      </View>
    );
  }

  if (!gameState) {
    return (
      <View style={styles.container}>
        <Text>无法加载游戏</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>麻将 AI 助手</Text>
        <Text style={styles.subtitle}>
          当前局数: {gameState.currentRound} | 状态: {gameState.status}
        </Text>
      </View>

      {gameState.status === 'waiting' && (
        <View style={styles.section}>
          <TouchableOpacity style={styles.button} onPress={startGame}>
            <Text style={styles.buttonText}>开始游戏</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameState.status === 'playing' && gameState.startingPosition.dice1 > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>起摸位置</Text>
          <Text style={styles.text}>
            骰子: {gameState.startingPosition.dice1},{' '}
            {gameState.startingPosition.dice2}
          </Text>
          <Text style={styles.text}>
            最小值: {gameState.startingPosition.minValue}
          </Text>
          <Text style={styles.text}>
            {generateGuidanceMessage(gameState.startingPosition)}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>当前分数</Text>
        {(Object.keys(gameState.players) as PlayerPosition[]).map(pos => (
          <View key={pos} style={styles.scoreRow}>
            <Text style={styles.playerName}>
              {pos}家 {gameState.players[pos].isDealer && '(庄)'}
            </Text>
            <Text style={styles.score}>
              {gameState.players[pos].score.toFixed(0)}
            </Text>
          </View>
        ))}
      </View>

      {gameState.status === 'playing' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>操作</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => addWin('东', '南')}>
              <Text style={styles.buttonText}>东胡南</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.smallButton}
              onPress={() => addWin('东', undefined)}>
              <Text style={styles.buttonText}>东自摸</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>统计</Text>
        <Text style={styles.text}>语音事件: {gameState.voiceEvents.length}</Text>
        <Text style={styles.text}>骰子事件: {gameState.diceEvents.length}</Text>
        <Text style={styles.text}>计分记录: {gameState.scoreSheets.length}</Text>
        <Text style={styles.text}>操作记录: {gameState.actions.length}</Text>
      </View>

      {gameState.scoreSheets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>计分记录</Text>
          {gameState.scoreSheets.slice(-5).reverse().map((sheet, idx) => (
            <View key={sheet.id} style={styles.scoreSheetRow}>
              <Text style={styles.text}>
                第{sheet.roundNumber}局 -{' '}
                {sheet.details.map(d => `${d.winner}胡(${d.fan}番)`).join(', ')}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#c41e3a',
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#fff',
    marginTop: 5,
  },
  section: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  text: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  score: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#c41e3a',
  },
  button: {
    backgroundColor: '#c41e3a',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  smallButton: {
    backgroundColor: '#c41e3a',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scoreSheetRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
});
