import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const execPromise = promisify(exec);

// Store conversation history for each session
const conversationHistories: { [key: string]: string[] } = {};

export async function POST(request: Request) {
  let tempInputFile = '';
  
  try {
    const { userInput, testAnalysis, sessionId } = await request.json();

    // Validate input
    if (!userInput) {
      return NextResponse.json(
        { error: 'User input is required' },
        { status: 400 }
      );
    }

    // Use provided sessionId or generate a new one
    const chatSessionId = sessionId || uuidv4();

    // Initialize conversation history for this session if it doesn't exist
    if (!conversationHistories[chatSessionId]) {
      conversationHistories[chatSessionId] = [];
    }

    // Add user input to conversation history
    conversationHistories[chatSessionId].push(`User: ${userInput}`);

    // Create a temporary file with a unique name to avoid conflicts
    const timestamp = new Date().getTime();
    tempInputFile = path.join(process.cwd(), `temp_chat_input_${chatSessionId.substring(0, 8)}_${timestamp}.txt`);
    
    // Prepare the input content
    let inputContent = `TEST_ANALYSIS: ${testAnalysis || ''}\n\n`;
    inputContent += conversationHistories[chatSessionId].join('\n');
    
    // Write to the temporary file
    fs.writeFileSync(tempInputFile, inputContent, 'utf8');

    // Get the absolute path to the Python script
    const scriptPath = path.join(process.cwd(), 'bloodchatbot.py');
    
    // Verify the script exists
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Python script not found at ${scriptPath}`);
    }
    
    // Execute the Python script with the input file
    // Use double quotes around paths to handle spaces
    const command = `python "${scriptPath}" "${tempInputFile}"`;
    console.log(`Executing command: ${command}`);
    
    const { stdout, stderr } = await execPromise(command);

    // Clean up the temporary file
    try {
      if (fs.existsSync(tempInputFile)) {
        fs.unlinkSync(tempInputFile);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temporary file:', cleanupError);
    }

    if (stderr) {
      console.error('Python script error:', stderr);
      // If there's stderr but also stdout, we'll still use the stdout
      if (!stdout) {
        return NextResponse.json(
          { error: 'Error processing chat request', details: stderr },
          { status: 500 }
        );
      }
    }

    // Extract the AI response
    const response = stdout.trim();
    
    // Add AI response to conversation history
    conversationHistories[chatSessionId].push(`AI: ${response}`);

    // Limit conversation history to last 20 exchanges
    if (conversationHistories[chatSessionId].length > 20) {
      conversationHistories[chatSessionId] = conversationHistories[chatSessionId].slice(-20);
    }

    return NextResponse.json({
      response: response,
      conversationHistory: conversationHistories[chatSessionId],
      sessionId: chatSessionId
    });
  } catch (error) {
    console.error('Chat API error:', error);
    
    // Clean up the temporary file if it exists
    try {
      if (tempInputFile && fs.existsSync(tempInputFile)) {
        fs.unlinkSync(tempInputFile);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temporary file:', cleanupError);
    }
    
    return NextResponse.json(
      { error: 'Failed to process chat request', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 