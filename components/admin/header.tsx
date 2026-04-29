'use client';

import React from 'react';
import { Box, Typography, Stack, IconButton, InputBase, Badge, Avatar } from '@mui/material';
import { SearchNormal1, Notification, HambergerMenu, Profile } from 'iconsax-react';
import { useSession } from 'next-auth/react';

const accentRose = '#d993a4';

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();

  return (
    <Box sx={{
      height: 70,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      px: { xs: 2, md: 4 },
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #f1f5f9',
    }}>
      {/* Left: Mobile Menu & Search */}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <IconButton 
          onClick={onMenuClick}
          sx={{ display: { md: 'none' }, color: '#64748b' }}
        >
          <HambergerMenu size={24} color="currentColor" />
        </IconButton>

        <Box sx={{
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          bgcolor: '#f1f5f9',
          borderRadius: '12px',
          px: 2,
          py: 0.8,
          width: 320,
          border: '1px solid #e2e8f0',
        }}>
          <SearchNormal1 size={18} color="currentColor" />
          <InputBase
            placeholder="ค้นหาข้อมูล..."
            sx={{ ml: 1, flex: 1, color: '#1e293b', fontSize: '0.9rem' }}
          />
        </Box>
      </Stack>

      {/* Right: Notifications & Profile */}
      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <IconButton sx={{ 
          bgcolor: '#f1f5f9', 
          color: '#64748b',
          '&:hover': { bgcolor: '#e2e8f0' } 
        }}>
          <Badge badgeContent={3} color="error">
            <Notification size={20} variant="Outline" color="currentColor" />
          </Badge>
        </IconButton>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', ml: 1 }}>
          <Box sx={{ textAlign: 'right', display: { xs: 'none', md: 'block' } }}>
            <Typography sx={{ color: '#1e293b', fontWeight: 800, fontSize: '0.9rem', lineHeight: 1.2 }}>
              {session?.user?.name || 'Administrator'}
            </Typography>
            <Typography sx={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>
              {session?.user?.email || 'admin@salon.com'}
            </Typography>
          </Box>
          <Avatar 
            sx={{ 
              bgcolor: '#1e293b', 
              color: 'white',
              fontWeight: 800,
              width: 40,
              height: 40,
              border: '2px solid white',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}
          >
            {session?.user?.name?.[0] || <Profile variant="Bold" size={24} />}
          </Avatar>
        </Stack>
      </Stack>
    </Box>
  );
}
