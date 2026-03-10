import './style.css'
import type { State } from './State'
import { SphereGeometry } from './geometry/SphereGeometry'
import { Minkowski1DGeometry } from './geometry/Minkowski1DGeometry'
import { SchwarzschildGeometry } from './geometry/SchwarzschildGeometry'
import { Euler } from './Euler'
import { RK4 } from './RK4'
import { CanvasRenderer } from './CanvasRenderer'
import { SpacetimeRenderer } from './SpacetimeRenderer'
import { SchwarzschildRenderer } from './SchwarzschildRenderer'
import { TransportDynamics } from './TransportDynamics'
import { RelativisticDynamics } from './RelativisticDynamics'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div style="display: flex; gap: 20px; padding: 20px; font-family: sans-serif; color: white;">
    <div>
      <canvas id="simCanvas" width="800" height="600" style="border: 1px solid #444; background: #1e1e1e;"></canvas>
    </div>
    <div style="display: flex; flex-direction: column; gap: 10px; width: 350px; max-height: 800px; overflow-y: auto;">
      <h2>Relativity Racer</h2>
      
      <label>Simulation Mode:
        <select id="simMode" style="width: 100%; padding: 5px; margin-top: 5px;">
          <option value="sphere">Milestone 1/2: Spatial Geodesics</option>
          <option value="spacetime">Milestone 3: Relativistic Spacetime</option>
          <option value="gravity" selected>Milestone 4: Point Mass Gravity</option>
        </select>
      </label>
      
      <hr style="width: 100%; border-color: #333; margin: 10px 0;">

      <div id="sphereControls" style="display: none;">
        <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px;">
          <button id="presetEquator">Equator</button>
          <button id="presetMeridian">Meridian</button>
          <button id="presetGeneric">Generic</button>
          <button id="presetHolonomy" style="background: #17a2b8; color: white; border: none;">Holonomy Triangle</button>
        </div>

        <label>Initial &theta;: <input type="number" id="initTheta" value="1.570796" step="0.1" /></label>
        <label>Initial &phi;: <input type="number" id="initPhi" value="0" step="0.1" /></label>
        <label>Initial v<sub>&theta;</sub>: <input type="number" id="initVTheta" value="0.5" step="0.1" /></label>
        <label>Initial v<sub>&phi;</sub>: <input type="number" id="initVPhi" value="0.2" step="0.1" /></label>
        <label style="margin-top: 5px;">
          <input type="checkbox" id="showVector" checked /> Show Transported Vector
        </label>
      </div>

      <div id="spacetimeControls" style="display: none;">
        <div style="display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px;">
          <button id="presetTwin" style="background: #e83e8c; color: white; border: none;">Twin Paradox</button>
        </div>
        <p style="font-size: 13px; color: #aaa;">
          Simulates particle A (stationary) and particle B (traveling 0.8c).
        </p>
      </div>

      <div id="gravityControls">
        <label>Central Mass (M): <input type="number" id="massM" value="1" step="0.5" /></label>
        
        <div style="display: flex; gap: 5px; flex-wrap: wrap; margin: 10px 0;">
          <button id="presetGravityApproach">Approach</button>
          <button id="presetGravitySlingshot">Slingshot</button>
          <button id="presetGravityOrbit">Orbit (Time Dilation)</button>
        </div>

        <label>Initial R: <input type="number" id="initR" value="30" step="1" /></label>
        <label>Initial &phi;: <input type="number" id="initGravPhi" value="0" step="0.1" /></label>
        <label>Initial v<sub>r</sub>: <input type="number" id="initVR" value="-0.2" step="0.05" /></label>
        <label>Initial v<sub>&phi;</sub>: <input type="number" id="initGPhi" value="0.005" step="0.001" /></label>
        <p style="font-size: 12px; color: #aaa;">Note: v_t is initialized to 1.0 (coordinate time rate).</p>
      </div>

      <hr style="width: 100%; border-color: #333; margin: 10px 0;">

      <label>Timestep (dt): <input type="number" id="dt" value="0.05" step="0.01" /></label>
      
      <label>Integrator:
        <select id="integratorType">
          <option value="euler">Euler</option>
          <option value="rk4" selected>RK4</option>
        </select>
      </label>

      <div style="display: flex; gap: 10px; margin-top: 10px;">
        <button id="btnPlay" style="background: #28a745; color: white; border: none;">Play</button>
        <button id="btnPause" style="background: #ffc107; color: black; border: none;">Pause</button>
        <button id="btnReset" style="background: #dc3545; color: white; border: none;">Reset</button>
      </div>
      
      <div id="status" style="margin-top: 20px; font-family: monospace; font-size: 14px; white-space: pre-wrap; background: #222; padding: 10px; border-radius: 4px;"></div>
    </div>
  </div>
`

// Core Integrators
const euler = new Euler()
const rk4 = new RK4()

// UI Connections
const simMode = document.getElementById('simMode') as HTMLSelectElement
const sphereControls = document.getElementById('sphereControls') as HTMLDivElement
const spacetimeControls = document.getElementById('spacetimeControls') as HTMLDivElement
const gravityControls = document.getElementById('gravityControls') as HTMLDivElement
const inputDt = document.getElementById('dt') as HTMLInputElement
const selectInt = document.getElementById('integratorType') as HTMLSelectElement
const statusDiv = document.getElementById('status') as HTMLDivElement

const canvas = document.getElementById('simCanvas') as HTMLCanvasElement

// --- SPHERE MODULE ---
const sphereGeometry = new SphereGeometry()
const sphereDynamics = new TransportDynamics(sphereGeometry)
const sphericalToCartesian = (x: number[]): [number, number, number] => [Math.sin(x[0]) * Math.cos(x[1]), Math.sin(x[0]) * Math.sin(x[1]), Math.cos(x[0])]
const canvasRenderer = new CanvasRenderer(canvas, sphericalToCartesian)
let sphereState: State = { x: [1.57, 0], v: [0.5, 0.2] }
let isTriangleDemo = false; let trianglePhase = 0; let initialVector: number[] | null = null; let initialPosition: number[] | null = null; let currentHolonomy: number | null = null

// --- SPACETIME MODULE ---
const minkowskiGeometry = new Minkowski1DGeometry()
const minkowskiDynamics = new RelativisticDynamics(minkowskiGeometry)
const spacetimeRenderer = new SpacetimeRenderer(canvas)
let twinA: State = { x: [0, 0], v: [1, 0], tau: 0 }
let twinB: State = { x: [0, 0], v: [1, 0], tau: 0 }
let historyA: number[][] = []; let historyB: number[][] = []

// --- GRAVITY MODULE ---
let gravityGeometry = new SchwarzschildGeometry(1)
let gravityDynamics = new RelativisticDynamics(gravityGeometry)
const gravityRenderer = new SchwarzschildRenderer(canvas, 1)
let gravityState: State = { x: [0, 30, 0], v: [1, -0.2, 0.005], tau: 0 }
let gravityHistory: number[][] = []

// Globals
let mode: 'sphere' | 'spacetime' | 'gravity' = 'gravity'
let isPlaying = false
let time = 0

simMode.addEventListener('change', () => {
  mode = simMode.value as any
  sphereControls.style.display = mode === 'sphere' ? 'block' : 'none'
  spacetimeControls.style.display = mode === 'spacetime' ? 'block' : 'none'
  gravityControls.style.display = mode === 'gravity' ? 'block' : 'none'
  document.getElementById('btnReset')!.click()
})

// Update Mass dynamically
document.getElementById('massM')!.addEventListener('input', (e) => {
  const M = parseFloat((e.target as HTMLInputElement).value)
  gravityGeometry = new SchwarzschildGeometry(M)
  gravityDynamics = new RelativisticDynamics(gravityGeometry)
  gravityRenderer.setMass(M)
  render()
})

function render() {
  if (mode === 'sphere') {
    canvasRenderer.drawState(sphereState)
    if (isTriangleDemo && initialPosition && initialVector) canvasRenderer.drawVector(initialPosition, initialVector, 'rgba(255, 255, 255, 0.5)')
  } else if (mode === 'spacetime') {
    spacetimeRenderer.clear()
    spacetimeRenderer.drawDiagram()
    spacetimeRenderer.drawWorldline(historyA, '#aaaaaa')
    spacetimeRenderer.drawWorldline(historyB, '#ff4444')
  } else if (mode === 'gravity') {
    gravityRenderer.clear()
    gravityRenderer.drawEnvironment()
    gravityRenderer.drawState(gravityState, gravityHistory)
  }
}

function updateStatus() {
  if (mode === 'sphere') {
    let speedSq = 0
    const metric = sphereGeometry.metric(sphereState.x)
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) speedSq += metric[i][j] * sphereState.v[i] * sphereState.v[j]
    let hHtml = ''
    if (sphereState.carriedVectors?.length) {
      hHtml = `\n<span style="color: #ffff88;">Transported Vector</span>\nV(t): [${sphereState.carriedVectors[0][0].toFixed(3)}, ${sphereState.carriedVectors[0][1].toFixed(3)}]`
      if (currentHolonomy !== null) hHtml += `\nHolonomy Angle: <b>${(currentHolonomy * 180 / Math.PI).toFixed(2)}&deg;</b>`
    }
    statusDiv.innerHTML = `Time: ${time.toFixed(2)}\n\nIntrinsic State (&theta;, &phi;)\nPosition: [${sphereState.x[0].toFixed(3)}, ${sphereState.x[1].toFixed(3)}]\nVelocity: [${sphereState.v[0].toFixed(3)}, ${sphereState.v[1].toFixed(3)}]${hHtml}\n\ng_ij v^i v^j: ${speedSq.toFixed(5)}`
  } else if (mode === 'spacetime') {
    let speedSqA = 0, speedSqB = 0
    const mA = minkowskiGeometry.metric(twinA.x)
    const mB = minkowskiGeometry.metric(twinB.x)
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      speedSqA += mA[i][j] * twinA.v[i] * twinA.v[j]
      speedSqB += mB[i][j] * twinB.v[i] * twinB.v[j]
    }
    statusDiv.innerHTML = `Coordinate Time: ${twinA.x[0].toFixed(2)}\n        
<span style="color:#aaaaaa;">Particle A (Stationary)</span>
Position (t,x): [${twinA.x[0].toFixed(2)}, ${twinA.x[1].toFixed(2)}]
Velocity (dt,dx): [${twinA.v[0].toFixed(2)}, ${twinA.v[1].toFixed(2)}]
Proper Time &tau;: ${twinA.tau?.toFixed(3)}
Speed Sq: ${speedSqA.toFixed(3)}

<span style="color:#ff4444;">Particle B (Traveling)</span>
Position (t,x): [${twinB.x[0].toFixed(2)}, ${twinB.x[1].toFixed(2)}]
Velocity (dt,dx): [${twinB.v[0].toFixed(2)}, ${twinB.v[1].toFixed(2)}]
Proper Time &tau;: ${twinB.tau?.toFixed(3)}
Speed Sq: ${speedSqB.toFixed(3)}`
  } else if (mode === 'gravity') {
    let speedSq = 0
    const metric = gravityGeometry.metric(gravityState.x)
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) speedSq += metric[i][j] * gravityState.v[i] * gravityState.v[j]

    // Calculate gravitational time dilation (dt/dtau vs t)
    // If at rest near mass M, dtau/dt = sqrt(-g_tt) = sqrt(1 - 2M/r)
    const M = gravityGeometry.mass
    const r = gravityState.x[1]
    const dilationFactor = Math.sqrt(Math.max(0, 1 - 2 * M / r))

    statusDiv.innerHTML = `External Parameter &lambda;: ${time.toFixed(2)}
        
Coordinate Time (t): ${gravityState.x[0].toFixed(3)}
Proper Time (&tau;): ${gravityState.tau?.toFixed(3)}

Coordinates (r, &phi;): [${r.toFixed(3)}, ${gravityState.x[2].toFixed(3)}]
Velocity (v_r, v_&phi;): [${gravityState.v[1].toFixed(5)}, ${gravityState.v[2].toFixed(5)}]

Expected Time Dilation (at rest): ${dilationFactor.toFixed(4)}x
Proper Speed Sq (g_ij v^i v^j): ${speedSq.toFixed(5)}`
  }
}

// Spherical specific util
function calculate3DAngle(x1: number[], v1: number[], x2: number[], v2: number[]): number {
  const to3D = (th: number, ph: number, vth: number, vph: number) => {
    const ex = [Math.cos(th) * Math.cos(ph), Math.cos(th) * Math.sin(ph), -Math.sin(th)]
    const ephi = [-Math.sin(th) * Math.sin(ph), Math.sin(th) * Math.cos(ph), 0]
    return [vth * ex[0] + vph * ephi[0], vth * ex[1] + vph * ephi[1], vth * ex[2] + vph * ephi[2]]
  }
  const vec1 = to3D(x1[0], x1[1], v1[0], v1[1])
  const vec2 = to3D(x2[0], x2[1], v2[0], v2[1])
  let dot = 0, n1 = 0, n2 = 0
  for (let i = 0; i < 3; i++) { dot += vec1[i] * vec2[i]; n1 += vec1[i] * vec1[i]; n2 += vec2[i] * vec2[i] }
  return Math.acos(Math.max(-1, Math.min(1, dot / Math.sqrt(n1 * n2))))
}

function tick() {
  if (!isPlaying) return
  let dt = parseFloat(inputDt.value)
  const integrator = selectInt.value === 'rk4' ? rk4 : euler

  if (mode === 'sphere') {
    if (isTriangleDemo) {
      if (trianglePhase === 0 && sphereState.x[0] + sphereState.v[0] * dt >= Math.PI / 2) dt = Math.max(0, (Math.PI / 2 - sphereState.x[0]) / sphereState.v[0])
      else if (trianglePhase === 1 && sphereState.x[1] + sphereState.v[1] * dt >= Math.PI / 2) dt = Math.max(0, (Math.PI / 2 - sphereState.x[1]) / sphereState.v[1])
      else if (trianglePhase === 2 && sphereState.x[0] + sphereState.v[0] * dt <= 0.001) dt = Math.max(0, (0.001 - sphereState.x[0]) / sphereState.v[0])
    }
    if (dt > 1e-6) {
      sphereState = integrator.step(sphereState, sphereDynamics, dt)
      time += dt
    }
    if (isTriangleDemo) {
      if (trianglePhase === 0 && Math.abs(sphereState.x[0] - Math.PI / 2) < 1e-4) {
        trianglePhase = 1; const speed = Math.sqrt(sphereGeometry.metric(sphereState.x)[0][0] * sphereState.v[0] * sphereState.v[0])
        sphereState.v = [0, speed]; sphereState.x[0] = Math.PI / 2
      } else if (trianglePhase === 1 && Math.abs(sphereState.x[1] - Math.PI / 2) < 1e-4) {
        trianglePhase = 2; const speed = Math.sqrt(sphereGeometry.metric(sphereState.x)[1][1] * sphereState.v[1] * sphereState.v[1])
        sphereState.v = [-speed, 0]; sphereState.x[1] = Math.PI / 2
      } else if (trianglePhase === 2 && Math.abs(sphereState.x[0] - 0.001) < 1e-4) {
        trianglePhase = 3; isPlaying = false; sphereState.v = [0, 0]; sphereState.x[0] = 0.001
        if (initialVector && initialPosition && sphereState.carriedVectors) currentHolonomy = calculate3DAngle(initialPosition, initialVector, sphereState.x, sphereState.carriedVectors[0])
      }
    }
  } else if (mode === 'spacetime') {
    if (dt > 1e-6) {
      twinA = integrator.step(twinA, minkowskiDynamics, dt)
      twinB = integrator.step(twinB, minkowskiDynamics, dt)
      historyA.push([...twinA.x])
      historyB.push([...twinB.x])
      time += dt
    }
    if (twinB.x[1] > 4 && twinB.v[1] > 0) twinB.v = [1, -0.8]
    if (twinB.x[1] <= 0 && twinB.v[1] < 0 && twinB.x[0] > 1) { isPlaying = false; twinB.x[1] = 0; twinB.v = [1, 0] }
  } else if (mode === 'gravity') {
    if (dt > 1e-6) {
      gravityState = integrator.step(gravityState, gravityDynamics, dt)
      gravityHistory.push([...gravityState.x])
      time += dt

      // Auto pause if falls into black hole horizon
      if (gravityState.x[1] <= 2.05 * gravityGeometry.mass) {
        isPlaying = false
      }
    }
  }

  render()
  updateStatus()
  if (isPlaying) requestAnimationFrame(tick)
}

document.getElementById('btnPlay')!.addEventListener('click', () => { if (!isPlaying) { isPlaying = true; requestAnimationFrame(tick) } })
document.getElementById('btnPause')!.addEventListener('click', () => { isPlaying = false })
document.getElementById('btnReset')!.addEventListener('click', () => {
  isPlaying = false; time = 0
  if (mode === 'sphere') {
    sphereState = { x: [parseFloat((document.getElementById('initTheta') as HTMLInputElement).value), parseFloat((document.getElementById('initPhi') as HTMLInputElement).value)], v: [parseFloat((document.getElementById('initVTheta') as HTMLInputElement).value), parseFloat((document.getElementById('initVPhi') as HTMLInputElement).value)] }
    isTriangleDemo = false; trianglePhase = 0; currentHolonomy = null; initialVector = null
    if ((document.getElementById('showVector') as HTMLInputElement)?.checked) sphereState.carriedVectors = [[0.5, 0.5]]
    canvasRenderer.resetHistory()
  } else if (mode === 'spacetime') {
    twinA = { x: [0, 0], v: [1, 0], tau: 0 }; twinB = { x: [0, 0], v: [1, 0], tau: 0 }
    historyA = [[0, 0]]; historyB = [[0, 0]]
  } else if (mode === 'gravity') {
    gravityState = {
      x: [0, parseFloat((document.getElementById('initR') as HTMLInputElement).value), parseFloat((document.getElementById('initGravPhi') as HTMLInputElement).value)],
      v: [1, parseFloat((document.getElementById('initVR') as HTMLInputElement).value), parseFloat((document.getElementById('initGPhi') as HTMLInputElement).value)],
      tau: 0
    }
    gravityHistory = [[...gravityState.x]]
  }
  render()
  updateStatus()
})

const applySpherePreset = (t: number, p: number, vt: number, vp: number, demo = false) => {
  (document.getElementById('initTheta') as HTMLInputElement).value = t.toString(); (document.getElementById('initPhi') as HTMLInputElement).value = p.toString();
  (document.getElementById('initVTheta') as HTMLInputElement).value = vt.toString(); (document.getElementById('initVPhi') as HTMLInputElement).value = vp.toString();
  document.getElementById('btnReset')!.click()
  isTriangleDemo = demo; trianglePhase = 0; currentHolonomy = null
  if (demo && sphereState.carriedVectors) {
    sphereState.carriedVectors = [[0, 1 / Math.sin(sphereState.x[0])]]; initialPosition = [...sphereState.x]; initialVector = [...sphereState.carriedVectors[0]]
    render()
  }
}
document.getElementById('presetEquator')!.addEventListener('click', () => applySpherePreset(Math.PI / 2, 0, 0, 0.5))
document.getElementById('presetMeridian')!.addEventListener('click', () => applySpherePreset(Math.PI / 2, 0, 0.5, 0))
document.getElementById('presetGeneric')!.addEventListener('click', () => applySpherePreset(Math.PI / 4, 0, 0.3, 0.8))
document.getElementById('presetHolonomy')!.addEventListener('click', () => { applySpherePreset(0.001, 0, 0.5, 0, true); document.getElementById('btnPlay')!.click() })

document.getElementById('presetTwin')!.addEventListener('click', () => {
  document.getElementById('btnReset')!.click(); twinA = { x: [0, 0], v: [1, 0], tau: 0 }; twinB = { x: [0, 0], v: [1, 0.8], tau: 0 }; document.getElementById('btnPlay')!.click()
})

const applyGravityPreset = (r: number, phi: number, vr: number, vphi: number) => {
  (document.getElementById('initR') as HTMLInputElement).value = r.toString(); (document.getElementById('initGravPhi') as HTMLInputElement).value = phi.toString();
  (document.getElementById('initVR') as HTMLInputElement).value = vr.toString(); (document.getElementById('initGPhi') as HTMLInputElement).value = vphi.toString();
  document.getElementById('btnReset')!.click()
  document.getElementById('btnPlay')!.click()
}
// Gravitational approach (falling inside)
document.getElementById('presetGravityApproach')!.addEventListener('click', () => applyGravityPreset(30, 0, -0.4, 0.002))
// Slingshot around the black hole (strong bending)
document.getElementById('presetGravitySlingshot')!.addEventListener('click', () => applyGravityPreset(30, 0, -0.6, 0.012))
// Stable Circular Orbit (v_phi = sqrt(M/R^3)). If M=1, R=20 -> sqrt(1/8000) = 0.01118
document.getElementById('presetGravityOrbit')!.addEventListener('click', () => {
  const M = parseFloat((document.getElementById('massM') as HTMLInputElement).value) || 1
  const R = 20
  const v_phi = Math.sqrt(M / (R * R * R))
  applyGravityPreset(R, 0, 0, v_phi)
})

document.getElementById('btnReset')!.click()
