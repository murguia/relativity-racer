export interface Checkpoint {
    id: string;
    /**
     * The position is expressed in INTRINSIC MANIFOLD COORDINATES of the active manifold (e.g., [r, phi]).
     * Do NOT use screen space or Cartesian coordinates.
     */
    position: number[];
    radius: number;
    reached: boolean;
}
