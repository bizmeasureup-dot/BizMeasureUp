import React from 'react'

interface PageTitleProps {
  children: React.ReactNode
}

function PageTitle({ children }: PageTitleProps) {
  return (
    <h1 className="text-2xl font-semibold text-gray-700 dark:text-gray-200">{children}</h1>
  )
}

export default PageTitle

