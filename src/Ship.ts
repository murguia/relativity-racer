import type { State } from './State'

export interface Ship extends State {
    id: string
    orientation: number // heading in radians
    thrust: number      // forward acceleration magnitude
    trail: number[][]   // past positions for rendering
}
