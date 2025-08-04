import { NextRequest, NextResponse } from 'next/server'
import { getProgress } from '@/lib/mining-agent/progress-tracker'

export async function GET(request: NextRequest) {
  try {
    const progress = getProgress()
    
    return NextResponse.json({
      success: true,
      progress
    })
  } catch (error) {
    console.error('Progress tracking error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
} 