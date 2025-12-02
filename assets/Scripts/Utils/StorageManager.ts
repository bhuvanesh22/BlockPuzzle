import { sys } from 'cc';

const STORAGE_KEY = 'BLOCK_PUZZLE_DATA';

export interface GameData {
    unlockedLevel: number;
    highScores: number[]; // Index 0 = Level 1 Highscore
    isMuted: boolean;
}

export class StorageManager {
    
    private static _data: GameData = {
        unlockedLevel: 0,
        highScores: [],
        isMuted: false
    };

    public static loadData() {
        const savedData = sys.localStorage.getItem(STORAGE_KEY);
        if (savedData) {
            try {
                const parsed = JSON.parse(savedData);
                // Merge to ensure new fields are added if data structure changes
                this._data = { ...this._data, ...parsed };
            } catch (e) {
                console.warn("StorageManager: Corrupt data, resetting.");
            }
        }
    }

    public static saveData() {
        sys.localStorage.setItem(STORAGE_KEY, JSON.stringify(this._data));
    }

    public static getUnlockedLevel(): number {
        return this._data.unlockedLevel;
    }

    public static setUnlockedLevel(levelIndex: number) {
        if (levelIndex > this._data.unlockedLevel) {
            this._data.unlockedLevel = levelIndex;
            this.saveData();
        }
    }

    public static getHighScore(levelIndex: number): number {
        return this._data.highScores[levelIndex] || 0;
    }

    public static setHighScore(levelIndex: number, score: number) {
        const currentHigh = this.getHighScore(levelIndex);
        if (score > currentHigh) {
            this._data.highScores[levelIndex] = score;
            this.saveData();
        }
    }

    public static get isMuted(): boolean {
        return this._data.isMuted;
    }

    public static set isMuted(value: boolean) {
        this._data.isMuted = value;
        this.saveData();
    }
}