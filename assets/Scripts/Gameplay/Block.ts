import { _decorator, Component, EventTouch, Node, Vec3, Vec2 } from 'cc';
import { Board } from './Board';
import { Slot } from './Slot';
import { Constants } from '../Utils/Constants';

const { ccclass, property } = _decorator;

@ccclass('Block')
export class Block extends Component {
    @property(Board)
    board: Board = null!;
    
    public shapeOffsets : Vec2[] = [new Vec2(0, 0)];

    _startPos : Vec3 = new Vec3();
    _dragging : boolean = false;
    _baseScale : number = 1;

    protected onLoad(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        this.calculateShape();

    }
    
    protected start(): void {
        this._startPos = this.node.worldPosition.clone();

        if(this.board) {
            this._baseScale = this.board.slotSize / Constants.EDITOR_SLOT_SIZE;
            this.node.setScale(new Vec3(this._baseScale, this._baseScale, 1));
        }
    }

    public updateStartPosition() {
        this._startPos = this.node.position.clone();
    }

    calculateShape() {
        this.shapeOffsets = [];
        this.node.children.forEach(child => {
            const x = Math.round(child.position.x / Constants.EDITOR_SLOT_SIZE);
            const y = Math.round(child.position.y / Constants.EDITOR_SLOT_SIZE);
            this.shapeOffsets.push(new Vec2(x, y));
        });
    }

    onTouchStart(event : EventTouch) {
        console.log("touch Started");
        this._dragging = true;
        this.node.setScale(new Vec3(Constants.BLOCK_SCALE_DRAG, Constants.BLOCK_SCALE_DRAG, 1));
    }

    onTouchMove(event : EventTouch)
    {
        console.log("touch Moving");
        if(!this._dragging) return;
        const delta = event.getUIDelta();
        this.node.position = this.node.position.add3f(delta.x, delta.y, 0);
    }

    onTouchEnd(event : EventTouch){
        this._dragging = false;
        this.node.setScale(new Vec3(this._baseScale, this._baseScale, 1));
        this.trySnap();
    }

    trySnap() {
        const snapSlot = this.board.checkSnap(this.node.worldPosition, this.shapeOffsets);

        if(snapSlot) {
             this.board.placeBlock(snapSlot, this.shapeOffsets);
             const targetPos = snapSlot.node.worldPosition;
             this.node.setWorldPosition(targetPos);
             this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        }
        else this.returnToStart();
    }

    returnToStart() {
        this.node.worldPosition = this._startPos;
    }
}


