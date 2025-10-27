import { connectToDB } from "@/app/lib/db";
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const db = await connectToDB();
    console.log("Connected to database");
    const [rows] = await db.query("SELECT * FROM users");
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Database error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
} 