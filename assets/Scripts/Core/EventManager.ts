import { _decorator, Component, Node, EventTarget } from 'cc';
const { ccclass, property } = _decorator;

export const GlobalEvent = new EventTarget();

export const GameEvents = {
    GAME_START: 'GAME_START',
    BLOCK_DROPPED: 'BLOCK_DROPPED',
    BLOCK_PLACED_CORRECTLY: 'BLOCK_PLACED_CORRECTLY',
    LOAD_LEVEL: 'LOAD_LEVEL',  
    LEVEL_LOADED: 'LEVEL_LOADED',  
    LEVEL_COMPLETED: 'LEVEL_COMPLETED',
    SHOW_LEVEL_COMPLETE: 'SHOW_LEVEL_COMPLETE',
    GAME_RESTART: 'GAME_RESTART',
    GAME_OVER: 'GAME_OVER',
};