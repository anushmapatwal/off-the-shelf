import React from 'react'

/* The scalloped bubble is Anushma's artwork (public/art/card.webp), including
   its own soft shadow. The card keeps the artwork's aspect ratio so the
   scallops never stretch; the content sits centred inside it. */

export default function Card({ children }) {
  return (
    <div className="card">
      <div className="card-content">{children}</div>
    </div>
  )
}
