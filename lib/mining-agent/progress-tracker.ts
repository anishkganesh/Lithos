export interface ProgressState {
  stage: 'idle' | 'collecting' | 'processing' | 'completed' | 'error'
  message: string
  totalSteps: number
  currentStep: number
  details?: any
}

// In-memory progress storage (could be replaced with Redis for production)
let currentProgress: ProgressState = {
  stage: 'idle',
  message: 'Mining agent is idle',
  totalSteps: 0,
  currentStep: 0
}

export function updateProgress(progress: Partial<ProgressState>) {
  currentProgress = { ...currentProgress, ...progress }
}

export function getProgress(): ProgressState {
  return currentProgress
}

export function resetProgress() {
  currentProgress = {
    stage: 'idle',
    message: 'Mining agent is idle',
    totalSteps: 0,
    currentStep: 0
  }
} 