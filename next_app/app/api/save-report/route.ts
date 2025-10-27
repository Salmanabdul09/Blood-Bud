import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/db';

// Add an interface for the MySQL result
interface MySQLInsertResult {
  insertId: number;
  affectedRows: number;
  // Add other properties as needed
}

export async function POST(request: Request) {
  try {
    const { client_id, title, file_url, analysis_results, report_number, report_ID, report_date } = await request.json();

    // Validate input
    if (!client_id) {
      return NextResponse.json(
        { success: false, error: 'Client ID is required' },
        { status: 400 }
      );
    }

    // Connect to the database
    const pool = await connectToDB();
    
    // Generate a report number if not provided
    const reportNumber = report_number || Math.floor(Math.random() * 1000000);
    // Use the provided report date or default to today
    const reportDate = report_date || new Date().toISOString().split('T')[0];
    
    // Insert the report into the report table
    let query = 'INSERT INTO report (client_id, results, report_number, report_date, report_name';
    const values = [
      client_id,
      analysis_results || '',
      reportNumber,
      reportDate,
      title || 'Blood Test Report'
    ];
    let placeholders = '?, ?, ?, ?, ?';
    
    // If report_ID is provided, include it in the query
    if (report_ID) {
      query += ', report_ID';
      placeholders += ', ?';
      values.push(report_ID);
    }
    
    query += ') VALUES (' + placeholders + ')';
    
    const [result] = await pool.query(query, values);
    
    // Then use this type for the result
    const insertResult = result as MySQLInsertResult;
    
    // Return success response with the report_ID
    return NextResponse.json({
      success: true,
      message: 'Report saved successfully',
      report_ID: report_ID || insertResult.insertId,
      report_number: reportNumber
    });
  } catch (error: unknown) {
    console.error('Error saving report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save report' },
      { status: 500 }
    );
  }
} 