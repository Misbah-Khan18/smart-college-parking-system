import { memo } from 'react'

function SubtleAppBackground() {
  return (
    <div className="subtle-app-background" aria-hidden="true">
      {/* Faint Cartesian Grid */}
      <div className="subtle-bg-grid"></div>

      {/* Extremely low-opacity parking slot wireframe outlines */}
      <div className="subtle-slot-outlines">
        <div className="wireframe-slot slot-wf-1">
          <span className="wf-id">G-01</span>
        </div>
        <div className="wireframe-slot slot-wf-2">
          <span className="wf-id">G-02</span>
        </div>
        <div className="wireframe-slot slot-wf-3">
          <span className="wf-id">B-01</span>
        </div>
        <div className="wireframe-slot slot-wf-4">
          <span className="wf-id">B-02</span>
        </div>
      </div>

      {/* Soft blue/purple ambient glows with very slow movement */}
      <div className="ambient-slow-orb blue-orb-slow"></div>
      <div className="ambient-slow-orb purple-orb-slow"></div>
      <div className="ambient-slow-orb cyan-orb-slow"></div>

      {/* Tiny subtle particles */}
      <div className="subtle-particles-layer">
        <span className="subtle-particle p-1"></span>
        <span className="subtle-particle p-2"></span>
        <span className="subtle-particle p-3"></span>
        <span className="subtle-particle p-4"></span>
        <span className="subtle-particle p-5"></span>
        <span className="subtle-particle p-6"></span>
      </div>
    </div>
  )
}

export default memo(SubtleAppBackground)
