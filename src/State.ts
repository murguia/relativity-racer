export type TrajectoryType = 'Timelike' | 'Null'

export interface State {
    x: number[] // Position [t, r, phi] (or equivalent coordinates)
    v: number[] // Velocity [v^t, v^r, v^phi]
    carriedVectors?: number[][] // Optional transported vectors
    tau?: number // Optional Proper time
}

export interface RelativisticState extends State {
    tau: number
}
