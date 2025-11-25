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
        if(!this.board) return;
        const rowAndCOlumnCount = this.board.getCurrentRowAndColumnCount();
        this.currentRowCount = rowAndCOlumnCount.x;
        this.currentColumnCount = rowAndCOlumnCount.y;
    }

    generatePuzzle() {
        if (!this.board || !this.puzzleImage) {
            console.error("TextureSlicer: Missing Board or Image!");
            return;
        }

        this.setCurrentRowAndColumnCount();

        const texW = this.puzzleImage.width;
        const texH = this.puzzleImage.height;
        const slotTexWidth = texW / this.currentColumnCount; 
        const slotTexHeight = texH / this.currentRowCount;

        // Calculate the exact scale needed for blocks to match board slots
        const correctScale = this.board.slotSize / Constants.EDITOR_SLOT_SIZE;

        this.puzzleBlocks.forEach(block => {
            block.setBoard(this.board);

            // FIX 1: FORCE EXACT SCALE
            // This prevents "drift". If a block is slightly too big/small, 
            // its outer segments will fall into adjacent slots, causing the wrong texture.
            const originalScale = block.node.scale.clone(); // Save to restore later if needed
            const dirX = Math.sign(originalScale.x);
            const dirY = Math.sign(originalScale.y);
            block.node.setScale(correctScale * dirX, correctScale * dirY, 1);
            block.node.updateWorldTransform(); // Ensure physics positions are updated immediately

            // 1. Capture Solution (Target Position)
            const centerSlot = this.board.getClosestSlot(block.node.worldPosition);
            if (centerSlot) {
                block.targetGridPosition = new Vec2(centerSlot.gridX, centerSlot.gridY);
            }

            // 2. Texture Logic - SEGMENT BASED
            block.node.children.forEach(segment => {
                const sprite = segment.getComponent(Sprite);
                if (!sprite) return;

                // FIX 2: USE WORLD POSITION
                // Ask the board exactly which slot is under this specific segment.
                // Since we forced the scale above, this is now mathematically guaranteed to be correct.
                const segmentSlot = this.board.getClosestSlot(segment.worldPosition);

                if (segmentSlot) {
                    const gridX = segmentSlot.gridX;
                    const gridY = segmentSlot.gridY;

                    // Bounds Check
                    if (gridX >= 0 && gridX < this.currentColumnCount && gridY >= 0 && gridY < this.currentRowCount) {
                        const texX = gridX * slotTexWidth;
                        
                        // Y-Inversion (Top of Board = Top of Image)
                        const invertedGridY = (this.currentRowCount - 1) - gridY;
                        const texY = invertedGridY * slotTexHeight;

                        const newFrame = new SpriteFrame();
                        newFrame.texture = this.puzzleImage;
                        newFrame.rect = new Rect(texX, texY, slotTexWidth, slotTexHeight);
                        sprite.spriteFrame = newFrame;
                        sprite.color = new math.Color(255, 255, 255, 255);
                    } else {
                        // This happens if the block is placed outside the Board's Rows/Cols
                        console.warn(`Segment at ${gridX},${gridY} is outside board bounds! Check Board Rows/Cols.`);
                    }
                } else {
                    console.warn("Segment could not find a slot! Is the block aligned with the grid?");
                }
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