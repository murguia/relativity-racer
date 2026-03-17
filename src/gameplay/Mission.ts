import type { Ship } from '../Ship';
import type { Checkpoint } from './Checkpoint';

export interface MissionContext {
    ship: Ship;
    coordinateTime: number;
    properTime: number;
    checkpoints: Checkpoint[];
}

export interface Mission {
    id: string;
    title: string;
    description: string;
    
    // Checkpoints will be evaluated in strict order
    checkpoints: Checkpoint[];

    setup(ctx: MissionContext): void;
    update(ctx: MissionContext, dt: number): void;
    isComplete(ctx: MissionContext): boolean;
}
