"use client";

import { useEffect, useState } from "react";
import { Box, Typography, Fade } from "@mui/material";
import { Wallet, Warning2, Information } from "iconsax-react";

export function FalCreditBalance() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAdmin, setNeedsAdmin] = useState(false);

  useEffect(() => {
    async function fetchBalance() {
      try {
        const res = await fetch("/api/fal/balance");
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          if (res.status === 429) {
            console.warn("Fal API rate limit exceeded");
            return;
          }
          if (data?.needsAdmin) {
            setNeedsAdmin(true);
          } else {
            throw new Error(data?.error || "Failed to fetch");
          }
          return;
        }
        
        // data.credits.current_balance contains the available balance
        if (data?.credits && data.credits.current_balance !== undefined) {
          setBalance(data.credits.current_balance);
        }
      } catch (error) {
        console.error("Error fetching balance:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchBalance();
  }, []);

  // สไตล์ที่ใช้งานได้บนพื้นหลังขาว (หน้า Cover ฝั่ง Card)
  const cardStyle = {
    background: '#f8f4f5',
    border: '1px solid rgba(217,147,164,0.2)',
    borderRadius: 99,
  };

  if (loading) {
    return (
      <Box sx={{ ...cardStyle, px: 2, py: 1.25, display: 'inline-flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ 
          width: 16, height: 16, borderRadius: '50%', 
          border: '2px solid rgba(217,147,164,0.25)', borderTopColor: '#d993a4', 
          animation: 'spin 1s linear infinite', 
          '@keyframes spin': { '0%': { transform: 'rotate(0deg)' }, '100%': { transform: 'rotate(360deg)' } } 
        }} />
        <Typography sx={{ color: '#94758a', fontSize: '0.72rem', fontWeight: 600 }}>
          กำลังตรวจสอบ Credit...
        </Typography>
      </Box>
    );
  }

  if (needsAdmin) {
    return (
      <Box sx={{ 
        ...cardStyle, px: 2, py: 1.25, 
        background: '#fffbeb', 
        border: '1px solid rgba(245, 158, 11, 0.3)',
        display: 'inline-flex', alignItems: 'center', gap: 1 
      }}>
        <Warning2 size={15} color="#d97706" variant="Bold" />
        <Typography sx={{ color: '#92400e', fontSize: '0.72rem', fontWeight: 600 }}>
          ตั้งค่า Admin API Key เพื่อดูยอด
        </Typography>
      </Box>
    );
  }

  if (balance === null) {
    return (
      <Box sx={{ 
        ...cardStyle, px: 2, py: 1.25, 
        background: '#fff1f2', 
        border: '1px solid rgba(244, 63, 94, 0.25)',
        display: 'inline-flex', alignItems: 'center', gap: 1 
      }}>
        <Information size={15} color="#e11d48" variant="Bold" />
        <Typography sx={{ color: '#9f1239', fontSize: '0.72rem', fontWeight: 600 }}>
          โหลดข้อมูล Credit ไม่สำเร็จ
        </Typography>
      </Box>
    );
  }

  return (
    <Fade in={true} timeout={600}>
      <Box 
        sx={{ 
          ...cardStyle, 
          px: 2, py: 1,
          display: 'inline-flex', alignItems: 'center', gap: 1.5,
          boxShadow: '0 2px 12px rgba(217,147,164,0.12)',
          transition: 'all 0.25s ease',
          cursor: 'default',
          '&:hover': {
            background: '#f3edf0',
            boxShadow: '0 4px 20px rgba(217,147,164,0.22)',
            transform: 'translateY(-1px)',
          }
        }}
      >
        <Box sx={{ 
          display: 'flex', alignItems: 'center', justifyContent: 'center', 
          bgcolor: 'rgba(217,147,164,0.18)', color: '#b36b80', 
          borderRadius: '50%', width: 28, height: 28,
          flexShrink: 0,
        }}>
          <Wallet size={14} variant="Bold" color="currentColor" />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Typography sx={{ color: '#b08090', fontSize: '0.52rem', fontWeight: 800, letterSpacing: 1, lineHeight: 1, mb: 0.3, textTransform: 'uppercase' }}>
            AI Credits
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.25 }}>
            <Typography sx={{ color: '#c2727f', fontSize: '0.72rem', fontWeight: 800, lineHeight: 1 }}>$</Typography>
            <Typography sx={{ color: '#1a1114', fontSize: '1rem', fontWeight: 900, lineHeight: 1 }}>
              {balance.toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Fade>
  );
}
