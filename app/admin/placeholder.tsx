'use client';
import React from 'react';
import { Box, Typography, Stack, Paper } from '@mui/material';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <Box>
      <Stack spacing={0.5} sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: '#1e293b', fontWeight: 900, letterSpacing: -1 }}>
          {title}
        </Typography>
        <Typography sx={{ color: '#64748b', fontSize: '1rem', fontWeight: 500 }}>
          หน้าจัดการข้อมูล {title} ของระบบ
        </Typography>
      </Stack>
      <Paper sx={{ 
        p: 4, 
        bgcolor: 'white', 
        border: '1px solid #e2e8f0', 
        borderRadius: '24px', 
        minHeight: 450, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
      }}>
        <Typography sx={{ color: '#cbd5e1', fontWeight: 800, fontSize: '1.2rem' }}>
          {title} Content Module Coming Soon
        </Typography>
      </Paper>
    </Box>
  );
}
