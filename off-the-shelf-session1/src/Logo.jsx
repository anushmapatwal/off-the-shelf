import React from 'react'

export default function Logo() {
  return (
    <div className="logo" aria-label="Off the Shelf">
      <svg viewBox="0 0 120 70" className="logo-arc" aria-hidden="true">
        <defs>
          <path id="arcPath" d="M 8 62 A 54 54 0 0 1 104 20" fill="none" />
        </defs>
        <text className="logo-arc-text">
          <textPath href="#arcPath" startOffset="12%">
            OFF THE
          </textPath>
        </text>
      </svg>
      <span className="logo-word">shelf</span>
    </div>
  )
}
