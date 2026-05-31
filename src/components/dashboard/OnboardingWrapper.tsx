'use client'

import React, { useState } from 'react'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

interface OnboardingWrapperProps {
  initialCompleted: boolean
  children: React.ReactNode
}

export function OnboardingWrapper({ initialCompleted, children }: OnboardingWrapperProps) {
  const [completed, setCompleted] = useState(initialCompleted)

  if (!completed) {
    return (
      <div className="relative min-h-screen">
        {/* Render onboarding wizard overlay blocking layout access */}
        <OnboardingWizard onComplete={() => setCompleted(true)} />
        <div className="opacity-10 pointer-events-none filter blur-sm">
          {children}
        </div>
      </div>
    )
  }

  return <>{children}</>
}
