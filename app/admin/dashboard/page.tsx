'use client';

import React from 'react';
import { Box, Typography, Paper, Stack, IconButton, Button } from '@mui/material';
import {
  CalendarTick,
  Magicpen,
  People,
  WalletMoney,
  ArrowRight,
  More,
  TrendUp,
  DirectInbox,
  Star,
  Chart
} from 'iconsax-react';

import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

const accentRose = '#d993a4';

const stats = [
  { label: 'การจองวันนี้', value: '12', icon: CalendarTick, color: '#f59e0b', trend: '+15%' },
  { label: 'AI Try-On', value: '154', icon: Magicpen, color: '#6366f1', trend: '+22%' },
  { label: 'ลูกค้าใหม่', value: '8', icon: People, color: '#ec4899', trend: '+5%' },
  { label: 'รายได้วันนี้', value: '฿12,400', icon: WalletMoney, color: '#10b981', trend: '+12%' },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as any)?.role === 'SUPER_ADMIN';

  return (
    <Box sx={{ pb: 8 }}>
      {/* Header / Welcome Section */}
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        mb: 5,
        mt: 2
      }}>
        <Stack spacing={0.5}>
          <Typography sx={{ color: accentRose, fontWeight: 800, fontSize: '0.8rem', letterSpacing: 2 }}>
            {isAdmin ? 'PLATFORM OVERVIEW' : 'BRANCH DASHBOARD'}
          </Typography>
          <Typography variant="h3" sx={{ color: '#1e293b', fontWeight: 900, letterSpacing: -1.5, fontSize: { xs: '2rem', md: '2.5rem' } }}>
            {isAdmin ? 'ยินดีต้อนรับ แอดมินระบบ' : `ยินดีต้อนรับ ${session?.user?.name || 'กลับมา'}`}
          </Typography>
          <Typography sx={{ color: '#64748b', fontSize: '1rem', fontWeight: 500 }}>
            {isAdmin 
              ? 'ภาพรวมความเคลื่อนไหวของทุกร้านค้าในระบบ Wegowelup' 
              : 'ภาพรวมธุรกิจและความเคลื่อนไหวล่าสุดของร้านคุณ'}
          </Typography>
        </Stack>

        <Button
          variant="contained"
          startIcon={<DirectInbox size={20} variant="Bold" color="currentColor" />}
          sx={{
            bgcolor: '#1e293b',
            color: 'white',
            borderRadius: '16px',
            px: 3,
            py: 1.5,
            fontWeight: 800,
            textTransform: 'none',
            boxShadow: '0 10px 15px -3px rgba(30, 41, 59, 0.2)',
            '&:hover': { bgcolor: '#0f172a', transform: 'translateY(-2px)' },
            transition: 'all 0.2s ease',
            display: { xs: 'none', sm: 'flex' }
          }}
        >
          สรุปรายงานประจำเดือน
        </Button>
      </Box>

      {/* Stats Cards Grid */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'repeat(2, 1fr)',
          md: 'repeat(4, 1fr)'
        },
        gap: 3,
        mb: 5
      }}>
        {stats.map((stat) => (
          <Paper key={stat.label} sx={{
            p: 3,
            bgcolor: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              transform: 'translateY(-6px)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)',
              borderColor: stat.color,
              '& .stat-icon': { bgcolor: stat.color, color: 'white', transform: 'scale(1.1)' }
            }
          }}>
            <Stack spacing={3}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box className="stat-icon" sx={{
                  width: 50,
                  height: 50,
                  borderRadius: '16px',
                  bgcolor: `${stat.color}15`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: stat.color,
                  transition: 'all 0.3s ease'
                }}>
                  <stat.icon size={26} variant="Bulk" color="currentColor" />
                </Box>
                <Box sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  bgcolor: '#f0fdf4',
                  px: 1.2,
                  py: 0.6,
                  borderRadius: '10px',
                  border: '1px solid #dcfce7'
                }}>
                  <TrendUp size={14} color="currentColor" variant="Bold" />
                  <Typography sx={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 800 }}>
                    {stat.trend}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography sx={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  {stat.label}
                </Typography>
                <Typography sx={{ color: '#1e293b', fontSize: '1.8rem', fontWeight: 900, mt: 0.5 }}>
                  {stat.value}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        ))}
      </Box>

      {/* Main Content Layout */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          md: 'minmax(0, 2fr) 1fr'
        },
        gap: 3
      }}>
        {/* Left: Performance Chart Placeholder */}
        <Paper sx={{
          bgcolor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '32px',
          p: 4,
          minHeight: 480,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Stack spacing={0.5}>
              <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 900 }}>ประสิทธิภาพของร้าน</Typography>
              <Typography sx={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 500 }}>เปรียบเทียบข้อมูลการใช้งาน AI และการจองรายสัปดาห์</Typography>
            </Stack>
            <IconButton sx={{ color: '#64748b', bgcolor: '#f1f5f9', '&:hover': { bgcolor: '#e2e8f0' } }}>
              <More size={20} color="currentColor" />
            </IconButton>
          </Box>
          <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e2e8f0', borderRadius: '24px', bgcolor: '#f8fafc' }}>
            <Stack spacing={2} sx={{ alignItems: 'center' }}>
              <Chart size={48} color="currentColor" variant="Bulk" />
              <Typography sx={{ color: '#94a3b8', fontWeight: 700 }}>
                Performance Analytics Chart Placeholder
              </Typography>
            </Stack>
          </Box>
        </Paper>

        {/* Right: Recent Bookings */}
        <Paper sx={{
          bgcolor: 'white',
          border: '1px solid #e2e8f0',
          borderRadius: '32px',
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Typography variant="h6" sx={{ color: '#1e293b', fontWeight: 900 }}>การจองล่าสุด</Typography>
            <Button size="small" sx={{ color: accentRose, fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: `${accentRose}10` } }}>ดูทั้งหมด</Button>
          </Box>

          <Stack spacing={2}>
            {[
              { name: 'คุณอารยา สมิธ', service: 'ตัดผมชาย + เซ็ตทรง', time: '14:30 น.', color: '#6366f1' },
              { name: 'คุณธนากร ใจดี', service: 'ทำสีผมแฟชั่น', time: '16:00 น.', color: '#ec4899' },
              { name: 'คุณแพรวพราว', service: 'ทรีทเม้นท์หน้า', time: '17:15 น.', color: '#10b981' },
              { name: 'คุณวิชัย รักษ์ดี', service: 'ตัดผมสั้น', time: '18:30 น.', color: '#f59e0b' },
            ].map((item, i) => (
              <Box key={i} sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2,
                borderRadius: '20px',
                border: '1px solid transparent',
                transition: 'all 0.2s ease',
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#e2e8f0' }
              }}>
                <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: `${item.color}10`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}>
                  <Star size={22} variant="Bold" color="currentColor" />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ color: '#1e293b', fontWeight: 800, fontSize: '0.95rem' }}>{item.name}</Typography>
                  <Typography sx={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>{item.service} • {item.time}</Typography>
                </Box>
                <IconButton size="small" sx={{ color: '#cbd5e1' }}>
                  <ArrowRight size={18} color="currentColor" />
                </IconButton>
              </Box>
            ))}
          </Stack>

          <Button
            fullWidth
            variant="outlined"
            sx={{
              mt: 'auto',
              borderRadius: '14px',
              py: 1.5,
              borderColor: '#e2e8f0',
              color: '#64748b',
              fontWeight: 700,
              textTransform: 'none',
              '&:hover': { bgcolor: '#f8fafc', borderColor: '#cbd5e1', color: '#1e293b' }
            }}
          >
            ดาวน์โหลดรายงานประจำวัน (PDF)
          </Button>
        </Paper>
      </Box>
    </Box>
  );
}
