import { _decorator, Component, Node, UITransform, Size, Vec3 } from 'cc';
import { Block } from './Block';

const { ccclass, property } = _decorator;

@ccclass('BlockContainer')
export class BlockContainer extends Component {

    @property(Node)
    public holder: Node = null!; // The Node where the Block sits

    public block: Block | null = null;

    public setup(block: Block) {
        this.block = block;
        
        // Parent the block to our holder
        this.block.node.parent = this.holder;
        this.block.node.setPosition(0, 0, 0);
        
        // Important: Tell the block this container is its "Home"
        // When the block is dropped invalidly, it comes back here.
        this.block.updateStartPosition(); 
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
    public resizeContainer(visualWidth: number, visualHeight: number, padding: number) {
        const trans = this.getComponent(UITransform);
        if (trans) {
            // Add padding for the buttons (assumed to be around the block)
            trans.setContentSize(new Size(visualWidth + padding, visualHeight + padding + 50)); // +50 for button space
        }
    }
}