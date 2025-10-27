'use client'

import React, { useState, useEffect } from "react";
import { Report } from "./ReportList";
import "../report.css";

interface ReportUploadProps {
    onReportUploaded?: (report: Report) => void;
}

export default function ReportUpload({ onReportUploaded }: ReportUploadProps) {
    const [reportName, setReportName] = useState("");
    const [reportDate, setReportDate] = useState("");
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [reportNumber, setReportNumber] = useState("");
    const [isUploaded, setIsUploaded] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [analysisResults, setAnalysisResults] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [fileUrl, setFileUrl] = useState("");
    const [clientId, setClientId] = useState<number | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [progress, setProgress] = useState(0);

    // Check if user is logged in on component mount
    useEffect(() => {
        const clientData = localStorage.getItem("client");
        if (clientData) {
            try {
                const client = JSON.parse(clientData);
                if (client && client.client_id) {
                    setClientId(client.client_id);
                    setIsLoggedIn(true);
                }
            } catch (error) {
                console.error("Error parsing client data:", error);
            }
        }
    }, []);

    // Generate a random report number
    const generateReportNumber = () => {
        const timestamp = new Date().getTime();
        const random = Math.floor(Math.random() * 1000);
        return `RPT-${timestamp.toString().slice(-6)}-${random}`;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFile(e.target.files[0]);
        }
    };
    

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedFile && reportName && reportDate) {
            // Generate report number on submission
            const newReportNumber = generateReportNumber();
            setReportNumber(newReportNumber);
            
            try {
                setUploadStatus("Uploading...");
                setIsAnalyzing(true);
                
                // Create a FormData object to send the file
                const formData = new FormData();
                formData.append("file", selectedFile);
                formData.append("reportName", reportName);
                formData.append("reportDate", reportDate);
                formData.append("reportNumber", newReportNumber);
                
                // Add client_id if available
                if (clientId) {
                    formData.append("client_id", clientId.toString());
                }
                
                // Send the file to the API route
                const response = await fetch("/api/upload", {
                    method: "POST",
                    body: formData,
                });
                
                if (!response.ok) {
                    throw new Error("Upload failed");
                }
                
                const data = await response.json();
                console.log("Upload successful:", data);
                
                // Store the analysis results if available
                let analysisText = null;
                if (data.analysis) {
                    console.log("Analysis results received:");
                    console.log(data.analysis);
                    
                    // Log the actual analysis text
                    if (data.analysis.analysis) {
                        console.log("Analysis text:");
                        console.log(data.analysis.analysis);
                        analysisText = data.analysis.analysis;
                    }
                    
                    setAnalysisResults(analysisText || "No analysis available");
                    setUploadStatus("Upload and analysis successful!");
                    
                    // Save results to the report table if client is logged in
                    if (clientId && analysisText) {
                        try {
                            let reportId: number | undefined;
                            const saveResponse = await fetch("/api/save-report", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json",
                                },
                                body: JSON.stringify({
                                    client_id: clientId,
                                    title: reportName,
                                    analysis_results: analysisText,
                                    report_number: parseInt(newReportNumber.replace(/\D/g, '')) || Math.floor(Math.random() * 1000000),
                                    report_date: reportDate
                                }),
                            });
                            
                            if (saveResponse.ok) {
                                console.log("Results saved to report table");
                                // Get the report_ID from the response
                                const saveData = await saveResponse.json();
                                if (saveData.report_ID) {
                                    console.log("Report ID:", saveData.report_ID);
                                    reportId = saveData.report_ID;
                                }
                            } else {
                                console.error("Failed to save results to report table");
                            }

                            // Call the onReportUploaded callback if provided
                            if (onReportUploaded) {
                                const newReport: Report = {
                                    ReportName: reportName,
                                    ReportDate: reportDate,
                                    ReportNumber: newReportNumber,
                                    fileUrl: data.fileUrl,
                                    analysisResults: analysisText,
                                    client_id: clientId,
                                    report_ID: reportId
                                };
                                
                                // Store the new report in local storage
                                try {
                                    const savedReports = localStorage.getItem('bloodwork_reports');
                                    let reports: Report[] = [];
                                    
                                    if (savedReports) {
                                        reports = JSON.parse(savedReports);
                                    }
                                    
                                    // Add the new report if it doesn't already exist
                                    const exists = reports.some(r => 
                                        r.ReportNumber === newReport.ReportNumber || 
                                        (r.fileUrl === newReport.fileUrl && r.client_id === newReport.client_id)
                                    );
                                    
                                    if (!exists) {
                                        reports.push(newReport);
                                        localStorage.setItem('bloodwork_reports', JSON.stringify(reports));
                                    }
                                } catch (storageError) {
                                    console.error("Error storing report in local storage:", storageError);
                                }
                                
                                onReportUploaded(newReport);
                            }
                            
                            setIsUploaded(true);
                            setIsAnalyzing(false);
                        } catch (error) {
                            console.error("Error saving results:", error);
                            setUploadStatus("Upload successful, but analysis failed.");
                            setIsAnalyzing(false);
                        }
                    }
                } else if (data.analysisError) {
                    console.log("Analysis error:", data.analysisError);
                    setAnalysisResults("Analysis failed: " + data.analysisError);
                    setUploadStatus("Upload successful, but analysis failed.");
                    setIsAnalyzing(false);
                } else {
                    console.log("No analysis results in response");
                    setUploadStatus("Upload successful!");
                    setIsAnalyzing(false);
                }
                
                // Set the file URL
                setFileUrl(data.fileUrl || "");
            } catch (error) {
                console.error("Error uploading file:", error);
                setUploadStatus("Upload failed. Please try again.");
                setIsAnalyzing(false);
            }
        }
    };


    useEffect(() => {
        if (isAnalyzing) {
            setProgress(0); // Reset progress when analysis starts
    
            const interval = setInterval(() => {
                setProgress((prevProgress) => {
                    if (prevProgress >= 100) {
                        clearInterval(interval);
                        return 100;
                    }
                    return prevProgress + 5; // Adjust step size for speed
                });
            }, 500); // Adjust interval duration for smoother effect
    
            return () => clearInterval(interval); // Cleanup
        } else {
            setProgress(0); // Reset progress when analysis stops
        }
    }, [isAnalyzing]);

    return (
        <div className="upload-container p-6 rounded-lg shadow-md text-white border border-gray-300" style={{ backgroundColor: '#5F8D99' }}>
            <h1 className="text-xl font-bold mb-4">Bloodwork Upload</h1>
            
            {!isLoggedIn ? (
                <div className="p-4 bg-blue-700 bg-opacity-50 border border-blue-400 rounded-md">
                    <p className="text-white">Please log in to save your reports to your account.</p>
                    <a href="/login" className="mt-2 inline-block px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                        Log In
                    </a>
                </div>
            ) : !isUploaded ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="form-group">
                        <label htmlFor="reportName" className="block text-sm font-medium mb-1">
                            Report Name
                        </label>
                        <input
                            type="text"
                            id="reportName"
                            value={reportName}
                            onChange={(e) => setReportName(e.target.value)}
                            className="w-full px-3 py-2 border border-blue-300 bg-blue-50 text-blue-900 rounded-md"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="reportDate" className="block text-sm font-medium mb-1">
                            Report Date
                        </label>
                        <input
                            type="date"
                            id="reportDate"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                            className="w-full px-3 py-2 border border-blue-300 bg-blue-50 text-blue-900 rounded-md"
                            required
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="pdfUpload" className="block text-sm font-medium mb-1">
                            Upload PDF Report
                        </label>
                        <input
                            type="file"
                            id="pdfUpload"
                            accept=".pdf"
                            onChange={handleFileChange}
                            className="w-full px-3 py-2 border border-blue-300 bg-blue-50 text-blue-900 rounded-md"
                            required
                        />
                    </div>
                    
                    <button
                        type="submit"
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 shadow-md"
                        disabled={!selectedFile || !reportName || !reportDate || isAnalyzing}
                    >
                        {isAnalyzing ? "Processing..." : "Upload Report"}
                    </button>

                    {isAnalyzing && (
                        <div className="w-full flex justify-center mt-4 relative">
                            <div className="progress-container">
                            <div 
                                className="progress-bar"
                                style={{ width: `${progress}%` }}  // Controls the progress bar width based on progress
                            ></div>
                            {/* Syringe Image Overlay */}
                            <img 
                                src="/SyringeTransparent-removebg-preview.png" 
                                alt="Syringe"
                                className="syringe-image"
                            />
                            </div>
                        </div>
                        )}
                </form>
            ) : (
                <div className="success-message space-y-4">
                    <div className="p-4 bg-blue-700 bg-opacity-50 border border-blue-400 rounded-md">
                        <p className="text-white">{uploadStatus || "Report uploaded successfully!"}</p>
                    </div>
                    
                    <div className="report-details p-4 border border-blue-400 bg-blue-700 bg-opacity-30 rounded-md">
                        <h2 className="font-bold mb-2">Report Details</h2>
                        <p><strong>Report Number:</strong> {reportNumber}</p>
                        <p><strong>Report Name:</strong> {reportName}</p>
                        <p><strong>Report Date:</strong> {reportDate}</p>
                        <p><strong>File Name:</strong> {selectedFile?.name}</p>
                        <div className="mt-4">
                            <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 inline-block shadow-md"
                            >
                                View PDF
                            </a>
                        </div>
                    </div>
                    
                    {analysisResults && (
                        <div className="analysis-results p-4 border border-blue-400 bg-blue-700 bg-opacity-30 rounded-md">
                            <h2 className="font-bold mb-2">Blood Analysis Results</h2>
                            <div className="whitespace-pre-wrap">{analysisResults}</div>
                        </div>
                    )}
                    
                    {/* Debug section - only visible in development */}
                    {process.env.NODE_ENV === 'development' && (
                        <div className="debug-section p-4 border border-blue-300 rounded-md bg-blue-700 bg-opacity-20 mt-4">
                            <details>
                                <summary className="font-bold cursor-pointer">Debug Information</summary>
                                <div className="mt-2">
                                    <p><strong>Report Number:</strong> {reportNumber}</p>
                                    <p><strong>File Path:</strong> {fileUrl}</p>
                                    <p><strong>Client ID:</strong> {clientId || "Not logged in"}</p>
                                    <p><strong>Raw Analysis Results:</strong></p>
                                    <pre className="bg-blue-50 text-blue-900 p-2 rounded text-xs overflow-auto max-h-60">
                                        {JSON.stringify(analysisResults, null, 2)}
                                    </pre>
                                </div>
                            </details>
                        </div>
                    )}
                    
                    <button
                        onClick={() => {
                            setIsUploaded(false);
                            setSelectedFile(null);
                            setReportName("");
                            setReportDate("");
                            setReportNumber("");
                            setUploadStatus("");
                            setAnalysisResults(null);
                            setFileUrl("");
                        }}
                        className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 shadow-md"
                    >
                        Upload Another Report
                    </button>
                </div>
            )}
        </div>
    );
}