# Relativity Racer: Milestone 3 - Relativistic Spacetime & Twin Paradox

This milestone dramatically pivots the engine from a spatial geodesic simulator into a **spacetime geodesic simulator**. By implementing a Lorentzian Minkowski Metric and calculating proper time accumulation, the engine naturally simulates Special Relativity effects, without hardcoding any relativistic formulas like the Lorentz factor \gamma.

## Architecture

1. **State Engine (RelativisticState):** The state `[x, v]` was extended with an optional proper time scalar `tau`. Integrators (`Euler`, `RK4`) were upgraded to seamlessly integrate proper time alongside coordinates if provided.
2. **Minkowski1DGeometry:** A new geometry class defining flat 1+1D spacetime with the metric tensor `g = [[-1, 0], [0, 1]]` and zero Christoffel symbols.
3. **RelativisticDynamics:** A dynamics wrapper that calculates the standard intrinsic acceleration $dv$ and concurrently calculates proper time evolution $d\tau = \sqrt{-g_{\mu\nu} v^\mu v^\nu}$ at each numerical integration step.
4. **Renderer Updates:** The UI was completely rehoused to support toggling between two different renderers: the 3D `CanvasRenderer` for spherical manifolds, and a new `SpacetimeRenderer` that projects worldlines onto a Spacetime Diagram (t, x) with accurate lightcones.

## Verification

In this milestone, we demonstrate the numerical proof of Special Relativity time dilation:
- **Proper Speed Invariance:** The diagnostics check continuously evaluates $g_{ij} v^i v^j$. For a massive timelike particle, this invariant proper speed squared always equals precisely `-1.00000`, regardless of how fast the particle is traveling in coordinate time.
- **Twin Paradox:** A numerical demonstration of the classic paradox. Particle A remains stationary at `[x=0]`. Particle B travels away at `v=0.8c`, abruptly turns around, and returns. Upon reunion at `t=10`, Particle A has accumulated `10.0` years of proper time, while Particle B has accumulated only `6.0` years.

## Running the App
The Vite server should be natively running at `http://localhost:5173`. Use the dropdown to jump between Milestone 1/2's Spatial Spheres and Milestone 3's Spacetime Diagrams!
