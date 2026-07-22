import React from 'react'
import './PixelIcon.css'

/**
 * PixelIcon — Render authentic 8-bit / retro pixel art vector icons.
 * Uses sharp pixelated grid paths with shape-rendering="crispEdges".
 */
export default function PixelIcon({ name, size = 20, color = 'var(--color-icon-fill, currentColor)', className = '' }) {
  const iconPaths = {
    // ☀️ Sun (Pixel Art Light Mode Icon)
    sun: (
      <path
        d="M7 0H9V2H7V0ZM14 7H16V9H14V7ZM7 14H9V16H7V14ZM0 7H2V9H0V7ZM12 2L14 4L13 5L11 3L12 2ZM3 11L5 13L4 14L2 12L3 11ZM13 11L14 12L12 14L11 13L13 11ZM4 2L5 3L3 5L2 4L4 2ZM5 5H11V11H5V5Z"
        fill={color}
      />
    ),

    // 🌙 Moon (Pixel Art Dark Mode Icon)
    moon: (
      <path
        d="M6 1H10V3H12V5H13V7H14V11H13V13H11V14H7V15H4V13H2V11H1V7H2V4H4V2H6V1ZM6 3V5H4V7H3V11H5V13H7V12H9V11H11V9H10V7H8V5H7V3H6Z"
        fill={color}
      />
    ),

    // ⚡ Lightning (Logo & In Progress)
    lightning: (
      <path
        d="M9 1H4L2 9H8L6 15L14 7H8L9 1Z"
        fill={color}
      />
    ),

    // 📊 Chart / Analytics
    chart: (
      <path
        d="M1 14H15V16H1V14ZM2 10H5V13H2V10ZM6 6H9V13H6V6ZM10 2H13V13H10V2Z"
        fill={color}
      />
    ),

    // 🔵 Orb / Open Status
    circle: (
      <path
        d="M5 2H11V4H13V6H15V10H13V12H11V14H5V12H3V10H1V6H3V4H5V2ZM5 4V6H3V10H5V12H11V10H13V6H11V4H5Z"
        fill={color}
      />
    ),

    // 🧪 Testing Flask
    flask: (
      <path
        d="M6 1H10V3H9V6L13 12V14H3V12L7 6V3H6V1ZM5.5 12H10.5L8.5 9H7.5L5.5 12Z"
        fill={color}
      />
    ),

    // ✅ Resolved Checkmark
    check: (
      <path
        d="M2 8L5 11L14 2L16 4L5 15L0 10L2 8Z"
        fill={color}
      />
    ),

    // ⚠️ Overdue / Warning
    warning: (
      <path
        d="M7 1H9V3H10V5H11V7H12V9H13V11H14V13H15V15H1V13H2V11H3V9H4V7H5V5H6V3H7V1ZM7 6H9V10H7V6ZM7 11H9V13H7V11Z"
        fill={color}
      />
    ),

    // 🔒 Lock / Closed
    lock: (
      <path
        d="M5 6V4H6V2H10V4H11V6H13V14H3V6H5ZM7 4V6H9V4H7ZM7 9V11H9V9H7Z"
        fill={color}
      />
    ),

    // 🆕 New / Plus
    plus: (
      <path
        d="M7 2H9V7H14V9H9V14H7V9H2V7H7V2Z"
        fill={color}
      />
    ),

    // ✏️ Edit Pencil
    edit: (
      <path
        d="M11 1L15 5L13 7L9 3L11 1ZM7 5L11 9L4 16H0V12L7 5ZM2 14H3.5L8.5 9L7 7.5L2 12.5V14Z"
        fill={color}
      />
    ),

    // 👤 User
    user: (
      <path
        d="M5 2H11V3H12V7H11V8H5V7H4V3H5V2ZM2 11H14V13H15V16H1V13H2V11Z"
        fill={color}
      />
    ),

    // 👥 Team / Users
    group: (
      <path
        d="M3 2H8V3H9V6H8V7H3V6H2V3H3V2ZM0 10H11V12H12V15H0V10ZM10 2H14V3H15V6H14V7H10V6H9V5H10V2ZM13 9H16V14H13V9Z"
        fill={color}
      />
    ),

    // 🗑️ Trash
    trash: (
      <path
        d="M5 1H11V3H15V5H1V3H5V1ZM3 6H13V14H12V15H4V14H3V6ZM5 8V13H7V8H5ZM9 8V13H11V8H9Z"
        fill={color}
      />
    ),

    // 🔄 Refresh / Sync
    refresh: (
      <path
        d="M10 1H15V6H13V4.5A6 6 0 0 0 3 8H1A8 8 0 0 1 15 2.5V1H10ZM1 10H6V11.5A8 8 0 0 1 1 8H3A6 6 0 0 0 13 8H15A8 8 0 0 1 6 13.5V15H1V10Z"
        fill={color}
      />
    ),

    // 💬 Comment Speech Bubble
    comment: (
      <path
        d="M2 2H14V3H15V11H14V12H6V14H4V12H2V11H1V3H2V2ZM3 4V10H13V4H3Z"
        fill={color}
      />
    ),

    // 📁 Folder
    folder: (
      <path
        d="M1 2H6L8 4H15V14H1V2ZM3 6V12H13V6H3Z"
        fill={color}
      />
    ),

    // 📦 Archive Box
    archive: (
      <path
        d="M1 2H15V5H1V2ZM2 6H14V14H2V6ZM6 8H10V10H6V8Z"
        fill={color}
      />
    ),

    // 🔧 Wrench Tool
    wrench: (
      <path
        d="M10 1H15V6L12 9L7 14H3L1 12V8L6 3L10 1ZM11 4L13 2H12L10 4V5H11V4Z"
        fill={color}
      />
    ),

    // 📌 Pin
    pin: (
      <path
        d="M6 1H10V3H13V5H11V9L13 11V12H9V16H7V12H3V11L5 9V5H3V3H6V1Z"
        fill={color}
      />
    ),

    // 📭 Empty / Mailbox
    empty: (
      <path
        d="M2 3H14V4H15V13H14V14H2V13H1V4H2V3ZM3 5V12H13V5H3ZM5 7H11V9H5V7Z"
        fill={color}
      />
    ),

    // 🚧 Construction Barrier
    construction: (
      <path
        d="M1 3H15V5H14V11H15V13H1V11H2V5H1V3ZM3 5V11H5L11 5H3ZM13 5L7 11H13V5ZM2 14H5V16H2V14ZM11 14H14V16H11V14Z"
        fill={color}
      />
    ),

    // ⭐ Star
    star: (
      <path
        d="M7 1H9V4H12V6H10V9H11V12H8V15H7V12H4V9H5V6H3V4H7V1Z"
        fill={color}
      />
    ),

    // 🔔 Bell
    bell: (
      <path
        d="M6 1H10V3H12V5H13V11H15V13H1V11H3V5H4V3H6V1ZM6 14H10V16H6V14Z"
        fill={color}
      />
    ),

    // 📈 Report Line / Document
    report: (
      <path
        d="M2 1H11L14 4V15H2V1ZM4 5V7H10V5H4ZM4 9V11H12V9H4ZM4 12V13H9V12H4Z"
        fill={color}
      />
    ),

    // 🔍 Search
    search: (
      <path
        d="M5 1H11V2H13V4H14V10H13V12H11V13H10V11H11V10H12V4H11V3H5V4H4V10H5V11H4V13H3V12H1V10H0V4H1V2H3V1H5ZM11 11L15 15V16H14L10 12H11Z"
        fill={color}
      />
    )
  }

  const svgContent = iconPaths[name] || iconPaths.lightning

  return (
    <svg
      className={`pixel-icon pixel-icon-${name} ${className}`}
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      style={{ imageRendering: 'pixelated', display: 'inline-block', verticalAlign: 'middle' }}
    >
      {svgContent}
    </svg>
  )
}
