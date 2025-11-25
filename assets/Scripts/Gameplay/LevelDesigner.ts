import { _decorator, Component, Node, Texture2D, Sprite, SpriteFrame, Rect, UITransform, Vec3, Vec2, math, Size, Prefab, instantiate } from 'cc';
import { Block } from './Block';
import { Board } from './Board';
import { BlockContainer } from './BlockContainer';
import { Constants } from '../Utils/Constants';
import { Slot } from './Slot';

const { ccclass, property } = _decorator;

@ccclass('LevelDesigner')
export class LevelDesigner extends Component {

    @property()
    public rows: number = 5;
    @property
    public columns: number = 5;
    @property
    public slotSize: number = 40;

    @property(Texture2D)
    public puzzleImage: Texture2D = null!;
    
    @property(Board)
    public board: Board = null!;

    @property([Prefab])
    public blockPrefabs: Prefab[] = []; 

    @property(Prefab)
    public blockContainerPrefab: Prefab = null!; 
    @property(Node)
    public shelfContent: Node = null!; 

    private generatedBlocks: Block[] = [];

    start() {
        this.scheduleOnce(this.generateLevel, 0.1);
    }

    generateLevel() {
        if (!this.board || !this.puzzleImage || this.blockPrefabs.length === 0) {
            console.error("LevelDesigner: Missing references! Check Inspector.");
            return;
        }

        console.log("LevelDesigner: Generating Level...");

        // 1. Initialize Board
        this.board.slotSize = this.slotSize;
        this.board.generateGrid(this.rows, this.columns);

        // 2. Clear previous data
        this.generatedBlocks = [];

        // 3. Auto-Fill Algorithm
        this.fillBoardWithBlocks();

        // --- FIX: CLEAR BOARD SO PLAYER CAN PLAY ---
        // The fill algorithm marked everything as "Occupied". 
        // We must clear it now so the board is empty for the player.
        this.board.resetOccupancy(); 
        // -------------------------------------------

        // 4. Move to Shelf
        this.moveToShelfWithContainers();
    }

    fillBoardWithBlocks() {
        for (let y = 0; y < this.rows; y++) {
            for (let x = 0; x < this.columns; x++) {
                if (this.board.checkOccupied(x, y)) continue;
                const placedBlock = this.tryPlaceRandomBlock(x, y);
                if (placedBlock) {
                    this.generatedBlocks.push(placedBlock);
                } else {
                    console.warn(`LevelDesigner: Gap at ${x},${y}.`);
                }
            }
        }
    }

    tryPlaceRandomBlock(gridX: number, gridY: number): Block | null {
        const shuffledPrefabs = this.shuffleArray([...this.blockPrefabs]);

        for (const prefab of shuffledPrefabs) {
            const blockNode = instantiate(prefab);
            const blockComp = blockNode.getComponent(Block);
            
            // Ensure scale matches board to prevent drift
            const correctScale = this.slotSize / Constants.EDITOR_SLOT_SIZE;
            blockNode.setScale(correctScale, correctScale, 1);
            
            // Force update to ensure world positions are valid immediately
            blockNode.updateWorldTransform(); 

            blockComp.calculateShape(); 
            const offsets = blockComp.shapeOffsets;

            if (this.canFit(gridX, gridY, offsets)) {
                
                // Position visually
                blockNode.parent = this.board.slotContainer;
                const targetSlot = this.board.getSlot(gridX, gridY);
                if(targetSlot) blockNode.worldPosition = targetSlot.node.worldPosition;
                
                // Force update again after moving
                blockNode.updateWorldTransform();

                // Mark logic
                this.board.placeBlock(targetSlot, offsets, false); // false = Don't check win yet
                blockComp.setBoard(this.board);
                blockComp.targetGridPosition = new Vec2(gridX, gridY);

                // 4. SLICE TEXTURE (Using World Position for accuracy)
                this.applyTexture(blockComp);

                return blockComp;

            } else {
                blockNode.destroy();
            }
        }

        return null;
    }

    canFit(startX: number, startY: number, offsets: Vec2[]): boolean {
        for (const offset of offsets) {
            const targetX = startX + offset.x;
            const targetY = startY + offset.y;
            if (targetX < 0 || targetX >= this.columns || targetY < 0 || targetY >= this.rows) {
                return false;
            }
            if (this.board.checkOccupied(targetX, targetY)) {
                return false;
            }
        }
        return true;
    }

    applyTexture(block: Block) {
        const texW = this.puzzleImage.width;
        const texH = this.puzzleImage.height;
        const slotTexWidth = texW / this.columns;
        const slotTexHeight = texH / this.rows;

        block.node.children.forEach(segment => {
            const sprite = segment.getComponent(Sprite);
            if (!sprite) return;

            // FIX: Use World Position to find the EXACT slot under this segment
            // This ignores anchor point confusion and relies on visual reality.
            const segmentSlot = this.board.getClosestSlot(segment.worldPosition);

            if (segmentSlot) {
                const gridX = segmentSlot.gridX;
                const gridY = segmentSlot.gridY;

                const texX = gridX * slotTexWidth;
                const invertedGridY = (this.rows - 1) - gridY;
                const texY = invertedGridY * slotTexHeight;

                const newFrame = new SpriteFrame();
                newFrame.texture = this.puzzleImage;
                newFrame.rect = new Rect(texX, texY, slotTexWidth, slotTexHeight);
                sprite.spriteFrame = newFrame;
                sprite.color = new math.Color(255, 255, 255, 255);
            }
        });
    }

    moveToShelfWithContainers() {
        if (!this.shelfContent || !this.blockContainerPrefab) return;

        this.generatedBlocks.forEach(block => {
            const containerNode = instantiate(this.blockContainerPrefab);
            containerNode.parent = this.shelfContent;
            const containerComp = containerNode.getComponent(BlockContainer);

            this.randomizeBlock(block);

            containerComp.setup(block);
        });
    }

    randomizeBlock(block: Block) {
        const rotations = [0, 1, 2, 3]; 
        const randomRot = rotations[Math.floor(Math.random() * rotations.length)];
        block.node.angle = -(randomRot * 90);
        
        const randomFlip = Math.random() > 0.5;
        if (randomFlip) {
            block.node.scale = new Vec3(-block.node.scale.x, block.node.scale.y, 1);
        }
        
        block.calculateShape();
    }

    shuffleArray(array: any[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
}