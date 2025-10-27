'use client';

import React, { useState } from "react";
import "../login/login.css";  // Reuse the login CSS
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Signup() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [age, setAge] = useState("");
    const [gender, setGender] = useState("");
    const [diseases, setDiseases] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // Reset error state
        setError("");
        
        // Validate form inputs
        if (!username || !password || !confirmPassword) {
            setError("Username and password are required");
            return;
        }
        
        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }
        
        // Validate age if provided
        if (age && (isNaN(Number(age)) || Number(age) <= 0 || Number(age) > 120)) {
            setError("Please enter a valid age between 1 and 120");
            return;
        }
        
        try {
            setLoading(true);
            
            // Call the API route for registration
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ 
                    username, 
                    password,
                    age,
                    gender,
                    diseases
                }),
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || "Registration failed");
            }
            
            if (data.success) {
                setSuccess(true);
                // Redirect to login page after 2 seconds
                setTimeout(() => {
                    router.push("/login");
                }, 2000);
            } else {
                setError(data.error || "Registration failed");
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Error during signup. Please try again.");
            console.error("Signup error:", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-container bg-gray-300 min-h-screen flex items-center justify-center">
            <div id="Signup-section" className="Login-section p-8 rounded-lg shadow-lg">
                <h1 className="font-bold text-xl mb-4">Create an Account</h1>
                
                {success ? (
                    <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
                        <strong className="font-bold">Success! </strong>
                        <span className="block sm:inline">Your account has been created. Redirecting to login...</span>
                    </div>
                ) : (
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
                            
                            <div className="mb-4">
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
                            
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-mono mb-2" htmlFor="confirmPassword">
                                    Confirm Password
                                </label>
                                <input 
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline" 
                                    id="confirmPassword" 
                                    type="password" 
                                    placeholder="******************"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-mono mb-2" htmlFor="age">
                                    Age
                                </label>
                                <input 
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                                    id="age" 
                                    type="number" 
                                    min="1"
                                    max="120"
                                    placeholder="Your age"
                                    value={age}
                                    onChange={(e) => setAge(e.target.value)}
                                />
                            </div>
                            
                            <div className="mb-4">
                                <label className="block text-gray-700 text-sm font-mono mb-2" htmlFor="gender">
                                    Gender
                                </label>
                                <select
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                                    id="gender"
                                    value={gender}
                                    onChange={(e) => setGender(e.target.value)}
                                >
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Non-binary">Non-binary</option>
                                    <option value="Prefer not to say">Prefer not to say</option>
                                </select>
                            </div>
                            
                            <div className="mb-6">
                                <label className="block text-gray-700 text-sm font-mono mb-2" htmlFor="diseases">
                                    Medical Conditions
                                </label>
                                <textarea 
                                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" 
                                    id="diseases" 
                                    placeholder="Enter any medical conditions or diseases..."
                                    rows={4}
                                    value={diseases}
                                    onChange={(e) => setDiseases(e.target.value)}
                                />
                            </div>
                            
                            <div className="flex items-center justify-between">
                                <button 
                                    type="submit"
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline"
                                    disabled={loading}
                                >
                                    {loading ? "Creating Account..." : "Sign Up"}
                                </button>
                            </div>
                        </form>
                        
                        <div className="text-center">
                            <p className="text-sm">
                                Already have an account?{" "}
                                <Link href="/login" className="text-blue-500 hover:underline">
                                    Log in
                                </Link>
                            </p>
                        </div>
                    </div>
                )}

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