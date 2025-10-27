import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/db';

export async function POST(request: Request) {
  try {
    const { client_id, report_number, report_ID } = await request.json();

    // Validate input
    if (!client_id || !report_number || !report_ID) {
      return NextResponse.json(
        { success: false, error: 'Client ID, report number, and report ID are required' },
        { status: 400 }
      );
    }

    // Connect to the database
    const pool = await connectToDB();
    
    // Update the report with the provided report_ID
    const [result] = await pool.query(
      'UPDATE report SET report_ID = ? WHERE client_id = ? AND report_number = ?',
      [report_ID, client_id, report_number]
    );
    
    const updateResult = result as any;
    
    // Check if any rows were affected
    if (updateResult.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'No matching report found to update' },
        { status: 404 }
      );
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Report updated successfully',
      report_ID: report_ID
    });
  } catch (error: unknown) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update report' },
      { status: 500 }
    );
  }
} 