/**
 * 3D Cube Loader Component
 * Animated rotating cube with ERP-related icons.
 * Styles in index.css (no inline styles per .cursorrules).
 */

export function Loader() {
  return (
    <div className="relative w-full h-full flex items-center justify-center [perspective:800px]">
      <div className="loader-cube-container">
        <div className="loader-cube-face loader-cube-front">🏭</div>
        <div className="loader-cube-face loader-cube-back">📦</div>
        <div className="loader-cube-face loader-cube-right">📋</div>
        <div className="loader-cube-face loader-cube-left">👥</div>
        <div className="loader-cube-face loader-cube-top">⚙️</div>
        <div className="loader-cube-face loader-cube-bottom">✓</div>
      </div>
    </div>
  )
}
