import { NextResponse } from 'next/server';
import { connectToDB } from '@/app/lib/db';

export async function POST(request: Request) {
  try {
    const { username, password, age, gender, diseases } = await request.json();

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Connect to the database
    const pool = await connectToDB();
    
    // Check if username already exists
    const [existingUsers] = await pool.query(
      'SELECT * FROM clients WHERE username = ?',
      [username]
    );
    
    const users = existingUsers as any[];
    if (users.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 409 }
      );
    }
    
    // Start a transaction to ensure both inserts succeed or fail together
    await pool.query('START TRANSACTION');
    
    try {
      // Insert the new user into the clients table (without health_info)
      // IMPORTANT: In a production environment, passwords should be hashed
      const [clientResult] = await pool.query(
        'INSERT INTO clients (username, password) VALUES (?, ?)',
        [username, password]
      );
      
      const insertResult = clientResult as any;
      const clientId = insertResult.insertId;
      
      // Insert user information into the userinformation table
      if (clientId) {
        await pool.query(
          'INSERT INTO userinformation (client_id, age, gender, diseases) VALUES (?, ?, ?, ?)',
          [clientId, age ? parseInt(age) : null, gender || null, diseases || null]
        );
      }
      
      // Commit the transaction
      await pool.query('COMMIT');
      
      // Return success response
      return NextResponse.json({
        success: true,
        message: 'Registration successful',
        client_id: clientId
      });
    } catch (error) {
      // Rollback the transaction if any error occurs
      await pool.query('ROLLBACK');
      throw error;
    }
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed' },
      { status: 500 }
    );
  }
} 