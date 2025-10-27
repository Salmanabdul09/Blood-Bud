import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/db';

// Add an interface for the report
interface Report {
  report_number: number;
  client_id: number;
  report_date: string;
  report_name: string;
  // Add other properties as needed
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const clientId = url.searchParams.get('client_id');

    // Validate input
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Connect to the database
    const pool = await connectToDB();
    
    // Get reports for the client
    const [rows] = await pool.query(
      'SELECT * FROM report WHERE client_id = ?',
      [clientId]
    );
    
    const reports = rows as Report[];
    
    // Return success response
    return NextResponse.json({
      success: true,
      reports: reports
    });
  } catch (error: unknown) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
} 