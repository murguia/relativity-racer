import type { Geometry } from './Geometry'

export class Flat2DGeometry implements Geometry {
    dimension = 2

    metric(_x: number[]): number[][] {
        return [
            [1, 0],
            [0, 1]
        ]
    }

    inverseMetric(_x: number[]): number[][] {
        return [
            [1, 0],
            [0, 1]
        ]
    }

    christoffel(_x: number[]): number[][][] {
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
