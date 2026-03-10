import './style.css'
import { Euler } from './Euler'
import { RK4 } from './RK4'
import type { Integrator } from './Integrator'
import type { SimulationModule } from './simulations/SimulationModule'
import { simulations } from './simulations/SimulationRegistry'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<div style="display: flex; height: 100vh; background: #111; color: white; font-family: sans-serif; overflow: hidden;">
  
  <!-- Sidebar -->
  <div style="width: 250px; background: #1e1e1e; padding: 20px; border-right: 1px solid #333; overflow-y: auto; flex-shrink: 0;">
    <h2 style="margin-top: 0; color: #fff;">Simulation Lab</h2>
    <div id="sidebarMenu" style="margin-top: 20px;"></div>
  </div>

  <!-- Main Content Area -->
  <div style="flex: 1; padding: 20px; display: flex; flex-direction: column; align-items: center; overflow-y: auto;">
    
    <!-- Info Panel -->
    <div style="max-width: 800px; width: 100%; margin-bottom: 20px;">
        <h1 id="simTitle" style="margin-top: 0; color: #00ffcc;"></h1>
        <p id="simDesc" style="color: #bbb; line-height: 1.5; font-size: 15px; margin-bottom: 0;"></p>
    </div>

    <!-- Canvas -->
    <div style="position: relative; max-width: 800px; width: 100%;">
      <canvas id="simCanvas" width="800" height="600" style="border: 1px solid #444; background: #1e1e1e; display: block;"></canvas>
    </div>

    <!-- Dynamic Control Panel -->
    <div id="controlPanel" style="max-width: 800px; width: 100%; margin-top: 20px; background: #222; padding: 15px; border-radius: 6px;">
        <!-- Module UI injected here -->
    </div>

    <!-- Presets Panel -->
    <div id="presetsPanel" style="max-width: 800px; width: 100%; margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap;">
    </div>

    <!-- Global Engine Controls -->
    <div style="max-width: 800px; width: 100%; margin-top: 20px; display: flex; gap: 10px; align-items: center; border-top: 1px solid #333; padding-top: 15px;">
      <button id="btnPlay" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Play</button>
      <button id="btnPause" style="background: #ffc107; color: black; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Pause</button>
      <button id="btnReset" style="background: #dc3545; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold;">Reset</button>
      
      <label style="margin-left: 20px;">dt: <input type="number" id="dt" value="0.05" step="0.01" style="width: 60px; padding: 4px;"/></label>
      
      <label style="margin-left: 10px;">Integrator: 
        <select id="integratorType" style="padding: 4px;">
          <option value="euler">Euler</option>
          <option value="rk4" selected>RK4 (Runge-Kutta)</option>
        </select>
      </label>
    </div>

    <!-- Diagnostics Terminal -->
    <div id="status" style="max-width: 800px; width: 100%; margin-top: 20px; font-family: monospace; font-size: 14px; white-space: pre-wrap; background: #000; color: #0f0; padding: 15px; border-radius: 4px; border: 1px solid #333; margin-bottom: 40px; min-height: 150px;"></div>
  </div>
</div>
`

// --- Engine State ---
const canvas = document.getElementById('simCanvas') as HTMLCanvasElement
const sidebarMenu = document.getElementById('sidebarMenu') as HTMLDivElement
const simTitle = document.getElementById('simTitle') as HTMLHeadingElement
const simDesc = document.getElementById('simDesc') as HTMLParagraphElement
const controlPanel = document.getElementById('controlPanel') as HTMLDivElement
const presetsPanel = document.getElementById('presetsPanel') as HTMLDivElement
const statusDiv = document.getElementById('status') as HTMLDivElement

const btnPlay = document.getElementById('btnPlay') as HTMLButtonElement
const btnPause = document.getElementById('btnPause') as HTMLButtonElement
const btnReset = document.getElementById('btnReset') as HTMLButtonElement
const inputDt = document.getElementById('dt') as HTMLInputElement
const selectInt = document.getElementById('integratorType') as HTMLSelectElement

const euler = new Euler()
const rk4 = new RK4()

let currentModule: SimulationModule | null = null
let isPlaying = false
let time = 0

// --- Module Lifecycle Orchestration ---

function loadModule(moduleId: string) {
  const nextModule = simulations.find(s => s.id === moduleId)
  if (!nextModule) return

  // Stop current loop
  isPlaying = false
  time = 0

  // Build DOM layout for the module
  simTitle.innerText = nextModule.title
  simDesc.innerHTML = nextModule.description

  controlPanel.innerHTML = ''
  presetsPanel.innerHTML = ''

  // Setup abstract hooks
  currentModule = nextModule
  currentModule.setup(canvas)
  currentModule.createControls(controlPanel)

  // Setup Presets
  if (currentModule.presets && currentModule.presets.length > 0) {
    currentModule.presets.forEach(preset => {
      const btn = document.createElement('button')
      btn.innerText = preset.name
      btn.style.cssText = 'background: #007bff; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;'
      btn.addEventListener('click', () => {
        preset.apply()
        time = 0 // applying a preset implies restarting the clock basically
        renderFrame() // instantly draw the new preset starting state
      })
      presetsPanel.appendChild(btn)
    })
  }

  // Draw initial view
  renderFrame()
  updateSidebarSelection(moduleId)
}

function renderFrame() {
  if (!currentModule) return
  currentModule.renderState()
  statusDiv.innerHTML = currentModule.getStatus(time)
}

function tick() {
  if (!isPlaying || !currentModule) return

  const dt = parseFloat(inputDt.value)
  const integrator: Integrator = selectInt.value === 'rk4' ? rk4 : euler

  // Give control to the simulation for this physical step
  const result = currentModule.updateState(dt, integrator)
  time += dt

  if (!result.isRunning) {
    isPlaying = false
  }

  renderFrame()

  if (isPlaying) {
    requestAnimationFrame(tick)
  }
}

// --- Dynamic Sidebar Construction ---

let currentCategoryStr = ''
simulations.forEach(sim => {
  if (sim.category !== currentCategoryStr) {
    const catHeader = document.createElement('h3')
    catHeader.style.cssText = 'color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 20px; border-bottom: 1px solid #333; padding-bottom: 5px;'
    catHeader.innerText = sim.category
    sidebarMenu.appendChild(catHeader)
    currentCategoryStr = sim.category
  }

  const navItem = document.createElement('div')
  navItem.id = `nav-${sim.id}`
  navItem.style.cssText = 'padding: 8px 10px; margin: 4px 0; border-radius: 4px; cursor: pointer; color: #ddd; font-size: 14px; transition: background 0.2s;'
  navItem.innerText = sim.title
  navItem.addEventListener('mouseenter', () => { if (currentModule?.id !== sim.id) navItem.style.background = '#333' })
  navItem.addEventListener('mouseleave', () => { if (currentModule?.id !== sim.id) navItem.style.background = 'transparent' })
  navItem.addEventListener('click', () => loadModule(sim.id))
  sidebarMenu.appendChild(navItem)
})

function updateSidebarSelection(activeId: string) {
  simulations.forEach(sim => {
    const item = document.getElementById(`nav-${sim.id}`)
    if (item) {
      if (sim.id === activeId) {
        item.style.background = '#00ffcc'
        item.style.color = '#000'
        item.style.fontWeight = 'bold'
      } else {
        item.style.background = 'transparent'
        item.style.color = '#ddd'
        item.style.fontWeight = 'normal'
      }
    }
  })
}

// --- Global Engine Event Listeners ---

btnPlay.addEventListener('click', () => {
  if (!isPlaying && currentModule) {
    isPlaying = true
    requestAnimationFrame(tick)
  }
})

btnPause.addEventListener('click', () => {
  isPlaying = false
})

btnReset.addEventListener('click', () => {
  if (currentModule) {
    isPlaying = false
    time = 0
    currentModule.reset()
    renderFrame()
  }
})

// Boot default simulation
if (simulations.length > 0) {
  loadModule(simulations[0].id)
}
