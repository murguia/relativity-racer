# Relativity Racer: Milestone 4 - Curved Spacetime & Gravitational Geodesics

This milestone completely integrates massive central bodies, bending flat Minkowski spacetime into curved Schwarzschild spacetime to naturally simulate particle gravitation and orbits.

## Architecture

1. **State Engine (RelativisticState):** Integrators natively continue to process proper time $\tau$ alongside the spatial coordinates $(r, \phi)$.
2. **SchwarzschildGeometry:** A new geometry class defining 2+1D curved spacetime with the metric tensor parameterizing a central mass $M$.
3. **RelativisticDynamics:** Proper Time $d\tau = \sqrt{-g_{\mu\nu} v^\mu v^\nu}$ is computed natively without hard-coding external metrics.
4. **Renderer Updates:** The UI was rehoused to support toggling between rendering 3D topological primitives (Sphere), 1+1D Spacetime Diagrams (Minkowski Twin Paradox), and 2D Polar Planes (Schwarzschild black holes).

## Verification

In this milestone, we demonstrate the numerical proof of General Relativity geodesics:
- **Proper Speed Invariance:** The diagnostics check continuously evaluates $g_{ij} v^i v^j$. For a massive timelike particle, this invariant proper speed squared always equals precisely `-1.000` everywhere outside the event horizon.
- **Gravitational Slingshots & Orbits:** Orbital mechanics natively emerge from straight-line geodesic integration through the non-zero Christoffel symbols computed over the field. No Newtonian $F=ma$ forces are applied!
- **Gravitational Time Dilation:** A particle parked at $r=20$ ticks its proper time clock significantly slower than coordinate time due to resting deeper in the gravitational potential well, completely absent of relative velocity.

## Running the App
The Vite server should be natively running at `http://localhost:5173`. Use the dropdown to jump between Milestone 1/2's Spatial Spheres and Milestone 3's Spacetime Diagrams!
