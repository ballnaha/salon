'use client';

import React, { useEffect, useState } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Stack, useMediaQuery, useTheme, Skeleton } from '@mui/material';
import { 
  Element3, 
  CalendarTick, 
  Shop, 
  People, 
  Magicpen, 
  Profile2User, 
  Chart, 
  Setting2, 
  LogoutCurve,
  CalendarSearch,
  Gallery,
  Activity,
  CardTick,
  WalletMoney,
  Archive,
  Category,
  UserOctagon,
  Global
} from 'iconsax-react';
import { useRouter, usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';

// Define menu structure with role access
const menuGroups = [
  {
    label: 'ภาพรวม',
    roles: ['SUPER_ADMIN', 'OWNER', 'MANAGER'],
    items: [
      { text: 'Dashboard', icon: Element3, path: '/admin/dashboard' },
      { text: 'Analytics', icon: Chart, path: '/admin/analytics' },
    ]
  },
  {
    label: 'จัดการระบบกลาง',
    roles: ['SUPER_ADMIN'],
    items: [
      { text: 'ร้านค้าทั้งหมด', icon: Global, path: '/admin/all-stores' },
      { text: 'จัดการผู้ใช้งาน', icon: UserOctagon, path: '/admin/users' },
      { text: 'แพ็กเกจระบบ', icon: CardTick, path: '/admin/packages' },
    ]
  },
  {
    label: 'จัดการร้าน',
    roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    items: [
      { text: 'ตารางนัดหมาย', icon: CalendarSearch, path: '/admin/calendar' },
      { text: 'การจอง', icon: CalendarTick, path: '/admin/bookings' },
      { text: 'บริการ', icon: Magicpen, path: '/admin/services' },
      { text: 'สาขา', icon: Shop, path: '/admin/branches' },
    ]
  },
  {
    label: 'ระบบ AI',
    roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    items: [
      { text: 'คลังทรงผม', icon: Gallery, path: '/admin/hairstyles' },
      { text: 'AI Logs', icon: Activity, path: '/admin/ai-logs' },
    ]
  },
  {
    label: 'ลูกค้าและทีมงาน',
    roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    items: [
      { text: 'ลูกค้า', icon: Profile2User, path: '/admin/customers' },
      { text: 'ทีมงาน', icon: People, path: '/admin/team' },
      { text: 'ระบบสมาชิก', icon: CardTick, path: '/admin/membership' },
    ]
  },
  {
    label: 'การเงินและคลัง',
    roles: ['OWNER', 'SUPER_ADMIN'],
    items: [
      { text: 'รายได้', icon: WalletMoney, path: '/admin/earnings' },
      { text: 'คลังสินค้า', icon: Archive, path: '/admin/inventory' },
    ]
  },
  {
    label: 'ระบบ',
    roles: ['OWNER', 'MANAGER', 'SUPER_ADMIN'],
    items: [
      { text: 'ตั้งค่า', icon: Setting2, path: '/admin/settings' },
    ]
  }
];

const accentRose = '#d993a4';

export default function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean, setMobileOpen: (open: boolean) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { data: session, status } = useSession();
  const [isActuallyLoading, setIsActuallyLoading] = useState(true);

  // Safety timeout: If status is still loading after 1.5 seconds, force show the menu
  useEffect(() => {
    if (status !== 'loading') {
      setIsActuallyLoading(false);
    } else {
      const timer = setTimeout(() => {
        setIsActuallyLoading(false);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const userRole = (session?.user as any)?.role || 'OWNER';

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // Filter menu groups based on user role
  const filteredMenuGroups = menuGroups.filter(group => 
    group.roles.includes(userRole)
  );

  const sidebarContent = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'white',
      color: '#1e293b',
      borderRight: '1px solid #e2e8f0',
      overflowY: 'auto',
      '&::-webkit-scrollbar': { width: '4px' },
      '&::-webkit-scrollbar-thumb': { bgcolor: '#e2e8f0', borderRadius: '10px' },
    }}>
      {/* Logo Section */}
      <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 2, position: 'sticky', top: 0, bgcolor: 'white', zIndex: 10 }}>
        <Box sx={{ 
          width: 42, 
          height: 42, 
          borderRadius: '14px', 
          bgcolor: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
          <Magicpen size={24} variant="Bold" color="currentColor" />
        </Box>
        <Stack spacing={-0.5}>
          <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: -1, color: '#1e293b' }}>
            WEGO<span style={{ color: accentRose }}>WELUP</span>
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 700, letterSpacing: 1.5 }}>
            เวโกเวลอป
          </Typography>
        </Stack>
      </Box>

      {/* Menu Sections */}
      <Box sx={{ flex: 1, px: 2, mt: 1 }}>
        {isActuallyLoading && !session ? (
          // Skeleton Loading
          <Box sx={{ px: 2 }}>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ mb: 4 }}>
                <Skeleton width="40%" height={20} sx={{ mb: 1, bgcolor: '#f1f5f9' }} />
                <Skeleton variant="rounded" height={40} sx={{ mb: 1, borderRadius: '12px', bgcolor: '#f8fafc' }} />
                <Skeleton variant="rounded" height={40} sx={{ mb: 1, borderRadius: '12px', bgcolor: '#f8fafc' }} />
              </Box>
            ))}
          </Box>
        ) : (
          filteredMenuGroups.map((group) => (
            <Box key={group.label} sx={{ mb: 3 }}>
              <Typography variant="overline" sx={{ px: 2, color: '#94a3b8', fontWeight: 800, letterSpacing: 1.5, fontSize: '0.65rem' }}>
                {group.label}
              </Typography>
              <List sx={{ mt: 0.5 }}>
                {group.items.map((item) => {
                  const isActive = pathname === item.path;
                  const Icon = item.icon;
                  
                  return (
                    <ListItem key={item.text} disablePadding sx={{ mb: 0.2 }}>
                      <ListItemButton 
                        component={Link}
                        href={item.path}
                        onClick={() => {
                          if (isMobile) setMobileOpen(false);
                        }}
                        sx={{
                          borderRadius: '12px',
                          py: 1,
                          bgcolor: isActive ? `${accentRose}15` : 'transparent',
                          color: isActive ? accentRose : '#64748b',
                          '&:hover': {
                            bgcolor: `${accentRose}10`,
                            color: accentRose,
                            '& .menu-icon': { color: accentRose }
                          },
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <ListItemIcon className="menu-icon" sx={{ 
                          minWidth: 36, 
                          color: isActive ? accentRose : '#94a3b8',
                          transition: 'color 0.2s ease'
                        }}>
                          <Icon size={20} variant={isActive ? "Bold" : "Outline"} color="currentColor" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={item.text} 
                          slotProps={{
                            primary: {
                              sx: {
                                fontSize: '0.88rem', 
                                fontWeight: isActive ? 800 : 600 
                              }
                            }
                          }} 
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          ))
        )}
      </Box>

      {/* Footer Section */}
      <Box sx={{ p: 2, borderTop: '1px solid #f1f5f9', position: 'sticky', bottom: 0, bgcolor: 'white' }}>
        <ListItemButton 
          onClick={handleLogout}
          sx={{
            borderRadius: '12px',
            color: '#94a3b8',
            '&:hover': {
              bgcolor: '#fef2f2',
              color: '#ef4444',
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
            <LogoutCurve size={20} variant="Outline" color="currentColor" />
          </ListItemIcon>
          <ListItemText primary="ออกจากระบบ" slotProps={{ primary: { sx: { fontSize: '0.88rem', fontWeight: 600 } } }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: 280 }, flexShrink: { md: 0 } }}
    >
      {/* Mobile Drawer */}
      {isMobile ? (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 1200,
            visibility: mobileOpen ? 'visible' : 'hidden',
            pointerEvents: mobileOpen ? 'auto' : 'none',
          }}
        >
          {/* Overlay */}
          <Box 
            onClick={() => setMobileOpen(false)}
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)',
              opacity: mobileOpen ? 1 : 0,
              transition: 'opacity 0.3s ease',
            }}
          />
          {/* Drawer Content */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              bottom: 0,
              width: 280,
              transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: '20px 0 25px -5px rgba(0,0,0,0.05)',
            }}
          >
            {sidebarContent}
          </Box>
        </Box>
      ) : (
        /* Desktop Persistent Sidebar */
        <Box sx={{ height: '100vh', width: 280, position: 'fixed' }}>
          {sidebarContent}
        </Box>
      )}
    </Box>
  );
}
