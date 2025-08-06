
'use client'

import { Provider } from 'jotai'
import { type ReactNode } from 'react'
import { QueryProvider } from './queryClient'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <Provider>
      <QueryProvider>
        {children}
      </QueryProvider>
    </Provider>
  )
} 