export interface Geometry {
    readonly dimension: number
    metric(x: number[]): number[][]
    inverseMetric?(x: number[]): number[][]
    christoffel?(x: number[]): number[][][]
}
