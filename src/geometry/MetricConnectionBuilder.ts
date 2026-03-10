import type { Geometry } from '../Geometry'

export class MetricConnectionBuilder {
    private static EPSILON = 1e-5

    /**
     * Inverts an NxN matrix using Gaussian elimination with partial pivoting.
     * Returns a new inverted matrix.
     */
    static invertMatrix(matrix: number[][]): number[][] {
        const n = matrix.length

        // Handle 1x1 case explicitly
        if (n === 1) {
            return [[1 / matrix[0][0]]]
        }

        // Handle 2x2 case explicitly for speed
        if (n === 2) {
            const [[a, b], [c, d]] = matrix
            const det = a * d - b * c
            if (Math.abs(det) < 1e-15) throw new Error("Singular matrix found during inversion")
            return [
                [d / det, -b / det],
                [-c / det, a / det]
            ]
        }

        // Handle general NxN case (should rarely be needed if we stick to 2D/3D metrics)
        const aug = matrix.map((row, i) => {
            const newRow = [...row]
            for (let j = 0; j < n; j++) {
                newRow.push(i === j ? 1 : 0)
            }
            return newRow
        })

        for (let i = 0; i < n; i++) {
            let maxEl = Math.abs(aug[i][i])
            let maxRow = i
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(aug[k][i]) > maxEl) {
                    maxEl = Math.abs(aug[k][i])
                    maxRow = k
                }
            }

            if (maxEl < 1e-15) {
                throw new Error("Matrix is singular!")
            }

            // Swap maximum row with current row
            const tmp = aug[maxRow]
            aug[maxRow] = aug[i]
            aug[i] = tmp

            // Make all rows below this one 0 in current column
            for (let k = i + 1; k < n; k++) {
                const c = -aug[k][i] / aug[i][i]
                for (let j = i; j < 2 * n; j++) {
                    if (i === j) {
                        aug[k][j] = 0
                    } else {
                        aug[k][j] += c * aug[i][j]
                    }
                }
            }
        }

        // Solve equation Ax=b for an upper triangular matrix A
        for (let i = n - 1; i >= 0; i--) {
            const diag = aug[i][i]
            for (let j = 0; j < 2 * n; j++) {
                aug[i][j] /= diag
            }
            for (let k = i - 1; k >= 0; k--) {
                const c = -aug[k][i]
                for (let j = 0; j < 2 * n; j++) {
                    aug[k][j] += c * aug[i][j]
                }
            }
        }

        return aug.map(row => row.slice(n))
    }

    /**
     * Approximates the partial derivative of the metric tensor: \partial_k g_{ij}
     * using central finite differences.
     */
    static partialDerivativeMetric(geometry: Geometry, x: number[], k: number, i: number, j: number): number {
        const xPos = [...x]
        const xNeg = [...x]

        xPos[k] += this.EPSILON
        xNeg[k] -= this.EPSILON

        const gPos = geometry.metric(xPos)
        const gNeg = geometry.metric(xNeg)

        return (gPos[i][j] - gNeg[i][j]) / (2 * this.EPSILON)
    }

    /**
     * Computes the Christoffel symbols of the second kind:
     * \Gamma^\mu_{\alpha\beta} = 1/2 * g^{\mu\nu} * (\partial_\alpha g_{\beta\nu} + \partial_\beta g_{\alpha\nu} - \partial_\nu g_{\alpha\beta})
     */
    static computeChristoffel(geometry: Geometry, x: number[]): number[][][] {
        const dim = geometry.dimension

        // Get inverse metric
        let inverseMetric: number[][]
        if (geometry.inverseMetric) {
            inverseMetric = geometry.inverseMetric(x)
        } else {
            inverseMetric = this.invertMatrix(geometry.metric(x))
        }

        // Initialize 3D tensor
        const gamma: number[][][] = new Array(dim)
            .fill(0)
            .map(() => new Array(dim).fill(0).map(() => new Array(dim).fill(0)))

        // Precompute all required partial derivatives: dMetric[k][i][j] = \partial_k g_{ij}
        const dMetric: number[][][] = new Array(dim)
            .fill(0)
            .map(() => new Array(dim).fill(0).map(() => new Array(dim).fill(0)))

        for (let k = 0; k < dim; k++) {
            for (let i = 0; i < dim; i++) {
                for (let j = 0; j < dim; j++) { // Using j <= i to exploit symmetry if needed, but computing all for simplicity
                    dMetric[k][i][j] = this.partialDerivativeMetric(geometry, x, k, i, j)
                }
            }
        }

        // Compute \Gamma^\mu_{\alpha\beta}
        for (let mu = 0; mu < dim; mu++) {
            for (let alpha = 0; alpha < dim; alpha++) {
                for (let beta = 0; beta < dim; beta++) {
                    let sum = 0
                    for (let nu = 0; nu < dim; nu++) {
                        const term = dMetric[alpha][beta][nu] + dMetric[beta][alpha][nu] - dMetric[nu][alpha][beta]
                        sum += 0.5 * inverseMetric[mu][nu] * term
                    }
                    gamma[mu][alpha][beta] = sum
                }
            }
        }

        return gamma
    }
}
