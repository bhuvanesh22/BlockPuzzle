import { _decorator, Component, Node, Texture2D, Sprite, SpriteFrame, Rect, UITransform, Vec3, Vec2, math, Size, Prefab, instantiate } from 'cc';
import { Block } from './Block';
import { Board } from './Board';
import { BlockContainer } from './BlockContainer';
import { Constants } from '../Utils/Constants';
const { ccclass, property } = _decorator;

@ccclass('TextureSlicer')
export class TextureSlicer extends Component {

    @property(Texture2D)
    public puzzleImage: Texture2D = null!;

    @property(Board)
    public board: Board = null!;

    @property([Block])
    public puzzleBlocks: Block[] = [];

    @property(Prefab)
    public blockContainerPrefab: Prefab = null!; 

    // LINK THIS TO THE "CONTENT" NODE OF YOUR SCROLLVIEW
    @property(Node)
    public shelfContent: Node = null!; 

    currentRowCount : number = 0;
    currentColumnCount : number = 0;

    start() {
        this.scheduleOnce(this.generatePuzzle, 0.1);
    }

    setCurrentRowAndColumnCount(){
        const rowAndCOlumnCount = this.board.getCurrentRowAndColumnCount();
        this.currentRowCount = rowAndCOlumnCount.x;
        this.currentColumnCount = rowAndCOlumnCount.y;
    }

    generatePuzzle() {
        if (!this.puzzleImage || !this.board) return;

        this.setCurrentRowAndColumnCount();

        // --- 1. SLICING LOGIC (Same as before) ---
        const boardTrans = this.board.slotContainer.getComponent(UITransform);
        const boardWorldPos = this.board.slotContainer.worldPosition;
        
        const gridPixelWidth = this.board.slotSize * this.currentRowCount; 
        const gridPixelHeight = this.board.slotSize * this.currentColumnCount; 

        const minX = boardWorldPos.x - (gridPixelWidth / 2);
        const minY = boardWorldPos.y - (gridPixelHeight / 2); 

        const texW = this.puzzleImage.width;
        const texH = this.puzzleImage.height;

        const slotTexWidth = texW / this.currentColumnCount; 
        const slotTexHeight = texH / this.currentRowCount;

        this.puzzleBlocks.forEach(block => {
            const solutionSlot = this.board.getClosestSlot(block.node.worldPosition);
            if (solutionSlot) {
                block.targetGridPosition = new Vec2(solutionSlot.gridX, solutionSlot.gridY);
            }

            block.node.children.forEach(segment => {
                const sprite = segment.getComponent(Sprite);
                if (!sprite) return;

                const segWorldPos = segment.worldPosition;
                const diffX = segWorldPos.x - minX;
                const diffY = segWorldPos.y - minY;

                const ratioX = math.clamp01(diffX / gridPixelWidth);
                const ratioY = math.clamp01(diffY / gridPixelHeight);

                const gridX = Math.min(Math.floor(ratioX * this.currentColumnCount), this.currentColumnCount - 1);
                const gridY = Math.min(Math.floor(ratioY * this.currentRowCount), this.currentRowCount - 1);

                const texX = gridX * slotTexWidth;
                const invertedGridY = (this.currentRowCount - 1) - gridY;
                const texY = invertedGridY * slotTexHeight;

                const newFrame = new SpriteFrame();
                newFrame.texture = this.puzzleImage;
                newFrame.rect = new Rect(texX, texY, slotTexWidth, slotTexHeight);
                
                sprite.spriteFrame = newFrame;
                sprite.color = new math.Color(255, 255, 255, 255); 
            });
        });

        this.moveToShelfWithContainers();
    }

    moveToShelfWithContainers() {
        if (!this.shelfContent || !this.blockContainerPrefab) return;

        this.puzzleBlocks.forEach(block => {
            const containerNode = instantiate(this.blockContainerPrefab);
            containerNode.parent = this.shelfContent;
            const containerComp = containerNode.getComponent(BlockContainer);

            this.randomizeBlock(block);
            containerComp.setup(block);
        });
    }

    randomizeBlock(block: Block) {
        // Random Rotation (0, -90, -180, -270)
        const rotations = [0, 1, 2, 3]; 
        const randomRot = rotations[Math.floor(Math.random() * rotations.length)];
        block.node.angle = -(randomRot * 90);

        // Random Flip
        const randomFlip = Math.random() > 0.5;
        if (randomFlip) {
            block.node.scale = new Vec3(-block.node.scale.x, block.node.scale.y, 1);
        }

        // IMPORTANT: Recalculate shape offsets after randomizing!
        block.calculateShape();
    }
}