import { _decorator, Component, Label, Node, SpriteFrame, Sprite, Texture2D, Button, Rect, Size } from 'cc';
import { GlobalEvent, GameEvents } from '../Core/EventManager';
import { StorageManager } from '../Utils/StorageManager';

const { ccclass, property } = _decorator;

@ccclass('UIManager')
export class UIManager extends Component {

    @property({ type: Label, tooltip: "Label to display High Score" })
    public highScoreLabel: Label = null!;

    @property({ type: Label, tooltip: "Label to display Score" })
    public scoreLabel: Label = null!;

    @property({ type: Label, tooltip: "Label to display Current Level (e.g. 'Level 1')" })
    public levelLabel: Label = null!;

    @property({ type: Label, tooltip: "Label to display Time (e.g. '00:15')" })
    public timerLabel: Label = null!;

    @property({ type: Label, tooltip: "Label to display placed block count" })
    public blocksCountLabel: Label = null!;

    @property(Sprite)
    public levelSampleSprite : Sprite = null!;

    @property([Node])
    screens : Node[] = [];

    @property(Label)
    gameOverScoreLabel : Label = null;
    
    @property(Sprite)
    levelCompleteSprite : Sprite = null;

    @property(Button)
    playButton : Button = null;

    @property (Button)
    nextButton : Button = null;

    @property(Button)
    restartButton : Button = null;

    // Internal State
    private _score: number = 0;
    private _correctBlocks: number = 0;
    private _timer: number = 0;
    private _isGameActive: boolean = false;
    private _currentLevelIndex: number = 0;

    private _currentLevelTexture: Texture2D | null = null;

    // --- LIFECYCLE ---

    onLoad() {
        // Subscribe to Events
        GlobalEvent.on(GameEvents.GAME_START, this.showSplashScreen, this);
        GlobalEvent.on(GameEvents.BLOCK_PLACED_CORRECTLY, this.onBlockCorrect, this);
        GlobalEvent.on(GameEvents.LEVEL_LOADED, this.onLevelLoaded, this);
        GlobalEvent.on(GameEvents.SHOW_LEVEL_COMPLETE, this.onLevelComplete, this);
        GlobalEvent.on(GameEvents.GAME_RESTART, this.onGameRestart, this);
        GlobalEvent.on(GameEvents.GAME_OVER, this.showGameOverScreen, this);
    }

    onDestroy() {
        // Unsubscribe to prevent memory leaks
        GlobalEvent.off(GameEvents.GAME_START, this.showSplashScreen, this);
        GlobalEvent.off(GameEvents.BLOCK_PLACED_CORRECTLY, this.onBlockCorrect, this);
        GlobalEvent.off(GameEvents.LEVEL_LOADED, this.onLevelLoaded, this);
        GlobalEvent.off(GameEvents.SHOW_LEVEL_COMPLETE, this.onLevelComplete, this);
        GlobalEvent.off(GameEvents.GAME_RESTART, this.onGameRestart, this);
        GlobalEvent.off(GameEvents.GAME_OVER, this.showGameOverScreen, this);
    }

    showSplashScreen() {
        this.hideScreens();
        this.screens[0].active = true;
    }

    showLevelCompleteScreen() {
        this.hideScreens();
        if (this.levelCompleteSprite && this._currentLevelTexture) {
            const frame = new SpriteFrame();
            frame.texture = this._currentLevelTexture;
            
            frame.rect = new Rect(0, 0, this._currentLevelTexture.width, this._currentLevelTexture.height);
            frame.originalSize = new Size(this._currentLevelTexture.width, this._currentLevelTexture.height);
            
            this.levelCompleteSprite.spriteFrame = frame;
        }
        this.screens[1].active = true;
    }

    showGameOverScreen() {
        this.hideScreens();
        this.gameOverScoreLabel.string = `Score:\n${this._score}`;
        this.screens[2].active = true;
    }

    hideScreens(){
        for (let i = 0; i < this.screens.length; i++) {
            this.screens[i].active = false;
        }
    }

    update(deltaTime: number) {
        if (this._isGameActive) {
            this._timer += deltaTime;
            this.updateTimerLabel();
        }
    }

    // --- EVENT HANDLERS ---

    private onBlockCorrect() {
        // Requirement: 5 points for every block placed correctly
        this._score += 5;
        this._correctBlocks++;
        this.updateLabels();
    }

    private onLevelLoaded(levelIndex: number, sampleSprite : Texture2D ) {
        // Reset per-level state
        this._isGameActive = true;
        this._correctBlocks = 0;
        this._timer = 0;

        this._currentLevelTexture = sampleSprite;

        const highScore = StorageManager.getHighScore(levelIndex);
        if (this.highScoreLabel) {
            this.highScoreLabel.string = `Best: ${highScore}`;
        }

        // Update Level Text (Index is 0-based, so +1 for display)
        if (this.levelLabel) {
            this.levelLabel.string = `Level ${levelIndex + 1}`;
        }

        if (this.levelSampleSprite && sampleSprite) {
            const newFrame = new SpriteFrame();
            newFrame.texture = sampleSprite;

            newFrame.rect = new Rect(0, 0, sampleSprite.width, sampleSprite.height);
            newFrame.originalSize = new Size(sampleSprite.width, sampleSprite.height);

            this.levelSampleSprite.spriteFrame = newFrame;
        }
        
        this.updateLabels();
    }

    private onClickPlay(){
        GlobalEvent.emit(GameEvents.LOAD_LEVEL);
        this.hideScreens();
    }

    private onLevelComplete() {
        this._isGameActive = false;
        StorageManager.setHighScore(this._currentLevelIndex, this._score);
        this.showLevelCompleteScreen();
    }

    private onGameRestart() {
        this._score = 0;
        this._correctBlocks = 0;
        this._timer = 0;
        this._isGameActive = false;
        this.updateLabels();
        this.showSplashScreen();
    }

    // --- HELPERS ---

    private updateLabels() {
        if(this.scoreLabel) this.scoreLabel.string = `Score: ${this._score}`;
        if(this.blocksCountLabel) this.blocksCountLabel.string = `Blocks: ${this._correctBlocks}`;
    }

    private updateTimerLabel() {
        if (!this.timerLabel) return;

        // Format: MM:SS
        const minutes = Math.floor(this._timer / 60);
        const seconds = Math.floor(this._timer % 60);

        const mStr = minutes < 10 ? `0${minutes}` : `${minutes}`;
        const sStr = seconds < 10 ? `0${seconds}` : `${seconds}`;

        this.timerLabel.string = `${mStr}:${sStr}`;
    }
}