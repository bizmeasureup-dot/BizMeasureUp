import React from 'react'

interface BackdropProps {
  onClick?: () => void
}

function Backdrop({ onClick }: BackdropProps) {
  return (
    <div
      className="fixed inset-0 z-40 bg-gray-900 bg-opacity-50"
      onClick={onClick}
      aria-hidden="true"
    />
  )
}

export default Backdrop

