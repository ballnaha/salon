'use client';

import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import { Magicpen, Home2, ArrowLeft } from 'iconsax-react';
import Link from 'next/link';

const accentRose = '#d993a4';

export default function NotFound() {
  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      bgcolor: '#f8fafc',
      p: 3,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Decorative Elements */}
      <Box sx={{
        position: 'absolute',
        top: '-10%',
        right: '-10%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(217,147,164,0.1) 0%, transparent 70%)',
        filter: 'blur(60px)',
        zIndex: 0
      }} />
      <Box sx={{
        position: 'absolute',
        bottom: '-10%',
        left: '-10%',
        width: '40%',
        height: '40%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)',
        filter: 'blur(60px)',
        zIndex: 0
      }} />

      <Stack spacing={4} sx={{ textAlign: 'center', zIndex: 1, alignItems: 'center' }}>
        <Box sx={{ position: 'relative' }}>
          <Typography sx={{
            fontSize: { xs: '120px', md: '200px' },
            fontWeight: 900,
            lineHeight: 1,
            color: '#1e293b',
            opacity: 0.05,
            letterSpacing: -10
          }}>
            404
          </Typography>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100%'
          }}>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', justifyContent: 'center' }}>
              <Magicpen size={48} variant="Bulk" color={accentRose} />
              <Typography variant="h2" sx={{ fontWeight: 900, color: '#1e293b', letterSpacing: -2 }}>
                Oops!
              </Typography>
            </Stack>
          </Box>
        </Box>

        <Stack spacing={1}>
          <Typography variant="h5" sx={{ color: '#1e293b', fontWeight: 800 }}>
            ขออภัย ไม่พบหน้าที่คุณต้องการ
          </Typography>
          <Typography sx={{ color: '#64748b', maxWidth: '400px', mx: 'auto' }}>
            หน้าที่คุณกำลังมองหาอาจถูกลบไปแล้ว เปลี่ยนชื่อ หรือไม่สามารถใช้งานได้ชั่วคราว
          </Typography>
        </Stack>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            component={Link}
            href="/"
            variant="contained"
            startIcon={<Home2 size={20} variant="Bold" color="currentColor" />}
            sx={{
              bgcolor: '#1e293b',
              color: 'white',
              px: 4,
              py: 1.5,
              borderRadius: '16px',
              fontWeight: 800,
              textTransform: 'none',
              boxShadow: '0 10px 15px -3px rgba(30, 41, 59, 0.2)',
              '&:hover': { bgcolor: '#0f172a', transform: 'translateY(-2px)' },
              transition: 'all 0.2s ease'
            }}
          >
            กลับหน้าหลัก
          </Button>
          <Button
            onClick={() => window.history.back()}
            variant="outlined"
            startIcon={<ArrowLeft size={20} color="currentColor" />}
            sx={{
              borderColor: '#e2e8f0',
              color: '#64748b',
              px: 4,
              py: 1.5,
              borderRadius: '16px',
              fontWeight: 800,
              textTransform: 'none',
              '&:hover': { borderColor: '#cbd5e1', bgcolor: '#f8fafc' },
              transition: 'all 0.2s ease'
            }}
          >
            ย้อนกลับ
          </Button>
        </Stack>
      </Stack>

      <Box sx={{ position: 'absolute', bottom: 40, width: '100%', textAlign: 'center' }}>
        <Typography variant="body2" sx={{ color: '#cbd5e1', fontWeight: 700, letterSpacing: 2 }}>
          WEGO<span style={{ color: accentRose }}>WELUP</span> | เวโกเวลอป
        </Typography>
      </Box>
    </Box>
  );
}
