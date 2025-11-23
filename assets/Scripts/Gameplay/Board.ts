import { _decorator, Component, Node, Vec3, Vec2, Prefab, instantiate, UITransform } from 'cc';
import { Slot } from './Slot';
import { Constants } from '../Utils/Constants';
import { GlobalEvent, GameEvents } from '../Core/EventManager';

const { ccclass, property } = _decorator;

@ccclass('Board')
export class Board extends Component {

    @property(Prefab)
    slotPrefab : Prefab = null;

    @property(Node)
    slotContainer : Node = null;

    @property
    public slotSize: number = 40;

    @property
    private rows : number = 8;

    @property
    private columns : number = 8;

    private grid : Slot[][] = [];

    start() {
        this.generateGrid(this.rows, this.columns);
    }

    public generateGrid(_rows : number, _columns : number ) {
        this.rows = _rows;
        this.columns = _columns;
        this.grid = [];

        const scaleRatio = this.slotSize / Constants.EDITOR_SLOT_SIZE;

        const startX = -(_columns * this.slotSize) / 2 + (this.slotSize / 2);
        const startY = -(_rows * this.slotSize) / 2 + (this.slotSize / 2);

        for(let x = 0; x < _columns; x++) {
            this.grid[x] = [];
            for(let y = 0; y < _rows; y++) {
                const slotNode = instantiate(this.slotPrefab);
                slotNode.parent = this.slotContainer;
                slotNode.setScale(scaleRatio, scaleRatio, 1);
                slotNode.setPosition(
                    startX + x * this.slotSize, 
                    startY + y * this.slotSize
                );

                const slotComp = slotNode.getComponent(Slot);
                slotComp.init(x, y);
                this.grid[x][y] = slotComp;
            }
        }
    }

    public checkSnap(worldPos : Vec3, shapeOffsets : Vec2[]) : Slot | null {

        const anchorSlot = this.getClosestSlot(worldPos);
        if (!anchorSlot) return null;

        let canFit = true;
        
        for (const offset of shapeOffsets) {
            const targetX = anchorSlot.gridX + offset.x;
            const targetY = anchorSlot.gridY + offset.y;

            // Check bounds
            if (targetX < 0 || targetX >= this.columns || targetY < 0 || targetY >= this.rows) {
                canFit = false;
                break;
            }

            // Check if already occupied
            if (this.grid[targetX][targetY].isOccupied) {
                canFit = false;
                break;
            }
        }

        return canFit ? anchorSlot : null;
    }

    public placeBlock(anchorSlot : Slot, shapeOffsets : Vec2[] ) {
        for(const offset of shapeOffsets) {
            const x = anchorSlot.gridX + offset.x;
            const y = anchorSlot.gridY + offset.y;
            this.grid[x][y].setOccupied(true);
        }
        this,this.checkWinCondition();
    }

    public getClosestSlot(worldPos : Vec3): Slot | null {
        const localPos = this.slotContainer.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
        
        // Convert Local Pos to Grid Index
        // Logic: (Pos + GridHalfWidth) / SlotSize
        const gridWidth = this.columns * this.slotSize;
        const gridHeight = this.rows * this.slotSize;
        
        const rawX = (localPos.x + gridWidth / 2) / this.slotSize;
        const rawY = (localPos.y + gridHeight / 2) / this.slotSize;

        const x = Math.floor(rawX);
        const y = Math.floor(rawY);

        if (x >= 0 && x < this.columns && y >= 0 && y < this.rows) {
            return this.grid[x][y];
        }
        return null;
    }

    public checkWinCondition() {
        let allFilled = true;
        for(let x=0; x<this.columns; x++) {
            for(let y=0; y<this.rows; y++) {
                if(!this.grid[x][y].isOccupied) {
                    allFilled = false;
                    break;
                }
            }
        }
        if(allFilled) {
            console.log("Level Won!");
            GlobalEvent.emit(GameEvents.LEVEL_COMPLETED);
        }
    }
}


