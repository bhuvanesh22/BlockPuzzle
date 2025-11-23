import { _decorator, Component, Node, Vec3, Sprite, Color } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('Slot')
export class Slot extends Component {

    @property
    public gridX: number = 0;

    @property
    public gridY: number = 0;

    @property
    public isOccupied: boolean = false;

    private sprite : Sprite | null = null;

    protected onLoad(): void {
        this.sprite = this.getComponent(Sprite);
    }

    public init(x : number, y : number)
    {
        this.gridX = x;
        this.gridY = y;
        this.isOccupied = false;
    } 

    public setOccupied(occupied : boolean) {
        this.isOccupied = occupied;

        if(this.sprite) {
            this.sprite.color = occupied ? Color.GRAY : Color.WHITE;
        }
    }
    
}


