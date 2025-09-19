import { NextRequest, NextResponse } from 'next/server';
import { EdgarSecScraper, EdgarReport } from '@/lib/mining-agent/scrapers/edgar-sec-scraper';

// Store active scraper instance
let scraperInstance: EdgarSecScraper | null = null;
const recentReports: EdgarReport[] = [];
const MAX_REPORTS = 100;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get('action');

  try {
    if (action === 'start') {
      // Start monitoring
      if (scraperInstance) {
        return NextResponse.json({
          success: false,
          message: 'Monitoring already active'
        });
      }

      scraperInstance = new EdgarSecScraper();

      // Start monitoring with callback to store reports
      scraperInstance.startMonitoring((report) => {
        recentReports.unshift(report);
        if (recentReports.length > MAX_REPORTS) {
          recentReports.pop();
        }
      });

      return NextResponse.json({
        success: true,
        message: 'SEC monitoring started',
        status: 'monitoring'
      });
    }

    if (action === 'stop') {
      // Stop monitoring
      if (scraperInstance) {
        scraperInstance.stopMonitoring();
        scraperInstance = null;
      }

      return NextResponse.json({
        success: true,
        message: 'Monitoring stopped',
        status: 'stopped'
      });
    }

    if (action === 'status') {
      return NextResponse.json({
        success: true,
        isMonitoring: scraperInstance !== null,
        reportsCount: recentReports.length,
        reports: recentReports.slice(0, 20) // Return last 20 reports
      });
    }

    if (action === 'fetch-recent') {
      // Fetch recent reports without starting continuous monitoring
      const scraper = new EdgarSecScraper();
      const reports = await scraper.getRecentReports(10);

      return NextResponse.json({
        success: true,
        reports,
        timestamp: new Date().toISOString()
      });
    }

    // Default: return current reports
    return NextResponse.json({
      success: true,
      reports: recentReports,
      isMonitoring: scraperInstance !== null
    });

  } catch (error) {
    console.error('Edgar monitor error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Stream endpoint for real-time updates
export async function POST(request: NextRequest) {
  const { action } = await request.json();

  if (action === 'stream') {
    // Create a readable stream for Server-Sent Events
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();

        // Send initial connection message
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
        );

        // If not monitoring, start it
        if (!scraperInstance) {
          scraperInstance = new EdgarSecScraper();

          scraperInstance.startMonitoring((report) => {
            // Store report
            recentReports.unshift(report);
            if (recentReports.length > MAX_REPORTS) {
              recentReports.pop();
            }

            // Send report to stream
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'report', report })}\n\n`)
              );
            } catch (error) {
              console.error('Error sending report to stream:', error);
            }
          });
        }

        // Send existing reports
        if (recentReports.length > 0) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'initial',
              reports: recentReports.slice(0, 20)
            })}\n\n`)
          );
        }

        // Keep connection alive with periodic pings
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'ping' })}\n\n`)
            );
          } catch (error) {
            clearInterval(pingInterval);
          }
        }, 30000); // Ping every 30 seconds

        // Clean up on close
        return () => {
          clearInterval(pingInterval);
        };
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  return NextResponse.json({ success: false, error: 'Invalid action' });
}