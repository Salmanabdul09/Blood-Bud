'use client';

import React, { useState } from "react";
import "./login.css";  // Import CSS file directly
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Reset error state
        setError("");
        
        // Validate form inputs
        if (!username || !password) {
            setError("Username and password are required");
            return;
        }
        
        try {
            setLoading(true);
            
            // Call the API route for authentication
            const response = await fetch("/api/auth", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ username, password }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || "Authentication failed");
            }
            
            if (data.success) {
                // Store client info in localStorage (excluding password)
                localStorage.setItem("client", JSON.stringify(data.client));
                
                // Store user health information
                if (data.userInfo) {
                    localStorage.setItem("userInfo", JSON.stringify(data.userInfo));
                }
                
                // Redirect to report analysis page
                router.push("/report_analysis");
            } else {
                setError(data.error || "Invalid username or password");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error during login. Please try again.");
            console.error("Login error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-container bg-gray-300 min-h-screen flex items-center justify-center">
            <div id="Login-section" className="Login-section p-8 rounded-lg shadow-lg">
                <h1 className="font-bold text-xl mb-4">Client Login</h1>
                
                {/* Login form */}
                <div className="w-full max-w-xs">
                    <form className="bg-white rounded px-8 pt-6 pb-8 mb-4" onSubmit={handleSubmit}>
                        {error && (
                            <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
                                {error}
                            </div>
                        )}
                        
                        <div className="mb-4">
                            <label className="block text-gray-700 text-sm font-mono mb-2" htmlFor="username">
                                Username
                            </label>
                            <input 
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                                id="username" 
                                type="text" 
                                placeholder="Username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div className="mb-6">
                            <label className="block text-gray-700 text-sm font-mono mb-2" htmlFor="password">
                                Password
                            </label>
                            <input 
                                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" 
                                id="password" 
                                type="password" 
                                placeholder="******************"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        
                        <div className="flex items-center justify-between">
                            <button 
                                type="submit"
                                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline"
                                disabled={loading}
                            >
                                {loading ? "Logging in..." : "Sign In"}
                            </button>
                        </div>
                    </form>
                    
                    <div className="text-center">
                        <p className="text-sm">
                            Don&apos;t have an account?{" "}
                            <Link href="/signup" className="text-blue-500 hover:underline">
                                Sign up
                            </Link>
                        </p>
                    </div>
                </div>

                <div className="mt-4">
                    <Link href="/">
                        <button className="px-4 py-2 rounded-full bg-gray-700 font-bold text-white">
                            Back to Home
                        </button>
                    </Link>
                </div>
            </div>
        </div>
    );
}