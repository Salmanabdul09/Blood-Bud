import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/db';

// Add an interface for the MySQL result
interface MySQLDeleteResult {
  affectedRows: number;
  // Add other properties as needed
}

export async function POST(request: Request) {
  try {
    const { report_number, client_id } = await request.json();

    // Validate input
    if (!report_number) {
      return NextResponse.json(
        { success: false, error: 'Report number is required' },
        { status: 400 }
      );
    }

    // Connect to the database
    const pool = await connectToDB();
    
    // Build the query based on available parameters
    let query = 'DELETE FROM report WHERE report_number = ?';
    const params = [report_number];
    
    // If client_id is provided, add it to the query for additional security
    if (client_id) {
      query += ' AND client_id = ?';
      params.push(client_id);
    }
    
    // Delete the report
    const [result] = await pool.query(query, params);
    
    // Then use this type for the result
    const deleteResult = result as MySQLDeleteResult;
    
    // Check if any rows were affected
    if (deleteResult.affectedRows === 0) {
      return NextResponse.json(
        { success: false, error: 'No matching report found to delete' },
        { status: 404 }
      );
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error: unknown) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete report' },
      { status: 500 }
    );
  }
} 