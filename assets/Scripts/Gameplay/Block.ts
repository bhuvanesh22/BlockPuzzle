import { _decorator, Component, EventTouch, Node, Vec3, Vec2, director, math,CCString } from 'cc';
import { Board } from './Board';
import { Slot } from './Slot';
import { Constants } from '../Utils/Constants';
import { GlobalEvent, GameEvents } from '../Core/EventManager';

const { ccclass, property } = _decorator;

@ccclass('Block')
export class Block extends Component {
    @property(Board)
    board: Board = null!;

    @property({
        type: [Vec2], 
        tooltip: "Manually define the Grid Coordinates (x,y) for each child segment's texture slice. The order corresponds to the Node hierarchy order of children."
    })
    public manualTextureCoords: Vec2[] = [];


    @property([CCString])
    public debugSlotInfo: string[] = []; 
    
    public returnToShelfCallback: () => void = null!;
    public onPlaceOnBoardCallback: () => void = null!;

    public shapeOffsets : Vec2[] = [new Vec2(0, 0)];
    public targetGridPosition: Vec2 = new Vec2(-99, -99);

    _startParent: Node = null!;
    _startPos : Vec3 = new Vec3();
    _dragging : boolean = false;
    _boardScale : number = 1;
    _containerScale : number = 1;
    _lastAnchorSlot: Slot | null = null; 

    protected onLoad(): void {
        this.node.on(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.on(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.on(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.on(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);

        this.calculateShape();

    }
    
    protected start(): void {
        this._startParent = this.node.parent;
        this._startPos = this.node.worldPosition.clone();

        if(this.board) {
            this._boardScale = this.board.slotSize / Constants.EDITOR_SLOT_SIZE;
        }
    }

    public setBoard(board: Board) {
        this.board = board;
        if (this.board) {
            this._boardScale = this.board.slotSize / Constants.EDITOR_SLOT_SIZE;
        }
    }

    public updateStartPosition() {
        this._startParent = this.node.parent;
        this._startPos = this.node.position.clone();
    }

    public setContainerScale(scale: number) {
        this._containerScale = scale;
        const dirX = Math.sign(this.node.scale.x);
        this.node.setScale(new Vec3(this._containerScale * dirX, this._containerScale, 1));
    }

     public rotate() {
        // Rotate 90 degrees Clockwise
        const currentAngle = this.node.angle;
        this.node.angle = currentAngle - 90;
        this.calculateShape();
    }

    public flip() {
        // Flip Horizontal by inverting X scale
        const currentScale = this.node.scale;
        this.node.setScale(new Vec3(currentScale.x * -1, currentScale.y, currentScale.z));
        this.calculateShape();
    }

    calculateShape() {
        this.shapeOffsets = [];

        const rad = math.toRadian(this.node.angle);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const scaleX = Math.sign(this.node.scale.x); // Just need direction (-1 or 1)
        const scaleY = Math.sign(this.node.scale.y);

        this.node.children.forEach(child => {

            const lx = child.position.x / Constants.EDITOR_SLOT_SIZE;
            const ly = child.position.y / Constants.EDITOR_SLOT_SIZE;

            const sx = lx * scaleX;
            const sy = ly * scaleY;

            const rx = sx * cos - sy * sin;
            const ry = sx * sin + sy * cos;

            const finalX = Math.round(rx);
            const finalY = Math.round(ry);

            this.shapeOffsets.push(new Vec2(finalX, finalY));
        });
    }

    onTouchStart(event : EventTouch) {
        this._dragging = true;

        this._startParent = this.node.parent;
        this._startPos = this.node.worldPosition.clone();

        if (this._lastAnchorSlot) {
            this.board.removeBlock(this._lastAnchorSlot, this.shapeOffsets);
        }

        const worldPos = this.node.worldPosition.clone();
        const canvas = director.getScene().getChildByName('Canvas');

        this.node.parent = canvas;
        this.node.worldPosition = worldPos;

        const dirX = Math.sign(this.node.scale.x);
        const dragScale = this._boardScale * Constants.BLOCK_SCALE_DRAG;
        this.node.setScale(new Vec3(dragScale * dirX, dragScale, 1));
    }

    onTouchMove(event : EventTouch)
    {
        if(!this._dragging) return;
        const delta = event.getUIDelta();
        this.node.position = this.node.position.add3f(delta.x, delta.y, 0);
    }

    onTouchEnd(event : EventTouch){
        this._dragging = false;
        this.trySnap();
    }

    trySnap() {
        if (!this.board) {
            console.error("Block Error: No Board assigned!");
            this.returnToStart();
            return;
        }

        // Check if valid placement exists
        const snapSlot = this.board.checkSnap(this.node.worldPosition, this.shapeOffsets);

        if(snapSlot) {
            // Place logically
            this.board.placeBlock(snapSlot, this.shapeOffsets);
            this._lastAnchorSlot = snapSlot;

            // Snap visually
            const targetPos = snapSlot.node.worldPosition;
            this.node.setWorldPosition(targetPos);
            this.node.parent = this.board.slotContainer;

            // Reset scale to match board slots
            const dirX = Math.sign(this.node.scale.x);
            this.node.setScale(new Vec3(this._boardScale * dirX, this._boardScale, 1));

            if (this.onPlaceOnBoardCallback) {
                this.onPlaceOnBoardCallback();
            }

            // --- WIN CONDITION CHECK ---
            // 1. Position Check
            const isCorrectPos = (this.targetGridPosition.x === snapSlot.gridX && 
                                  this.targetGridPosition.y === snapSlot.gridY);

            // 2. Rotation Check (must be upright, 0 or 360)
            const normalizeAngle = Math.abs(this.node.angle % 360);
            const isUpright = (normalizeAngle < 1 || normalizeAngle > 359);

            // 3. Flip Check (must not be flipped relative to original)
            const isNotFlipped = this.node.scale.x > 0; // Assuming original scale X was positive

             if (isCorrectPos && isUpright && isNotFlipped) {
                 console.log("Correct placement! Locking block.");
                 this.lockBlock();
             }
        }
        else {
            // Invalid placement
            if (this.returnToShelfCallback) {
                this._lastAnchorSlot = null;
                this.returnToShelfCallback();
            } else {
                this.returnToStart();
            }
        }
    }

    lockBlock() {
        // Remove event listeners so it cannot be dragged again
        GlobalEvent.emit(GameEvents.BLOCK_PLACED_CORRECTLY); 
        this.node.off(Node.EventType.TOUCH_START, this.onTouchStart, this);
        this.node.off(Node.EventType.TOUCH_MOVE, this.onTouchMove, this);
        this.node.off(Node.EventType.TOUCH_END, this.onTouchEnd, this);
        this.node.off(Node.EventType.TOUCH_CANCEL, this.onTouchEnd, this);
        // Optional: Reset scale or visual feedback here
        this._dragging = false;
    }

    returnToStart() {
        this.node.parent = this._startParent;
        this.node.setPosition(0, 0, 0);

        const dirX = Math.sign(this.node.scale.x);
        this.node.setScale(new Vec3(this._containerScale * dirX, this._containerScale, 1));

        if (this._lastAnchorSlot) {
            this.board.placeBlock(this._lastAnchorSlot, this.shapeOffsets);
        }
    }
}


