/**
 * Local Storage Service
 * Offline-first data storage
 * Stores VoiceEvent, DiceEvent, CVSnapshot, ScoreSheet
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GameState,
  VoiceEvent,
  DiceEvent,
  CVSnapshot,
  ScoreSheet,
  PlayerPosition,
} from '../types';

const STORAGE_KEYS = {
  GAMES: '@mahjong:games',
  CURRENT_GAME: '@mahjong:currentGame',
  VOICE_EVENTS: '@mahjong:voiceEvents',
  DICE_EVENTS: '@mahjong:diceEvents',
  CV_SNAPSHOTS: '@mahjong:cvSnapshots',
  SCORE_SHEETS: '@mahjong:scoreSheets',
};

/**
 * Initialize a new game
 * 
 * @param dealer Starting dealer
 * @returns New game state
 */
export function initializeGame(dealer: PlayerPosition): GameState {
  return {
    id: `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: Date.now(),
    currentRound: 1,
    dealer,
    startingPosition: {
      dice1: 0,
      dice2: 0,
      minValue: 0,
      startPlayer: dealer,
      stackNumber: 0,
      tileNumber: 0,
    },
    players: {
      '东': {score: 0, isDealer: dealer === '东'},
      '南': {score: 0, isDealer: dealer === '南'},
      '西': {score: 0, isDealer: dealer === '西'},
      '北': {score: 0, isDealer: dealer === '北'},
    },
    actions: [],
    voiceEvents: [],
    diceEvents: [],
    cvSnapshots: [],
    scoreSheets: [],
    status: 'waiting',
  };
}

/**
 * Save game state to local storage
 * 
 * @param gameState Game state to save
 */
export async function saveGameState(gameState: GameState): Promise<void> {
  try {
    await AsyncStorage.setItem(
      `${STORAGE_KEYS.GAMES}:${gameState.id}`,
      JSON.stringify(gameState)
    );
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_GAME, gameState.id);
  } catch (error) {
    console.error('Failed to save game state:', error);
    throw error;
  }
}

/**
 * Load game state from local storage
 * 
 * @param gameId Game ID to load
 * @returns Game state or null if not found
 */
export async function loadGameState(gameId: string): Promise<GameState | null> {
  try {
    const data = await AsyncStorage.getItem(`${STORAGE_KEYS.GAMES}:${gameId}`);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load game state:', error);
    return null;
  }
}

/**
 * Get current game ID
 * 
 * @returns Current game ID or null
 */
export async function getCurrentGameId(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_GAME);
  } catch (error) {
    console.error('Failed to get current game ID:', error);
    return null;
  }
}

/**
 * Load current game state
 * 
 * @returns Current game state or null
 */
export async function loadCurrentGame(): Promise<GameState | null> {
  const gameId = await getCurrentGameId();
  if (!gameId) return null;
  return loadGameState(gameId);
}

/**
 * Save voice event
 * 
 * @param gameId Game ID
 * @param voiceEvent Voice event to save
 */
export async function saveVoiceEvent(
  gameId: string,
  voiceEvent: VoiceEvent
): Promise<void> {
  try {
    const key = `${STORAGE_KEYS.VOICE_EVENTS}:${gameId}:${voiceEvent.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(voiceEvent));
  } catch (error) {
    console.error('Failed to save voice event:', error);
    throw error;
  }
}

/**
 * Save dice event
 * 
 * @param gameId Game ID
 * @param diceEvent Dice event to save
 */
export async function saveDiceEvent(
  gameId: string,
  diceEvent: DiceEvent
): Promise<void> {
  try {
    const key = `${STORAGE_KEYS.DICE_EVENTS}:${gameId}:${diceEvent.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(diceEvent));
  } catch (error) {
    console.error('Failed to save dice event:', error);
    throw error;
  }
}

/**
 * Save CV snapshot
 * 
 * @param gameId Game ID
 * @param snapshot CV snapshot to save
 */
export async function saveCVSnapshot(
  gameId: string,
  snapshot: CVSnapshot
): Promise<void> {
  try {
    const key = `${STORAGE_KEYS.CV_SNAPSHOTS}:${gameId}:${snapshot.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(snapshot));
  } catch (error) {
    console.error('Failed to save CV snapshot:', error);
    throw error;
  }
}

/**
 * Save score sheet
 * 
 * @param gameId Game ID
 * @param scoreSheet Score sheet to save
 */
export async function saveScoreSheet(
  gameId: string,
  scoreSheet: ScoreSheet
): Promise<void> {
  try {
    const key = `${STORAGE_KEYS.SCORE_SHEETS}:${gameId}:${scoreSheet.id}`;
    await AsyncStorage.setItem(key, JSON.stringify(scoreSheet));
  } catch (error) {
    console.error('Failed to save score sheet:', error);
    throw error;
  }
}

/**
 * List all saved games
 * 
 * @returns Array of game IDs
 */
export async function listGames(): Promise<string[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const gameKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.GAMES));
    return gameKeys.map(key => key.replace(`${STORAGE_KEYS.GAMES}:`, ''));
  } catch (error) {
    console.error('Failed to list games:', error);
    return [];
  }
}

/**
 * Delete game and all associated data
 * 
 * @param gameId Game ID to delete
 */
export async function deleteGame(gameId: string): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const gameKeys = keys.filter(key => key.includes(gameId));
    await AsyncStorage.multiRemove(gameKeys);
  } catch (error) {
    console.error('Failed to delete game:', error);
    throw error;
  }
}

/**
 * Clear all data (for testing)
 */
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch (error) {
    console.error('Failed to clear data:', error);
    throw error;
  }
}
