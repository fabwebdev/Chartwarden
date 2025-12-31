'use client';

import React from 'react';
import { Button, Container, Typography } from '@mui/material';

const GeneratePdf: React.FC = () => {
  const handleGeneratePdf = async () => {
    try {
      const response = await fetch('https://laravel.elediaafrica.com/api/generate-pdf');
      if (!response.ok) {
        console.error('Error fetching PDF:', response.statusText);
        return;
      } else {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'output.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      console.error('Fetch error:', error);
    }
  };

  return (
    <Container>
      <Typography variant="h4" gutterBottom>
        Générer le PDF
      </Typography>
      <Button variant="contained" color="primary" onClick={handleGeneratePdf}>
        Télécharger le PDF
      </Button>
    </Container>
  );
};

export default GeneratePdf;
