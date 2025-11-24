import { _decorator, Component, Node, UITransform, Size, Vec3 } from 'cc';
import { Block } from './Block';
import { Constants } from '../Utils/Constants';

const { ccclass, property } = _decorator;

@ccclass('BlockContainer')
export class BlockContainer extends Component {

    @property(Node)
    public holder: Node = null!; // The Node where the Block sits

    public block: Block | null = null;

    private readonly TARGET_SLOT_SIZE = 30; 

    public setup(block: Block) {
        this.block = block;
        
        this.block.returnToShelfCallback = () => {
            this.node.active = true;
            this.setup(this.block);
        };

        this.block.onPlaceOnBoardCallback = () => {
            // Hide this container so the layout collapses
            this.node.active = false;
        };
        
        // Parent the block to our holder
        this.block.node.parent = this.holder;

        const bounds = this.getUnscaledBounds(block);
        const width = bounds.maxX - bounds.minX;
        const height = bounds.maxY - bounds.minY;
        const fixedScale = this.TARGET_SLOT_SIZE / Constants.EDITOR_SLOT_SIZE;

        block.setContainerScale(fixedScale);

        const centerOffsetX = (bounds.minX + width / 2) * fixedScale;
        const centerOffsetY = (bounds.minY + height / 2) * fixedScale;

        block.node.setPosition(-centerOffsetX, -centerOffsetY, 0);
        
        // Important: Tell the block this container is its "Home"
        // When the block is dropped invalidly, it comes back here.
        block.updateStartPosition(); 
    }

    // LINK THIS TO YOUR ROTATE BUTTON CLICK EVENT
    public onRotateClicked() {
        if (this.block) {
            this.block.rotate();
        }
    }

    // LINK THIS TO YOUR FLIP BUTTON CLICK EVENT
    public onFlipClicked() {
        if (this.block) {
            this.block.flip();
        }
    }

    // Helper to resize this container so the Layout system knows how big it is
     private getUnscaledBounds(block: Block) {
        let minX = Number.MAX_VALUE;
        let maxX = -Number.MAX_VALUE;
        let minY = Number.MAX_VALUE;
        let maxY = -Number.MAX_VALUE;

        if (block.node.children.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

        block.node.children.forEach(child => {
            // Child position is the center of the slot.
            // So left edge is pos - size/2, right edge is pos + size/2
            const halfSize = Constants.EDITOR_SLOT_SIZE / 2;
            
            if (child.position.x - halfSize < minX) minX = child.position.x - halfSize;
            if (child.position.x + halfSize > maxX) maxX = child.position.x + halfSize;
            if (child.position.y - halfSize < minY) minY = child.position.y - halfSize;
            if (child.position.y + halfSize > maxY) maxY = child.position.y + halfSize;
        });

        return { minX, maxX, minY, maxY };
    }
}