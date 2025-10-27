'use client';
import React, { useState, useEffect } from "react";
import Header from "./componets/header";
import ReportUpload from "./componets/ReportUpload";
import ReportList, { Report } from "./componets/ReportList";
import "./report.css";
import Link from "next/link";

// Local storage key
const REPORTS_STORAGE_KEY = 'bloodwork_reports';

export default function ReportAnalysis() {
    // State for reports - initialize from local storage if available
    const [reports, setReports] = useState<Report[]>([]);
    
    // State for selected report details
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    
    // State for client ID
    const [clientId, setClientId] = useState<number | null>(null);
    
    // Load client ID and reports from local storage on component mount
    useEffect(() => {
        // Get client ID from local storage
        try {
            const clientData = localStorage.getItem("client");
            if (clientData) {
                const client = JSON.parse(clientData);
                if (client && client.client_id) {
                    setClientId(client.client_id);
                }
            }
        } catch (error) {
            console.error("Error loading client data:", error);
        }
        
        const loadReports = async () => {
            try {
                // First try to load from local storage
                const savedReports = localStorage.getItem(REPORTS_STORAGE_KEY);
                let localReports: Report[] = [];
                
                if (savedReports) {
                    localReports = JSON.parse(savedReports);
                    setReports(localReports);
                }
                
                // If client is logged in, also fetch reports from database
                if (clientId) {
                    try {
                        const response = await fetch(`/api/get-reports?client_id=${clientId}`);
                        
                        if (!response.ok) {
                            throw new Error("Failed to fetch reports from database");
                        }
                        
                        const data = await response.json();
                        
                        if (data.success && Array.isArray(data.reports)) {
                            // Convert database reports to the Report format
                            const dbReports: Report[] = data.reports.map((report: any) => ({
                                ReportName: report.report_name || `Report ${report.report_ID || 'Unknown'}`,
                                ReportDate: report.report_date || new Date().toISOString().split('T')[0],
                                ReportNumber: report.report_number ? report.report_number.toString() : `DB-${report.report_ID || Date.now()}`,
                                fileUrl: report.file_url || '',
                                analysisResults: report.results || '',
                                client_id: report.client_id,
                                report_ID: report.report_ID
                            }));
                            
                            // Combine with local reports, avoiding duplicates
                            const combinedReports = [...localReports];
                            
                            dbReports.forEach((dbReport: Report) => {
                                // Check if report already exists in combined reports
                                const exists = combinedReports.some(
                                    r => (r.ReportNumber === dbReport.ReportNumber && 
                                         r.client_id === dbReport.client_id)
                                );
                                
                                if (!exists) {
                                    combinedReports.push(dbReport);
                                }
                            });
                            
                            // Update state and local storage
                            setReports(combinedReports);
                            localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(combinedReports));
                        }
                    } catch (error: unknown) {
                        console.error("Error fetching reports:", error);
                        // Continue with local storage reports if available
                    }
                } else if (!savedReports) {
                    // Set sample reports if no saved reports exist and no client is logged in
                    const sampleReports = [
                        { ReportName: "Sample Report 1", ReportDate: "2024-01-01", ReportNumber: "RPT-123456-789" },
                        { ReportName: "Sample Report 2", ReportDate: "2024-02-15", ReportNumber: "RPT-234567-890" }
                    ];
                    setReports(sampleReports);
                    localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(sampleReports));
                }
            } catch (error) {
                console.error("Error loading reports:", error);
                // Set default reports on error
                const defaultReports = [
                    { ReportName: "Sample Report 1", ReportDate: "2024-01-01", ReportNumber: "RPT-123456-789" },
                    { ReportName: "Sample Report 2", ReportDate: "2024-02-15", ReportNumber: "RPT-234567-890" }
                ];
                setReports(defaultReports);
                localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(defaultReports));
            }
        };
        
        loadReports();
    }, [clientId]);
    
    // Save reports to local storage whenever they change
    useEffect(() => {
        localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports));
    }, [reports]);
    
    // Handle new report upload
    const handleReportUploaded = (newReport: Report) => {
        setReports(prevReports => [newReport, ...prevReports]);
    };
    
    // Handle view details
    const handleViewDetails = (report: Report) => {
        setSelectedReport(report);
        // Navigate to the report details page with the report number as a parameter
        window.location.href = `/report_analysis/report_page?reportNumber=${report.ReportNumber}`;
    };
    
    // Handle report deletion
    const handleDeleteReport = async (reportNumber: string) => {
        // Find the report to get its client_id
        const reportToDelete = reports.find(report => report.ReportNumber === reportNumber);
        
        // If the user is logged in and the report has a client_id, delete from database
        if (clientId && reportToDelete && reportToDelete.client_id) {
            try {
                const response = await fetch('/api/delete-report', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        report_number: parseInt(reportNumber.replace(/\D/g, '')) || reportNumber,
                        client_id: clientId
                    }),
                });
                
                if (!response.ok) {
                    console.error('Failed to delete report from database');
                } else {
                    console.log('Report deleted from database successfully');
                }
            } catch (error) {
                console.error('Error deleting report from database:', error);
            }
        }
        
        // Remove from local state regardless of database operation
        setReports(prevReports => prevReports.filter(report => report.ReportNumber !== reportNumber));
        if (selectedReport && selectedReport.ReportNumber === reportNumber) {
            setSelectedReport(null);
        }
    };
    
    // Add a function to handle delete with confirmation
    const handleDeleteWithConfirmation = (reportNumber: string, reportName: string) => {
        if (window.confirm(`Are you sure you want to delete "${reportName}"? This action cannot be undone.`)) {
            handleDeleteReport(reportNumber);
        }
    };
    
    return (
        <div className="relative min-h-screen overflow-hidden font-mono">
            {/* Background - Matching the root page */}
            <div className="absolute inset-0 bg-black before:content-[''] before:absolute before:inset-0 before:bg-[url('/Nelson.jpg')] before:bg-cover before:bg-center before:opacity-100">
            </div>
            
            <div className="container mx-auto px-4 py-8 relative z-10">
                <div id="header-section"> 
                    <Header/>
                </div>
                
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-2xl font-bold text-white">Blood Test Reports</h1>
                    <Link 
                        href="/report_analysis/trends" 
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                            <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
                        </svg>
                        View Trends
                    </Link>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
                    <div id="report-upload" className="md:order-2">
                        <div className="report-upload-section">
                            <ReportUpload onReportUploaded={handleReportUploaded} />
                        </div>
                    </div>
                    
                    <div id="report-summary" className="md:order-1 bg-white p-6 rounded-lg shadow-md">
                        <ReportList 
                            reports={reports} 
                            onViewDetails={handleViewDetails} 
                            onDeleteReport={handleDeleteReport} 
                        />
                    </div>
                </div>
                
                {/* Report Details Modal/Section */}
                {selectedReport && (
                    <div className="mt-8 p-4 border rounded-md bg-white">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold mb-4">Report Details: {selectedReport.ReportName}</h2>
                            <button 
                                onClick={() => handleDeleteWithConfirmation(selectedReport.ReportNumber, selectedReport.ReportName)}
                                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                            >
                                Delete Report
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p><strong>Report Name:</strong> {selectedReport.ReportName}</p>
                                <p><strong>Report Date:</strong> {selectedReport.ReportDate}</p>
                                <p><strong>Report Number:</strong> {selectedReport.ReportNumber}</p>
                                
                                {selectedReport.fileUrl && (
                                    <div className="mt-4">
                                        <a 
                                            href={selectedReport.fileUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 inline-block"
                                        >
                                            View PDF
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {selectedReport.analysisResults && (
                            <div className="mt-4">
                                <h3 className="font-bold mb-2">Analysis Results</h3>
                                <div className="whitespace-pre-wrap p-4 border rounded-md bg-gray-50 max-h-96 overflow-y-auto">
                                    {selectedReport.analysisResults}
                                </div>
                            </div>
                        )}
                        
                        <button 
                            onClick={() => setSelectedReport(null)}
                            className="mt-4 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                        >
                            Close Details
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}   
