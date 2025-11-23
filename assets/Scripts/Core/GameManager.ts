import { _decorator, Component, director, Node } from 'cc';
import { Constants } from '../Utils/Constants';
import { GlobalEvent, GameEvents } from './EventManager';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {

    public static instance : GameManager;

    protected onLoad(): void {
        if(GameManager.instance == null) {
            GameManager.instance = this;
            director.addPersistRootNode(this.node);
        } else {
            this.node.destroy();
        }
    }

    start() {
        GlobalEvent.on(GameEvents.LEVEL_COMPLETED, this.onLevelComplete, this);
    }

    onLevelComplete(){
        console.log("VICTORY! Loading next level...");
    }

    protected onDestroy(): void {
        GlobalEvent.off(GameEvents.LEVEL_COMPLETED, this.onLevelComplete, this);
    }
}


