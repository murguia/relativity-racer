export interface Geometry {
    readonly dimension: number
    metric(x: number[]): number[][]
    inverseMetric?(x: number[]): number[][]
    christoffel?(x: number[]): number[][][]
    getThrustVector?(x: number[], thrust: number, orientation: number): number[]
}
