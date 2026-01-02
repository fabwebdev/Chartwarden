'use client';

import { useState } from 'react';
import ReportsListView from 'views/reports/ReportsListView';
import ReportGenerationDialog from 'views/reports/ReportGenerationDialog';

export default function ReportsPage() {
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleGenerateClick = () => {
    setGenerateDialogOpen(true);
  };

  const handleGenerateSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <>
      <ReportsListView key={refreshTrigger} onGenerateReport={handleGenerateClick} />
      <ReportGenerationDialog
        open={generateDialogOpen}
        onClose={() => setGenerateDialogOpen(false)}
        onSuccess={handleGenerateSuccess}
      />
    </>
  );
}
