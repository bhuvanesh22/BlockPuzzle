import { _decorator, Component, Node, Texture2D, Sprite, SpriteFrame, Rect, UITransform, Vec3, Vec2, math } from 'cc';
import { Block } from './Block';
import { Board } from './Board';
const { ccclass, property } = _decorator;

@ccclass('TextureSlicer')
export class TextureSlicer extends Component {

    @property(Texture2D)
    public puzzleImage: Texture2D = null!;

    @property(Board)
    public board: Board = null!;

    @property([Block])
    public puzzleBlocks: Block[] = [];

    @property(Node)
    public shelfArea: Node = null!; // Where blocks go after being painted

    start() {
        // We delay slightly to ensure Board has finished generating its grid sizing
        this.scheduleOnce(this.generatePuzzle, 0.1);
    }

    generatePuzzle() {
        if (!this.puzzleImage || !this.board) return;

        // 1. Calculate Board Metrics in World Space
        const boardTrans = this.board.slotContainer.getComponent(UITransform);
        const boardWorldPos = this.board.slotContainer.worldPosition;
        
        // We assume the grid is centered in the container
        // We need the Top-Left corner of the grid to start mapping UVs
        // Total Width/Height of the grid in World Pixels
        const gridPixelWidth = this.board.slotSize * 8; // Assuming 8 cols, or read from board
        const gridPixelHeight = this.board.slotSize * 8; // Assuming 8 rows

        const topLeftX = boardWorldPos.x - (gridPixelWidth / 2);
        // Cocos Y grows upwards, so Top-Left is Y + Height/2
        const topLeftY = boardWorldPos.y - (gridPixelHeight / 2); 

        // 2. Iterate through all blocks (which are currently sitting in the SOLUTION spot)
        this.puzzleBlocks.forEach(block => {
            
            // Iterate through each square (child) of the block
            block.node.children.forEach(segment => {
                const sprite = segment.getComponent(Sprite);
                if (!sprite) return;

                // A. Where is this segment in the world?
                const segWorldPos = segment.worldPosition;

                // B. Map this World Pos to the Image UV coordinates
                // Distance from Bottom-Left of board
                const diffX = segWorldPos.x - topLeftX;
                const diffY = segWorldPos.y - topLeftY;

                // C. Calculate ratio (0.0 to 1.0)
                // We clamp 0-1 to avoid texture bleeding errors
                const ratioX = math.clamp01(diffX / gridPixelWidth);
                const ratioY = math.clamp01(diffY / gridPixelHeight);

                // D. Map to Texture Pixels
                const texW = this.puzzleImage.width;
                const texH = this.puzzleImage.height;

                // We want to cut a square from the texture
                // Calculate the size of one slot relative to the texture
                // If board is 8 slots wide, one slot is 1/8th of texture width
                const slotTexWidth = texW / 8; 
                const slotTexHeight = texH / 8;

                const texX = Math.floor(ratioX * 8) * slotTexWidth;
                const texY = Math.floor(ratioY * 8) * slotTexHeight;

                // E. Create and Apply the SpriteFrame
                const newFrame = new SpriteFrame();
                newFrame.texture = this.puzzleImage;
                newFrame.rect = new Rect(texX, texY, slotTexWidth, slotTexHeight);
                
                sprite.spriteFrame = newFrame;
                // White color to show the texture true colors (remove red tint)
                sprite.color = new math.Color(255, 255, 255, 255); 
            });

            // 3. SCRAMBLE! Move the block to the shelf
            this.moveBlockToShelf(block);
        });
    }

    moveBlockToShelf(block: Block) {
        // Simple random position in the shelf area
        // You can improve this logic to place them neatly in a row
        const range = 150; 
        const randomX = (Math.random() * range) - (range / 2);
        const randomY = (Math.random() * range) - (range / 2);

        // Convert shelf local pos to world pos
        const targetPos = this.shelfArea.worldPosition.clone().add3f(randomX, randomY, 0);
        
        block.node.worldPosition = targetPos;
        
        // IMPORTANT: Tell the block "This is your new home"
        block.updateStartPosition();
    }
}