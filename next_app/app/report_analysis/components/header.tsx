'use client';
import Link from "next/link";
import React, { useState, useEffect } from "react";

export default function Header() {
    const [username, setUsername] = useState("User");
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    useEffect(() => {
        // Retrieve client data from local storage
        const clientData = localStorage.getItem("client");
        if (clientData) {
            try {
                const client = JSON.parse(clientData);
                if (client) {
                    // The username field is directly in the client object
                    if (client.username) {
                        setUsername(client.username);
                        setIsLoggedIn(true);
                    }
                }
            } catch (error) {
                console.error("Error parsing client data:", error);
            }
        }
    }, []);

    return (
        <div>
            <div id="header" className="rounded-box flex justify-between items-center p-8 bg-gray-200 mb-10 shadow-sm">
                <div id="subsection" className="report-header">
                    <p className="font-bold text-gray-800 text-xl">
                        {isLoggedIn ? `Welcome, ${username}!` : "Welcome, Guest!"}
                    </p>
                </div>
                <div id="Logout-section">
                    {isLoggedIn ? (
                        <Link href="/" className="px-4 py-2 rounded-full bg-gray-600 text-white hover:underline hover:bg-gray-600">
                            Logout
                        </Link>
                    ) : (
                        <Link href="/login" className="px-4 py-2 rounded-md bg-blue-500 text-white hover:underline hover:bg-blue-600">
                            Login
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
} 