'use client';

import React from 'react';
import { Box, Typography, Stack, Paper } from '@mui/material';

export default function BookingsPage() {
  return (
    <Box>
      <Stack spacing={1} sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ color: 'white', fontWeight: 900, letterSpacing: -1 }}>
          การจอง (Bookings)
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.95rem' }}>
          จัดการตารางนัดหมายของลูกค้า
        </Typography>
      </Stack>

      <Paper sx={{
        p: 4,
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        minHeight: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.2)', fontWeight: 700 }}>
          Booking Calendar / List Placeholder
        </Typography>
      </Paper>
    </Box>
  );
}
