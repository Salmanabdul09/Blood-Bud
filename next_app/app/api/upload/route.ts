import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

// Add an interface for the user info
interface UserInfo {
  health_info: string;
  age: number;
  gender: string;
  diseases: string;
  // Add other properties as needed
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const reportName = formData.get('reportName') as string;
    const reportDate = formData.get('reportDate') as string;
    const reportNumber = formData.get('reportNumber') as string;
    const clientId = formData.get('client_id') as string;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file uploaded' },
        { status: 400 }
      );
    }

    // Convert the file to a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a safe filename using the report number
    const safeName = reportNumber.replace(/[^a-zA-Z0-9-]/g, '_');
    const fileName = `${safeName}.pdf`;
    
    // Save to the public/uploads directory
    const path = join(process.cwd(), 'public', 'uploads', fileName);
    await writeFile(path, buffer);
    
    // Save metadata (in a real app, you'd save this to a database)
    const fileUrl = `/uploads/${fileName}`;
    
    // Call the Python script to analyze the PDF
    try {
      // Get user information if client ID is provided
      let userInfoParam = '';
      if (clientId) {
        try {
          // Import the database connection
          const { connectToDB } = await import('@/app/lib/db');
          const pool = await connectToDB();
          
          // Query the database for user information
          const [userInfoRows] = await pool.query(
            'SELECT age, gender, diseases FROM userinformation WHERE client_id = ?',
            [clientId]
          );
          
          const userInfo = userInfoRows as UserInfo[];
          if (userInfo.length > 0) {
            // Create a JSON string with user information
            const userInfoObj = {
              age: userInfo[0].age,
              gender: userInfo[0].gender,
              diseases: userInfo[0].diseases
            };
            
            // Escape the JSON string for command line
            userInfoParam = ` '${JSON.stringify(userInfoObj).replace(/'/g, "\\'")}'`;
            console.log(`User info param: ${userInfoParam}`);
          }
        } catch (dbError) {
          console.error('Error fetching user information:', dbError);
          // Continue without user info if there's an error
        }
      }
      
      // Pass the PDF path and user info to the Python script
      console.log(`Executing Python script with path: ${path} and user info: ${userInfoParam}`);
      const { stdout, stderr } = await execPromise(`python ${join(process.cwd(), 'bloodanalysis.py')} ${path}${userInfoParam}`);
      
      if (stderr) {
        // Log stderr but don't treat it as an error - it now contains our debug info
        console.log('Python script debug output:');
        console.log(stderr);
      }
      
      // Log the raw stdout for debugging
      console.log('Raw Python script output (should be clean JSON):');
      console.log(stdout);
      
      // Parse the analysis results - stdout should now be clean JSON
      let analysisResults;
      try {
        // Trim any whitespace to be safe
        const cleanOutput = stdout.trim();
        analysisResults = JSON.parse(cleanOutput);
        console.log('Parsed analysis results:');
        console.log(JSON.stringify(analysisResults, null, 2));
      } catch (e) {
        console.error('Error parsing Python output:', e);
        console.error('Raw output that failed to parse:', stdout);
        analysisResults = { text: stdout };
      }
      
      // Return success response with file details and analysis results
      return NextResponse.json({ 
        success: true,
        fileName,
        reportName,
        reportDate,
        reportNumber,
        fileUrl,
        analysis: analysisResults
      });
      
    } catch (pythonError) {
      console.error('Error running Python script:', pythonError);
      // Still return success for the upload, but note the analysis failed
      return NextResponse.json({ 
        success: true,
        fileName,
        reportName,
        reportDate,
        reportNumber,
        fileUrl,
        analysisError: 'Failed to analyze the PDF'
      });
    }
    
  } catch (error: unknown) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 