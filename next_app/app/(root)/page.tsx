'use client';
import React from "react";
import blood_logo from "../../public/logo_NEW_.png";
import Link from "next/link";
import ClientWrapper from "../components/ClientWrapper";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-black text-black overflow-hidden font-mono">
      {/* Blood Cells Background */}
      <ClientWrapper />

      <div id="header" className="relative rounded-box p-4 bg-opacity-90 bg-gray-200 z-10">
        <div id="Logo">
          <img src={blood_logo.src} alt="Blood Logo" width={100} height={100} />
        </div>
        <div id="subsection">
          <nav className="flex gap-6">
            <a href="#main-section" className="px-5 py-2 rounded-full bg-gray-700 text-white font-bold shadow-md hover:bg-gray-600 transition-transform transform hover:scale-110 hover:shadow-xl">Home</a>
            <a href="#about-section" className="px-5 py-2 rounded-full bg-gray-700 text-white font-bold shadow-md hover:bg-gray-600 transition-transform transform hover:scale-110 hover:shadow-xl">Overview</a>
          </nav>
        </div>
        <div id="login">
          <div className="flex gap-4">
            <Link href="/signup" className="px-6 py-3 rounded-full bg-green-600 text-white font-bold shadow-lg hover:bg-green-500 transition-transform transform hover:scale-110 hover:shadow-xl">
              Sign Up
            </Link>
            <Link href="/login" className="px-6 py-3 rounded-full bg-gray-700 text-white font-bold shadow-lg hover:bg-gray-600 transition-transform transform hover:scale-110 hover:shadow-xl">
              Login
            </Link>
          </div>
        </div>
      </div>
      <div id="main-section" className="relative text-center mt-14 z-10">
        <h1 className="text-6xl font-bold mb-3 font-extrabold" style={{ color: "maroon" }}>Welcome to BloodBud!<br/></h1>
        <h3 className="text-2xl font-bold mb-6">Understanding your blood work, made simple</h3>
        <div className="bg-gray-200 p-6 max-w-4xl mx-auto rounded-xl shadow-md mt-16 z-8">
          <p className="text-xl font-georgia mb-4">Your AI-powered blood analysis tool designed with you in mind. Simply upload your blood test results and receive a comprehensive report with clear, AI-driven insights that help you understand what your numbers really mean.</p>
          <p className="text-xl font-georgia mb-4">Our advanced AI technology breaks down complex medical data, helping you understand key health indicators and what they mean for your well-being. Whether you&apos;re tracking changes over time, managing a chronic condition, or simply curious about your results, we make bloodwork more accessible and easier to interpret.</p>         
          <p className="text-xl font-georgia mb-4">BloodBud&apos;s intelligent system identifies patterns and potential concerns in your bloodwork that might otherwise go unnoticed, providing you with a deeper understanding of your health status and trends over time.</p>
          <p className="text-xl font-georgia">Take control of your health journey with BloodBud—because understanding your body shouldn&apos;t require a medical degree. Start making informed decisions about your health today!</p>
        </div>
      </div>
    </div>
  );
}
