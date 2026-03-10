import type { Geometry } from '../Geometry'

export class Minkowski1DGeometry implements Geometry {
    readonly dimension = 2 // (t, x)

    metric(x: number[]): number[][] {
        return [
            [-1, 0],
            [0, 1]
        ]
    }

    inverseMetric(x: number[]): number[][] {
        return [
            [-1, 0],
            [0, 1]
        ]
    }

    christoffel(x: number[]): number[][][] {
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
