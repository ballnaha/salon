'use client';

import React, { useState } from 'react';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import Sidebar from '@/components/admin/sidebar';
import Header from '@/components/admin/header';

const shellBackground = 'radial-gradient(circle at 0% 0%, #2d1b22 0%, #1a1114 50%, #0d0810 100%)';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ 
      display: 'flex', 
      minHeight: '100vh', 
      background: '#f8fafc',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Subtle light glow */}
      <Box sx={{
        position: 'absolute',
        top: '-10%',
        right: '-10%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(217,147,164,0.03) 0%, transparent 70%)',
        filter: 'blur(60px)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <Box sx={{ 
        flexGrow: 1, 
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1,
      }}>
        <Header onMenuClick={() => setMobileOpen(true)} />
        
        <Box 
          component="main" 
          sx={{ 
            flexGrow: 1, 
            p: { xs: 2, md: 4 },
            background: 'transparent',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
