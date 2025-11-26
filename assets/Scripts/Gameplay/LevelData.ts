import { _decorator, Component, Node, Texture2D } from 'cc';
import { Board } from './Board';
import { Block } from './Block';
const { ccclass, property } = _decorator;

@ccclass('LevelData')
export class LevelData extends Component {

    @property(Texture2D)
    public puzzleImage: Texture2D = null;

    @property(Board)
    public board: Board = null;

    @property([Block])
    public puzzleBlocks: Block[] = [];

    start() {

    }

    update(deltaTime: number) {
        
    }
}


