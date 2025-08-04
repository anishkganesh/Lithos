import { NextRequest, NextResponse } from 'next/server'
import { MiningAgentOrchestrator } from '@/lib/mining-agent/orchestrator'

export async function POST(request: NextRequest) {
  try {
    // Initialize the orchestrator
    const orchestrator = new MiningAgentOrchestrator()
    
    // Start the scraping process
    const result = await orchestrator.run()
    
    return NextResponse.json({
      success: true,
      message: 'Mining agent completed successfully',
      results: result
    })
  } catch (error) {
    console.error('Mining agent error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      },
      { status: 500 }
    )
  }
} 