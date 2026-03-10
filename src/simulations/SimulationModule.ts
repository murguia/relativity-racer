import type { Integrator } from '../Integrator'

export interface Preset {
    name: string
    apply(): void
}

export interface SimulationModule {
    id: string
    title: string
    description: string
    category: string
    presets?: Preset[]

    setup(canvas: HTMLCanvasElement): void
    createControls(container: HTMLElement): void
    reset(): void

    updateState(dt: number, integrator: Integrator): { isRunning: boolean }
    renderState(): void
    getStatus(time: number): string
}
