import { _decorator, Component, Node, Texture2D, Sprite, SpriteFrame, Rect, UITransform, Vec3, Vec2, math, Size, Prefab } from 'cc';
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

    @property
    public containerPadding: number = 30;

    @property
    public shelfPadding: number = 20; // Space between blocks
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

        // --- 2. NEW SHELF ALIGNMENT LOGIC ---
        this.arrangeBlocksOnShelf();
    }

    arrangeBlocksOnShelf() {
        if (!this.shelfContent) return;

        let currentX = this.shelfPadding;
        console.log(currentX);
        // 1. Calculate Scaling Factor (how much blocks shrunk)
        const scale = this.board.slotSize / Constants.EDITOR_SLOT_SIZE;
        // The actual visual size of one square in the shelf
        const visualSlotSize = Constants.EDITOR_SLOT_SIZE * scale;

        this.puzzleBlocks.forEach(block => {
            // A. Move block to the Shelf Container so coordinates are local to the ScrollView
            block.node.parent = this.shelfContent;
            
            const bounds = this.getBlockVisualBounds(block);

            // Convert editor coords to visual scale coords
            const leftEdgeOffset = bounds.minX * scale; 
            const rightEdgeOffset = bounds.maxX * scale;
            const topEdgeOffset = bounds.maxY * scale;
            const bottomEdgeOffset = bounds.minY * scale;
            
            // Full Width = distance between edges + size of one slot (since position is center of slot)
            const blockWidth = (rightEdgeOffset - leftEdgeOffset) + visualSlotSize;
            const blockHeight = (topEdgeOffset - bottomEdgeOffset) + visualSlotSize;
            // C. Center logic
            // We want the LEFT edge of the block to be at 'currentX'
            // The block's position (0,0) might be in the middle of the shape.
            // We need to shift it so its visual left edge aligns with currentX.
            
            // Distance from Anchor (0,0) to Left Edge is 'leftEdgeOffset' (usually negative)
            // Target X = currentX + (distance to center from left)
            // Distance to center = -leftEdgeOffset + (visualSlotSize / 2) is approx center of first block
            
            // Simpler approach: Place anchor such that left-most child touches currentX
            const anchorX = currentX - leftEdgeOffset + (visualSlotSize / 2);            
            const anchorY = -(bottomEdgeOffset + blockHeight/2); // Roughly center Y

            block.node.setPosition(anchorX, anchorY, 0);

            // D. Tell Block this is its new home
            block.updateStartPosition();

            // E. Advance X pointer
            currentX += blockWidth + this.shelfPadding;
        });

        // 3. Resize ScrollView Content to fit everything
        const contentTrans = this.shelfContent.getComponent(UITransform);
        if (contentTrans) {
            // Ensure height is enough for blocks (e.g. 300)
            contentTrans.setContentSize(new Size(currentX, 300));
        }
    }

    getBlockVisualBounds(block: Block) {
        let minX = Number.MAX_VALUE;
        let maxX = -Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = -Number.MAX_VALUE;

        if (block.node.children.length === 0) {
            return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
        }

        block.node.children.forEach(child => {
            if (child.position.x < minX) minX = child.position.x;
            if (child.position.x > maxX) maxX = child.position.x;
            if (child.position.y < minY) minY = child.position.y;
            if (child.position.y > maxY) maxY = child.position.y;
        });

        return { minX, maxX, minY, maxY };
    }
}