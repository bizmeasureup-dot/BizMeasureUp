import React, { useEffect, useState, cloneElement, isValidElement } from 'react'

interface TransitionProps {
  show: boolean
  enter?: string
  enterFrom?: string
  enterTo?: string
  leave?: string
  leaveFrom?: string
  leaveTo?: string
  children: React.ReactNode
}

function Transition({
  show,
  enter = '',
  enterFrom = '',
  enterTo = '',
  leave = '',
  leaveFrom = '',
  leaveTo = '',
  children,
}: TransitionProps) {
  const [shouldRender, setShouldRender] = useState(show)
  const [currentClasses, setCurrentClasses] = useState('')

  useEffect(() => {
    if (show) {
      setShouldRender(true)
      // Start with enterFrom classes
      setCurrentClasses(enterFrom)
      // Then transition to enterTo
      const timer = setTimeout(() => {
        setCurrentClasses(`${enter} ${enterTo}`)
      }, 10)
      return () => clearTimeout(timer)
    } else {
      // Start with leaveFrom, then transition to leaveTo
      setCurrentClasses(leaveFrom)
      const timer = setTimeout(() => {
        setCurrentClasses(`${leave} ${leaveTo}`)
      }, 10)
      // Remove from DOM after animation completes
      const removeTimer = setTimeout(() => {
        setShouldRender(false)
      }, 300)
      return () => {
        clearTimeout(timer)
        clearTimeout(removeTimer)
      }
    }
  }, [show, enter, enterFrom, enterTo, leave, leaveFrom, leaveTo])

  if (!shouldRender) return null

  // If children is a single element, clone it and add classes
  if (isValidElement(children)) {
    const existingClassName = (children.props as any)?.className || ''
    const combinedClasses = `${existingClassName} ${currentClasses}`.trim()
    return cloneElement(children as React.ReactElement<any>, {
      className: combinedClasses,
    })
  }

  // Otherwise wrap in a div
  return <div className={currentClasses}>{children}</div>
}

export default Transition

