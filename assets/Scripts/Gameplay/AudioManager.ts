import { _decorator, Component, AudioClip, AudioSource } from 'cc';
import { GlobalEvent, GameEvents } from '../Core/EventManager';
import { StorageManager } from '../Utils/StorageManager';

const { ccclass, property } = _decorator;

@ccclass('AudioManager')
export class AudioManager extends Component {

    @property(AudioSource)
    public bgmSource: AudioSource = null!;

    @property(AudioSource)
    public sfxSource: AudioSource = null!;

    @property({ type: AudioClip })
    public bgmClip: AudioClip = null!;

    @property({ type: AudioClip })
    public dropSuccessClip: AudioClip = null!;

    @property({ type: AudioClip })
    public levelWinClip: AudioClip = null!;

    @property({ type: AudioClip })
    public clickClip: AudioClip = null!;

    onLoad() {
        StorageManager.loadData();
        this.updateMuteState();

        // Listen to game events
        GlobalEvent.on(GameEvents.BLOCK_PLACED_CORRECTLY, this.playDropSound, this);
        GlobalEvent.on(GameEvents.LEVEL_COMPLETED, this.playWinSound, this);
        // If you have a general click event, bind it here too
    }

    start() {
        if (this.bgmClip && this.bgmSource) {
            this.bgmSource.clip = this.bgmClip;
            this.bgmSource.loop = true;
            this.bgmSource.play();
        }
    }

    onDestroy() {
        GlobalEvent.off(GameEvents.BLOCK_PLACED_CORRECTLY, this.playDropSound, this);
        GlobalEvent.off(GameEvents.LEVEL_COMPLETED, this.playWinSound, this);
    }

    private playDropSound() {
        this.playSFX(this.dropSuccessClip);
    }

    private playWinSound() {
        this.playSFX(this.levelWinClip);
    }

    public playClick() {
        this.playSFX(this.clickClip);
    }

    private playSFX(clip: AudioClip) {
        if (StorageManager.isMuted || !clip || !this.sfxSource) return;
        this.sfxSource.playOneShot(clip);
    }

    public toggleMute() {
        StorageManager.isMuted = !StorageManager.isMuted;
        this.updateMuteState();
    }

    private updateMuteState() {
        const isMuted = StorageManager.isMuted;
        if (this.bgmSource) this.bgmSource.volume = isMuted ? 0 : 0.5;
        if (this.sfxSource) this.sfxSource.volume = isMuted ? 0 : 1;
    }
}