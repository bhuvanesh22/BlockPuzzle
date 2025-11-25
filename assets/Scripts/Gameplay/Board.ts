import { _decorator, Component, Node, Vec3, Vec2, Prefab, instantiate, UITransform, color } from 'cc';
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

    public grid : Slot[][] = [];

    start() {
        // IMPORTANT: Leave this empty! 
        // We let the LevelDesigner call generateGrid() so we don't create a duplicate "Ghost" grid.
    }
    
    getCurrentRowAndColumnCount() : Vec2 {
        return new Vec2(this.rows, this.columns);
    }

    public generateGrid(_rows : number, _columns : number ) {
        this.rows = _rows;
        this.columns = _columns;
        
        // 1. Clean up any existing slots (Ghost slots)
        this.slotContainer.destroyAllChildren(); 
        this.grid = [];

        console.log(`Board: Generating Grid ${_rows} x ${_columns}`);

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

    /**
     * NEW: Resets the logical state of the grid.
     * Call this after LevelDesigner finishes generating the puzzle,
     * so the board is "Empty" and ready for the player.
     */
    public resetOccupancy() {
        for(let x = 0; x < this.columns; x++) {
            for(let y = 0; y < this.rows; y++) {
                if (this.grid[x] && this.grid[x][y]) {
                    this.grid[x][y].setOccupied(false);
                }
            }
        }
    }

    public checkOccupied(x: number, y: number): boolean {
        if (x < 0 || x >= this.columns || y < 0 || y >= this.rows) return true; 
        return this.grid[x][y].isOccupied;
    }

    public getSlot(x: number, y: number): Slot | null {
        if (x < 0 || x >= this.columns || y < 0 || y >= this.rows) return null;
        return this.grid[x][y];
    }

    public checkSnap(worldPos : Vec3, shapeOffsets : Vec2[]) : Slot | null {
        const anchorSlot = this.getClosestSlot(worldPos);
        if (!anchorSlot) return null;

        let canFit = true;
        for (const offset of shapeOffsets) {
            const targetX = anchorSlot.gridX + offset.x;
            const targetY = anchorSlot.gridY + offset.y;
            
            if (this.checkOccupied(targetX, targetY)) {
                canFit = false;
                break;
            }
        }
        return canFit ? anchorSlot : null;
    }

    public placeBlock(anchorSlot : Slot, shapeOffsets : Vec2[], checkWin: boolean = true ) {
        for(const offset of shapeOffsets) {
            const x = anchorSlot.gridX + offset.x;
            const y = anchorSlot.gridY + offset.y;
            if (x >= 0 && x < this.columns && y >= 0 && y < this.rows) {
                this.grid[x][y].setOccupied(true);
            }
        }
        if (checkWin) {
            this.checkWinCondition();
        }
    }

    public removeBlock(anchorSlot : Slot, shapeOffsets : Vec2[] ) {
        for(const offset of shapeOffsets) {
            const x = anchorSlot.gridX + offset.x;
            const y = anchorSlot.gridY + offset.y;
            if (x >= 0 && x < this.columns && y >= 0 && y < this.rows) {
                this.grid[x][y].setOccupied(false);
            }
        }
    }

    public getClosestSlot(worldPos : Vec3): Slot | null {
       const localPos = this.slotContainer.getComponent(UITransform).convertToNodeSpaceAR(worldPos);
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