'use client';

import React from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the BloodCellsBackground component with no SSR
const BloodCellsBackground = dynamic(
  () => import('./BloodCellsBackground'),
  { ssr: false }
);

export default function ClientWrapper() {
  return <BloodCellsBackground />;
} 