import { _decorator, Component, Node, Texture2D, Sprite, SpriteFrame, Rect, Vec2, Prefab, instantiate, Color, math, Vec3 } from 'cc';
import { Block } from './Block';
import { Board } from './Board';
import { BlockContainer } from './BlockContainer';

const { ccclass, property } = _decorator;

@ccclass('TextureSlicer')
export class TextureSlicer extends Component {

    @property(Prefab)
    public blockContainerPrefab: Prefab = null!; 

    @property(Node)
    public shelfContent: Node = null!; 

    @property(Texture2D)
    public puzzleImage: Texture2D = null!;

    @property(Board)
    public board: Board = null!;

    @property([Block])
    public puzzleBlocks: Block[] = [];

    currentRowCount : number = 0;
    currentColumnCount : number = 0;

    initialize(_puzzleImage: Texture2D, _board: Board, _puzzleBlocks: Block[]) {
        this.puzzleImage = _puzzleImage;
        this.board = _board;
        this.puzzleBlocks = _puzzleBlocks;

        console.log("TextureSlicer: Start method execution started."); 
        this.scheduleOnce(this.generatePuzzle, 0.2);
    }

    generatePuzzle() {
        console.log("TextureSlicer: Generating Puzzle...");

        if (!this.puzzleImage || !this.board) {
            console.error("TextureSlicer: Missing Puzzle Image or Board reference!");
            return;
        }

        // 1. Get Board Dimensions
        const rowAndCol = this.board.getCurrentRowAndColumnCount();
        this.currentRowCount = rowAndCol.x;
        this.currentColumnCount = rowAndCol.y;

        console.log(`TextureSlicer: Board detected as ${this.currentColumnCount} x ${this.currentRowCount}`);

        // 2. Calculate the size of one single slot slice on the texture
        const texW = this.puzzleImage.width;
        const texH = this.puzzleImage.height;
        const sliceWidth = texW / this.currentColumnCount; 
        const sliceHeight = texH / this.currentRowCount;

        // 3. Iterate through all blocks placed in the editor
        this.puzzleBlocks.forEach(block => {
            block.setBoard(this.board);
            block.debugSlotInfo = []; // Clear previous debug info

            // A. Find "Anchor" (Solution Position) for WIN CONDITION
            const anchorSlot = this.board.getClosestSlot(block.node.worldPosition);
            
            if (anchorSlot) {
                block.targetGridPosition = new Vec2(anchorSlot.gridX, anchorSlot.gridY);
                block.debugSlotInfo.push(`ANCHOR (Sol): Found at [${anchorSlot.gridX}, ${anchorSlot.gridY}]`);
            } else {
                console.warn(`Block ${block.node.name} is not placed over a valid slot in Editor! Win Condition might fail.`);
                block.debugSlotInfo.push(`ANCHOR: NOT FOUND at worldPos ${block.node.worldPosition}`);
            }

            // B. Apply Textures (Manual vs Auto)
            if (block.manualTextureCoords && block.manualTextureCoords.length > 0) {
                // --- MANUAL MODE ---
                console.log(`TextureSlicer: Using MANUAL coords for ${block.node.name}`);
                
                block.node.children.forEach((segment, index) => {
                    const sprite = segment.getComponent(Sprite);
                    if (!sprite) return;
                    
                    // FIX: Reset child transform to prevent texture rotation/flip issues
                    // This ensures the container is "upright" so the texture slice appears upright.
                    segment.angle = 0;
                    segment.setScale(new Vec3(1, 1, 1));

                    if (index < block.manualTextureCoords.length) {
                        const coord = block.manualTextureCoords[index];
                        this.applySliceToSprite(sprite, coord, sliceWidth, sliceHeight);
                        block.debugSlotInfo.push(`Child '${segment.name}' (Manual): [${coord.x},${coord.y}]`);
                    } else {
                        console.warn(`Block ${block.node.name}: More children than manual coords! Child ${index} skipped.`);
                    }
                });

            } else {
                // --- AUTO MODE (Fallback) ---
                console.log(`TextureSlicer: Using AUTO detection for ${block.node.name}`);
                
                block.node.children.forEach(segment => {
                    const sprite = segment.getComponent(Sprite);
                    if (!sprite) return;

                    // FIX: Reset child transform here too
                    segment.angle = 0;
                    segment.setScale(new Vec3(1, 1, 1));

                    const segmentSlot = this.board.getClosestSlot(segment.worldPosition);

                    if (segmentSlot) {
                        const coord = new Vec2(segmentSlot.gridX, segmentSlot.gridY);
                        this.applySliceToSprite(sprite, coord, sliceWidth, sliceHeight);
                        block.debugSlotInfo.push(`Child '${segment.name}' (Auto): [${coord.x},${coord.y}]`);
                    } else {
                        block.debugSlotInfo.push(`Child '${segment.name}': NO SLOT FOUND`);
                        sprite.color = Color.RED; 
                    }
                });
            }

            // C. Finalize Block Setup
            block.calculateShape();
        });

        // 4. Move to Shelf
        this.moveToShelfWithContainers();
    }

    applySliceToSprite(sprite: Sprite, gridCoord: Vec2, sliceWidth: number, sliceHeight: number) {
        const texX = gridCoord.x * sliceWidth;
        // Invert Y because Textures are Top-Left (0,0) usually, but Grids are Bottom-Left (0,0)
        const invertedGridY = (this.currentRowCount - 1) - gridCoord.y;
        const texY = invertedGridY * sliceHeight;

        const newFrame = new SpriteFrame();
        newFrame.texture = this.puzzleImage;
        newFrame.rect = new Rect(texX, texY, sliceWidth, sliceHeight);
        
        sprite.spriteFrame = newFrame;
        sprite.color = Color.WHITE;
    }

    moveToShelfWithContainers() {
        if (!this.shelfContent || !this.blockContainerPrefab) return;

        this.shelfContent.destroyAllChildren();

        this.puzzleBlocks.forEach(block => {
            const containerNode = instantiate(this.blockContainerPrefab);
            containerNode.parent = this.shelfContent;
            
            const containerComp = containerNode.getComponent(BlockContainer);
            if(containerComp) {
                this.randomizeBlock(block);
                containerComp.setup(block);
            }
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
}