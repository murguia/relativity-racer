import './style.css'
import type { State } from './State'
import { SphereGeometry } from './geometry/SphereGeometry'
import { Minkowski1DGeometry } from './geometry/Minkowski1DGeometry'
import { Euler } from './Euler'
import { RK4 } from './RK4'
import { CanvasRenderer } from './CanvasRenderer'
import { SpacetimeRenderer } from './SpacetimeRenderer'
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
          <option value="sphere" selected>Milestone 1/2: Spatial Geodesics</option>
          <option value="spacetime">Milestone 3: Relativistic Spacetime</option>
        </select>
      </label>
      
      <hr style="width: 100%; border-color: #333; margin: 10px 0;">

      <div id="sphereControls">
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

// Core
const euler = new Euler()
const rk4 = new RK4()

// Sphere setup
const sphereGeometry = new SphereGeometry()
const sphereDynamics = new TransportDynamics(sphereGeometry)
const sphericalToCartesian = (x: number[]): [number, number, number] => {
  return [Math.sin(x[0]) * Math.cos(x[1]), Math.sin(x[0]) * Math.sin(x[1]), Math.cos(x[0])]
}
const canvas = document.getElementById('simCanvas') as HTMLCanvasElement
const canvasRenderer = new CanvasRenderer(canvas, sphericalToCartesian)

// Spacetime setup
const minkowskiGeometry = new Minkowski1DGeometry()
const relativisticDynamics = new RelativisticDynamics(minkowskiGeometry)
const spacetimeRenderer = new SpacetimeRenderer(canvas)

// UI
const simMode = document.getElementById('simMode') as HTMLSelectElement
const sphereControls = document.getElementById('sphereControls') as HTMLDivElement
const spacetimeControls = document.getElementById('spacetimeControls') as HTMLDivElement
const inputTheta = document.getElementById('initTheta') as HTMLInputElement
const inputPhi = document.getElementById('initPhi') as HTMLInputElement
const inputVTheta = document.getElementById('initVTheta') as HTMLInputElement
const inputVPhi = document.getElementById('initVPhi') as HTMLInputElement
const inputDt = document.getElementById('dt') as HTMLInputElement
const selectInt = document.getElementById('integratorType') as HTMLSelectElement
const statusDiv = document.getElementById('status') as HTMLDivElement

// Globals
let mode: 'sphere' | 'spacetime' = 'sphere'
let isPlaying = false
let time = 0

// Sphere State
let sphereState: State = { x: [1.57, 0], v: [0.5, 0.2] }
let isTriangleDemo = false
let trianglePhase = 0
let initialVector: number[] | null = null
let initialPosition: number[] | null = null
let currentHolonomy: number | null = null

// Spacetime State
let twinA: State = { x: [0, 0], v: [1, 0], tau: 0 }
let twinB: State = { x: [0, 0], v: [1, 0], tau: 0 }
let historyA: number[][] = []
let historyB: number[][] = []

simMode.addEventListener('change', () => {
  mode = simMode.value as 'sphere' | 'spacetime'
  if (mode === 'sphere') {
    sphereControls.style.display = 'block'
    spacetimeControls.style.display = 'none'
  } else {
    sphereControls.style.display = 'none'
    spacetimeControls.style.display = 'block'
  }
  document.getElementById('btnReset')!.click()
})

function render() {
  if (mode === 'sphere') {
    canvasRenderer.drawState(sphereState)
    if (isTriangleDemo && initialPosition && initialVector) {
      canvasRenderer.drawVector(initialPosition, initialVector, 'rgba(255, 255, 255, 0.5)')
    }
  } else {
    spacetimeRenderer.clear()
    spacetimeRenderer.drawDiagram()
    spacetimeRenderer.drawWorldline(historyA, '#aaaaaa') // Stationary twin
    spacetimeRenderer.drawWorldline(historyB, '#ff4444') // Traveling twin
  }
}

function updateStatus() {
  if (mode === 'sphere') {
    let speedSq = 0
    const metric = sphereGeometry.metric(sphereState.x)
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) speedSq += metric[i][j] * sphereState.v[i] * sphereState.v[j]

    let hHtml = ''
    if (sphereState.carriedVectors?.length) {
      const V = sphereState.carriedVectors[0]
      hHtml = `\n<span style="color: #ffff88;">Transported Vector</span>\nV(t): [${V[0].toFixed(3)}, ${V[1].toFixed(3)}]`
      if (currentHolonomy !== null) hHtml += `\nHolonomy Angle: <b>${(currentHolonomy * 180 / Math.PI).toFixed(2)}&deg;</b>`
    }

    statusDiv.innerHTML = `Time: ${time.toFixed(2)}\n<span style="color:#bbb;">Intrinsic State (&theta;, &phi;)</span>\nPosition: [${sphereState.x[0].toFixed(3)}, ${sphereState.x[1].toFixed(3)}]\nVelocity: [${sphereState.v[0].toFixed(3)}, ${sphereState.v[1].toFixed(3)}]${hHtml}\n<span style="color:#ffaa88;">Diagnostics</span>\ng<sub>ij</sub> v<sup>i</sup> v<sup>j</sup>: <b>${speedSq.toFixed(5)}</b>`
  } else {
    // Spacetime diagnostics
    let speedSqA = 0, speedSqB = 0
    const mA = minkowskiGeometry.metric(twinA.x)
    const mB = minkowskiGeometry.metric(twinB.x)
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      speedSqA += mA[i][j] * twinA.v[i] * twinA.v[j]
      speedSqB += mB[i][j] * twinB.v[i] * twinB.v[j]
    }

    statusDiv.innerHTML = `Coordinate Time: ${twinA.x[0].toFixed(2)}
        
<span style="color:#aaaaaa;">Particle A (Stationary)</span>
Position (t,x): [${twinA.x[0].toFixed(2)}, ${twinA.x[1].toFixed(2)}]
Velocity (dt,dx): [${twinA.v[0].toFixed(2)}, ${twinA.v[1].toFixed(2)}]
<b>Proper Time &tau;: ${twinA.tau?.toFixed(3)}</b>
Proper Speed Sq: ${speedSqA.toFixed(3)}

<span style="color:#ff4444;">Particle B (Traveling)</span>
Position (t,x): [${twinB.x[0].toFixed(2)}, ${twinB.x[1].toFixed(2)}]
Velocity (dt,dx): [${twinB.v[0].toFixed(2)}, ${twinB.v[1].toFixed(2)}]
<b>Proper Time &tau;: ${twinB.tau?.toFixed(3)}</b>
Proper Speed Sq: ${speedSqB.toFixed(3)}`
  }
}

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
  } else {
    // Spacetime logic
    if (dt > 1e-6) {
      twinA = integrator.step(twinA, relativisticDynamics, dt)
      twinB = integrator.step(twinB, relativisticDynamics, dt)
      historyA.push([...twinA.x])
      historyB.push([...twinB.x])
    }

    // Twin Paradox Turnaround at x = 4
    if (twinB.x[1] > 4 && twinB.v[1] > 0) {
      // Instant acceleration backwards
      twinB.v = [1, -0.8]
    }
    // Reunion at x = 0
    if (twinB.x[1] <= 0 && twinB.v[1] < 0 && twinB.x[0] > 1) {
      isPlaying = false
      twinB.x[1] = 0 // clamp
      twinB.v = [1, 0] // rest
    }
  }

  render()
  updateStatus()
  if (isPlaying) requestAnimationFrame(tick)
}

document.getElementById('btnPlay')!.addEventListener('click', () => { if (!isPlaying) { isPlaying = true; requestAnimationFrame(tick) } })
document.getElementById('btnPause')!.addEventListener('click', () => { isPlaying = false })
document.getElementById('btnReset')!.addEventListener('click', () => {
  isPlaying = false
  time = 0
  if (mode === 'sphere') {
    sphereState = { x: [parseFloat(inputTheta.value), parseFloat(inputPhi.value)], v: [parseFloat(inputVTheta.value), parseFloat(inputVPhi.value)] }
    isTriangleDemo = false; trianglePhase = 0; currentHolonomy = null; initialVector = null
    if ((document.getElementById('showVector') as HTMLInputElement)?.checked) sphereState.carriedVectors = [[0.5, 0.5]]
    canvasRenderer.resetHistory()
  } else {
    // Init twins
    twinA = { x: [0, 0], v: [1, 0], tau: 0 }
    twinB = { x: [0, 0], v: [1, 0], tau: 0 } // wait for preset click to start moving
    historyA = [[0, 0]]; historyB = [[0, 0]]
  }
  render()
  updateStatus()
})

const applyPreset = (t: number, p: number, vt: number, vp: number, demo = false) => {
  inputTheta.value = t.toString(); inputPhi.value = p.toString()
  inputVTheta.value = vt.toString(); inputVPhi.value = vp.toString()
  document.getElementById('btnReset')!.click()
  isTriangleDemo = demo; trianglePhase = 0; currentHolonomy = null
  if (demo && sphereState.carriedVectors) {
    sphereState.carriedVectors = [[0, 1 / Math.sin(sphereState.x[0])]]
    initialPosition = [...sphereState.x]; initialVector = [...sphereState.carriedVectors[0]]
    render()
  }
}

document.getElementById('presetEquator')!.addEventListener('click', () => applyPreset(Math.PI / 2, 0, 0, 0.5))
document.getElementById('presetMeridian')!.addEventListener('click', () => applyPreset(Math.PI / 2, 0, 0.5, 0))
document.getElementById('presetGeneric')!.addEventListener('click', () => applyPreset(Math.PI / 4, 0, 0.3, 0.8))
document.getElementById('presetHolonomy')!.addEventListener('click', () => { applyPreset(0.001, 0, 0.5, 0, true); document.getElementById('btnPlay')!.click() })

document.getElementById('presetTwin')!.addEventListener('click', () => {
  document.getElementById('btnReset')!.click()
  twinA = { x: [0, 0], v: [1, 0], tau: 0 }

  // Twin B moves at v = 0.8c. In coordinates, 4-velocity is u^mu = gamma(1, v).
  // gamma = 1 / sqrt(1 - 0.8^2) = 1 / 0.6 = 1.666...
  // u^t = 1.666, u^x = 1.666 * 0.8 = 1.333
  // But since our integrator integrates x over some external parameter lambda,
  // we can just use (dt/dlambda, dx/dlambda). If lambda is proper time, we SHOULD use 4-velocity.
  // However, the prompt says "Particle B: travels away at constant velocity". 
  // In our GeodesicDynamics, the flat christoffel symbols mean dx/dt is constant.
  // So any constant velocity vector [dt/dlambda, dx/dlambda] works.
  // We will set their 4-velocity literally to u^mu so that dtau/dlambda evaluates to 1,
  // meaning the external integrated step directly measures proper time if we wanted, 
  // but the RelativisticDynamics wrapper computes it regardless!
  // Let's just use coordinate velocity parameterized by coordinate time 
  // i.e., lambda = coordinate time t. Then v = [1, dx/dt].
  twinB = { x: [0, 0], v: [1, 0.8], tau: 0 }

  document.getElementById('btnPlay')!.click()
})

document.getElementById('btnReset')!.click()
