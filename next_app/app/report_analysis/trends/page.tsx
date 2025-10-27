'use client';
import React, { useState, useEffect } from "react";
import { Report } from "../componets/ReportList";
import Header from "../componets/header";
import Link from "next/link";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Local storage key (must match the one in the main page)
const REPORTS_STORAGE_KEY = 'bloodwork_reports';

// Interface for test data point
interface TestDataPoint {
  date: string;
  value: number;
  reportNumber: string;
}

// Interface for test data series
interface TestData {
  [testName: string]: TestDataPoint[];
}

export default function TrendsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);
  const [testData, setTestData] = useState<TestData>({});
  const [availableTests, setAvailableTests] = useState<string[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>("");

  // Load client ID and reports
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
              
              // Update state
              setReports(combinedReports);
            }
          } catch (dbError) {
            console.error("Error fetching reports from database:", dbError);
            // Continue with local storage reports if available
          }
        }

        setLoading(false);
      } catch (error) {
        console.error("Error loading reports:", error);
        setError("Failed to load reports");
        setLoading(false);
      }
    };
    
    loadReports();
  }, [clientId]);

  // Extract test data from reports
  useEffect(() => {
    if (reports.length === 0) return;

    const extractedData: TestData = {};
    
    // Sort reports by date
    const sortedReports = [...reports].sort((a, b) => 
      new Date(a.ReportDate).getTime() - new Date(b.ReportDate).getTime()
    );

    sortedReports.forEach(report => {
      if (!report.analysisResults) return;

      // Extract test results using regex patterns
      const testPatterns = [
        // Pattern for "TEST: value unit" format
        /([A-Za-z\s]+):\s*(\d+\.?\d*)\s*([a-zA-Z/%]+)/g,
        // Pattern for table format with test name and value
        /\|\s*([A-Za-z\s]+)\s*\|\s*(\d+\.?\d*)\s*([a-zA-Z/%]+)\s*\|/g
      ];

      let matches: RegExpExecArray | null;
      
      testPatterns.forEach(pattern => {
        while ((matches = pattern.exec(report.analysisResults || '')) !== null) {
          const testName = matches[1].trim();
          const value = parseFloat(matches[2]);
          
          if (!isNaN(value)) {
            if (!extractedData[testName]) {
              extractedData[testName] = [];
            }
            
            extractedData[testName].push({
              date: report.ReportDate,
              value: value,
              reportNumber: report.ReportNumber
            });
          }
        }
      });
    });

    // Set the extracted data
    setTestData(extractedData);
    
    // Set available tests
    const tests = Object.keys(extractedData).filter(test => 
      extractedData[test].length > 1 // Only include tests with multiple data points
    );
    setAvailableTests(tests);
    
    // Set default selected test if available
    if (tests.length > 0 && !selectedTest) {
      setSelectedTest(tests[0]);
    }
  }, [reports]);

  // Prepare chart data
  const getChartData = () => {
    if (!selectedTest || !testData[selectedTest]) {
      return {
        labels: [],
        datasets: []
      };
    }

    // Sort data points by date
    const sortedData = [...testData[selectedTest]].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    return {
      labels: sortedData.map(point => point.date),
      datasets: [
        {
          label: selectedTest,
          data: sortedData.map(point => point.value),
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.1
        }
      ]
    };
  };

  // Chart options
  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `${selectedTest} Trends Over Time`,
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const dataPoint = testData[selectedTest][context.dataIndex];
            return `${selectedTest}: ${context.parsed.y} (Report: ${dataPoint.reportNumber})`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Header />
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Header />
        <div className="text-center py-8">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
          <div className="mt-4">
            <Link href="/report_analysis" className="text-blue-500 hover:underline">
              Return to Reports List
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Header />
      
      <div className="mb-4">
        <Link href="/report_analysis" className="text-blue-500 hover:underline flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Reports List
        </Link>
      </div>
      
      <div className="bg-white shadow-md rounded-lg overflow-hidden p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Test Result Trends</h1>
        
        {availableTests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">
              Not enough data to show trends. Please upload at least two reports with the same test results.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label htmlFor="testSelect" className="block text-sm font-medium text-gray-700 mb-2">
                Select Test to Visualize:
              </label>
              <select
                id="testSelect"
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                {availableTests.map(test => (
                  <option key={test} value={test}>{test}</option>
                ))}
              </select>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <Line data={getChartData()} options={chartOptions} />
            </div>
            
            {selectedTest && testData[selectedTest] && (
              <div className="mt-8">
                <h2 className="text-xl font-semibold mb-4">Data Points for {selectedTest}</h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Report
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {[...testData[selectedTest]]
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((point, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {point.date}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                              {point.value}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <Link 
                                href={`/report_analysis/report_page?reportNumber=${point.reportNumber}`}
                                className="text-blue-500 hover:underline"
                              >
                                View Report
                              </Link>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 