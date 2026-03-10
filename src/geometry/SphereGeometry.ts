import type { Geometry } from '../Geometry'

export class SphereGeometry implements Geometry {
    dimension = 2

    metric(x: number[]): number[][] {
        const theta = x[0]
        return [
            [1, 0],
            [0, Math.pow(Math.sin(theta), 2)]
        ]
    }

    analyticInverseMetric(x: number[]): number[][] {
        const theta = x[0]
        const sinThetaSq = Math.pow(Math.sin(theta), 2)
        // Avoid division by zero at the poles
        const invSinThetaSq = sinThetaSq < 1e-10 ? 1e10 : 1 / sinThetaSq

        return [
            [1, 0],
            [0, invSinThetaSq]
        ]
    }

    analyticChristoffel(x: number[]): number[][][] {
        const theta = x[0]
        const sinTheta = Math.sin(theta)
        const cosTheta = Math.cos(theta)

        // Γ^i_{jk}
        const gamma = [
            [ // i = 0 (theta)
                [0, 0], // j = 0
                [0, 0]  // j = 1
            ],
            [ // i = 1 (phi)
                [0, 0], // j = 0
                [0, 0]  // j = 1
            ]
        ]

        // Γ^theta_{phi phi} = -sin(theta) cos(theta)
        gamma[0][1][1] = -sinTheta * cosTheta

        // Γ^phi_{theta phi} = Γ^phi_{phi theta} = cot(theta)
        let cotTheta = 0
        if (Math.abs(sinTheta) > 1e-10) {
            cotTheta = cosTheta / sinTheta
        }

        gamma[1][0][1] = cotTheta
        gamma[1][1][0] = cotTheta

        return gamma
    }
}
