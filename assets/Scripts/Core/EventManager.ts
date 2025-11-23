import { _decorator, Component, Node, EventTarget } from 'cc';
const { ccclass, property } = _decorator;

export const GlobalEvent = new EventTarget();

export const GameEvents = {
    BLOCK_DROPPED: 'BLOCK_DROPPED',
    LEVEL_COMPLETED: 'LEVEL_COMPLETED',
    GAME_RESTART: 'GAME_RESTART',
};