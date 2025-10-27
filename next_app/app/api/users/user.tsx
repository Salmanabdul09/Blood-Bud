import { connectToDB } from "@/app/lib/db";
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === "GET") {
        try{
            const db = await connectToDB();
            console.log("Connected to database");
            const [rows] = await db.query("SELECT * FROM clients");
            res.status(200).json(rows);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch users" });
        }
     } else{
            res.status(405).json({ error: "Method not allowed" });
        }
    }

