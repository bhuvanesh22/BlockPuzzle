import { _decorator, Component, director, instantiate, Node, Prefab } from 'cc';
import { Constants } from '../Utils/Constants';
import { GlobalEvent, GameEvents } from './EventManager';
import { TextureSlicer } from '../Gameplay/TextureSlicer';
import { LevelData } from '../Gameplay/LevelData';
import { StorageManager } from '../Utils/StorageManager'; 

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    public static instance : GameManager;

    @property(TextureSlicer)
    textureSlicer : TextureSlicer = null;

    @property()
    currentLevel : number = 0;

    @property([Prefab])
    levelPrefabs : Prefab[] = [];

    @property(Node)
    public levelHolder: Node = null!;

    currentLevelNode : Node = null;

    protected onLoad(): void {
        if(GameManager.instance == null) {
            GameManager.instance = this;
            director.addPersistRootNode(this.node);
        } else {
            this.node.destroy();
        }

        GlobalEvent.on(GameEvents.LEVEL_COMPLETED, this.onLevelComplete, this);
        GlobalEvent.on(GameEvents.LOAD_LEVEL, this.onLoadLevel, this);
    }

    start() {
        GlobalEvent.emit(GameEvents.GAME_START);
    }

    protected onDestroy(): void {
        GlobalEvent.off(GameEvents.LEVEL_COMPLETED, this.onLevelComplete, this);
        GlobalEvent.off(GameEvents.LOAD_LEVEL, this.onLoadLevel, this);
    }

    onLevelComplete(){
        console.log("VICTORY!");
        if(this.currentLevelNode != null) this.currentLevelNode.destroy();
        this.currentLevel ++;

        GlobalEvent.emit(GameEvents.SHOW_LEVEL_COMPLETE);
        if(this.currentLevel < this.levelPrefabs.length) {
            this.scheduleOnce(this.loadLevel, 0.1);
        }
        else this.showEndGame();
    }

    onLoadLevel() {
        this.scheduleOnce(this.loadLevel, 0.1); 
    }

    loadLevel() {
        this.currentLevelNode = instantiate(this.levelPrefabs[this.currentLevel]);
        this.currentLevelNode.parent = this.levelHolder;
        console.log("Level Instantiated");
        const currentLevelData = this.currentLevelNode.getComponent(LevelData);
        console.log("Level Data fetched");
        
        GlobalEvent.emit(GameEvents.LEVEL_LOADED, this.currentLevel, currentLevelData.puzzleImage);
        this.textureSlicer.initialize(currentLevelData.puzzleImage, currentLevelData.board, currentLevelData.puzzleBlocks);
    }

    showEndGame() {
        console.log("GAME END !!!");
        this.currentLevel = 0;
        if(this.currentLevelNode) {
            this.currentLevelNode.destroy();
            this.currentLevelNode = null;
        }
        GlobalEvent.emit(GameEvents.GAME_OVER);
    }
}


