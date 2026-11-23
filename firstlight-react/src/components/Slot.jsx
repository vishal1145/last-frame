import React from 'react'

// Section label row (clapper, label, status). Set SHOW_SLOT to false to hide it on every section.
const SHOW_SLOT = true

export default function Slot({ bold, rest, status }) {
  if (!SHOW_SLOT) return null
  return (
    <div className="slot rv">
      <span className="clap" aria-hidden="true"></span>
      <p className="what"><b>{bold}</b>{rest && ` · ${rest}`}</p>
      {status && <span className="st">{status}</span>}
    </div>
  )
}
