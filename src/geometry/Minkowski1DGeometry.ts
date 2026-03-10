import type { Geometry } from '../Geometry'

export class Minkowski1DGeometry implements Geometry {
    readonly dimension = 2 // (t, x)

    metric(_x: number[]): number[][] {
        return [
            [-1, 0],
            [0, 1]
        ]
    }

    inverseMetric(_x: number[]): number[][] {
        return [
            [-1, 0],
            [0, 1]
        ]
    }

    christoffel(_x: number[]): number[][][] {
        // Flat spacetime, all Christoffel symbols are zero
        return [
            [
                [0, 0],
                [0, 0]
            ],
            [
                [0, 0],
                [0, 0]
            ]
        ]
    }
}
