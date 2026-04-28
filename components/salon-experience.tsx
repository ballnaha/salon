'use client';

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

import { ChangeEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Box, Button, Chip, IconButton, Stack, Typography, keyframes } from '@mui/material';
import { ArrowRight, Brush, Camera, CloseCircle, Colorfilter, FolderOpen, Magicpen, Refresh, Refresh2, TickCircle, DocumentDownload, SearchNormal1 } from 'iconsax-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { FreeMode } from 'swiper/modules';
import 'swiper/swiper-bundle.css';
import { QRCodeSVG } from 'qrcode.react';
import { Dialog, DialogContent, Fade } from '@mui/material';
import { subscribeAnalysisEdit, subscribeTryOnEdit } from '@/components/salon-experience-fal';
import { analysisPrompt, buildHairColorPrompt, buildTryOnPrompt } from '@/components/salon-experience-prompts';
import { hairColorOptions, hairstyleOptions } from '@/components/salon-experience-styles';
import type { FlowMode, FlowStep, GenerationTimingBreakdown, HairColorOption, HairstyleOption, TryOnResult } from '@/components/salon-experience-types';
import { FalCreditBalance } from '@/components/fal-credit-balance';
import { logAiGeneration } from '@/lib/log-ai-generation';

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.08); opacity: 0.3; }
  100% { transform: scale(1); opacity: 0.6; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const shellBackground = 'radial-gradient(circle at 0% 0%, #2d1b22 0%, #1a1114 50%, #0d0810 100%)';
const accentRose = '#d993a4';
const accentGold = '#e2b18a';
const glassBg = 'rgba(255, 255, 255, 0.03)';
const glassBorder = 'rgba(255, 255, 255, 0.08)';

const defaultHairColorId = hairColorOptions[0]?.id ?? '';
/**
 * ขนาดด้านที่ยาวที่สุดของรูปที่จะส่งไป AI (px)
 * - 1280 → รูป 9:16 จะเหลือ 720×1280px (เล็กเกินไปสำหรับวิเคราะห์ทรงผม)
 * - 1536 → รูป 9:16 จะเหลือ 864×1536px (แนะนำ — รายละเอียดดีพอและไม่หน่วงเกิน)
 * - 2048 → รูป 9:16 จะเหลือ 1152×2048px (คมสุด แต่ upload ช้าขึ้น ~2x)
 */
const MAX_INPUT_IMAGE_DIMENSION = 1536;
const INPUT_IMAGE_QUALITY = 0.88;
const TRY_ON_CONCURRENCY = 2;

/** ตั้งค่าจำนวนทรงผมสูงสุดที่เลือกได้ — เปลี่ยนตัวเลขนี้เพื่อปรับค่า */
const MAX_STYLES = 2;

const formatElapsedMs = (elapsedMs: number) => {
  const totalSeconds = Math.max(0, Math.round(elapsedMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) {
    return `${seconds} วินาที`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')} นาที`;
};

const formatTimingValue = (elapsedMs: number | null) => (elapsedMs == null ? null : formatElapsedMs(elapsedMs));

async function optimizeImageDataUrl(dataUrl: string) {
  if (typeof window === 'undefined') {
    return dataUrl;
  }

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const nextImage = new Image();
    nextImage.onload = () => resolve(nextImage);
    nextImage.onerror = () => reject(new Error('Unable to load image for optimization'));
    nextImage.src = dataUrl;
  });

  const longestSide = Math.max(image.width, image.height);
  const needsResize = longestSide > MAX_INPUT_IMAGE_DIMENSION;
  const needsFormatChange = !dataUrl.startsWith('data:image/jpeg');

  if (!needsResize && !needsFormatChange) {
    return dataUrl;
  }

  const scale = needsResize ? MAX_INPUT_IMAGE_DIMENSION / longestSide : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    return dataUrl;
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', INPUT_IMAGE_QUALITY);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  const worker = async () => {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await mapper(items[currentIndex], currentIndex);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

function AppWrapper({ children, bgcolor = '#1a1114' }: { children: ReactNode; bgcolor?: string }) {
  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        bgcolor: '#0d0810',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontFamily: '"Inter", sans-serif',
      }}
    >
      <Box
        sx={{
          height: '100vh',
          width: '100%',
          position: 'relative',
          background: shellBackground,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          '&::before': {
            content: '""',
            position: 'absolute',
            top: '-10%',
            right: '-10%',
            width: '40%',
            height: '40%',
            background: 'radial-gradient(circle, rgba(217,147,164,0.05) 0%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function ModeSelectionStep({ onSelect, salonName }: { onSelect: (mode: FlowMode) => void, salonName?: string }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <AppWrapper>
      {/* ── MOBILE LAYOUT ── */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, height: '100vh', width: '100%', flexDirection: 'column', position: 'relative' }}>
        
        {/* Top bar for Mobile */}
        <Box sx={{ position: 'absolute', top: 16, right: 16, left: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <Chip label={salonName || "Salon AI"} sx={{ bgcolor: 'rgba(255,255,255,0.9)', fontWeight: 'bold', color: '#0f172a' }} />
          <Button 
            variant="contained" 
            size="small" 
            disabled={isLoggingOut}
            sx={{ borderRadius: 8, bgcolor: 'rgba(0,0,0,0.5)', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
            onClick={handleLogout}
          >
            {isLoggingOut ? "รอสักครู่..." : "ออกจากระบบ"}
          </Button>
        </Box>
        {/* Hero — image only, no text */}
        <Box
          sx={{
            flex: '0 0 62%',
            backgroundImage: 'url("images/cover.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'top center',
            position: 'relative',
          }}
        >
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 65%, white 100%)' }} />
        </Box>

        {/* Icon picker */}
        <Box
          sx={{
            flex: 1,
            bgcolor: 'white',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            px: 3,
            pb: 3,
            gap: 2,
          }}
        >
          <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
            <Typography variant="overline" sx={{ color: '#d993a4', letterSpacing: 4, fontWeight: 800, fontSize: '0.62rem' }}>
              SELECT YOUR EXPERIENCE
            </Typography>
            <Typography variant="h5" sx={{ color: '#0f172a', fontWeight: 900, lineHeight: 1.1, textAlign: 'center' }}>
              เริ่มต้นกันเลย
            </Typography>
          </Stack>

          <Box sx={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            width: '100%'
          }}>
            {/* AI Analysis tile */}
            <Box
              component="button"
              onClick={() => onSelect('analysis')}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                py: 2,
                px: 0.5,
                background: 'linear-gradient(145deg, #4a1525 0%, #2d0d17 100%)',
                borderRadius: 3,
                border: '1px solid rgba(217,147,164,0.15)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:active': { transform: 'scale(0.94)', opacity: 0.85 },
              }}
            >
              <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(217,147,164,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e8b0c0' }}>
                <Magicpen size={18} variant="Bold" color="currentColor" />
              </Box>
              <Stack spacing={0} sx={{ alignItems: 'center' }}>
                <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.72rem' }}>Analysis</Typography>
                <Typography sx={{ color: 'rgba(232,176,192,0.65)', fontSize: '0.65rem' }}>วิเคราะห์</Typography>
              </Stack>
            </Box>

            {/* Try-On tile */}
            <Box
              component="button"
              onClick={() => onSelect('try-on')}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                py: 2,
                px: 0.5,
                bgcolor: '#d993a4',
                borderRadius: 3,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:active': { transform: 'scale(0.94)', opacity: 0.85 },
              }}
            >
              <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1114' }}>
                <Camera size={18} variant="Bold" color="currentColor" />
              </Box>
              <Stack spacing={0} sx={{ alignItems: 'center' }}>
                <Typography sx={{ color: '#1a1114', fontWeight: 800, fontSize: '0.72rem' }}>Try-On</Typography>
                <Typography sx={{ color: 'rgba(26,17,20,0.5)', fontSize: '0.65rem' }}>ลองทรงผม</Typography>
              </Stack>
            </Box>

            {/* Hair Color tile */}
            <Box
              component="button"
              onClick={() => onSelect('recolor')}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                py: 2,
                px: 0.5,
                background: 'linear-gradient(145deg, #7c3d28 0%, #4d2418 100%)',
                borderRadius: 3,
                border: '1px solid rgba(226,177,138,0.15)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:active': { transform: 'scale(0.94)', opacity: 0.85 },
              }}
            >
              <Box sx={{ width: 36, height: 36, borderRadius: '50%', bgcolor: 'rgba(226,177,138,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e2b18a' }}>
                <Brush size={18} variant="Bold" color="currentColor" />
              </Box>
              <Stack spacing={0} sx={{ alignItems: 'center' }}>
                <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.72rem' }}>Color</Typography>
                <Typography sx={{ color: 'rgba(226,177,138,0.65)', fontSize: '0.65rem' }}>เปลี่ยนสี</Typography>
              </Stack>
            </Box>
          </Box>

          {/* Footer Fal Credit for Mobile */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', width: '100%' }}>
            <FalCreditBalance />
          </Box>
        </Box>
      </Box>

      {/* ── DESKTOP LAYOUT ── */}
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, width: '100%', height: '100%', position: 'relative' }}>
        
        {/* Top bar for Desktop */}
        <Box sx={{ position: 'absolute', top: 24, right: 32, left: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <Chip label={salonName || "Salon AI"} sx={{ bgcolor: 'rgba(255,255,255,0.9)', fontWeight: 'bold', color: '#0f172a', fontSize: '1rem', py: 2 }} />
          <Button 
            variant="contained" 
            disabled={isLoggingOut}
            sx={{ borderRadius: 8, bgcolor: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, color: '#0f172a' }}
            onClick={handleLogout}
          >
            {isLoggingOut ? "รอสักครู่..." : "ออกจากระบบ"}
          </Button>
        </Box>

        {/* Hero with text overlay */}
        <Box
          sx={{
            flex: 1,
            width: '48%',
            backgroundImage: 'url("images/cover.png")',
            backgroundSize: 'cover',
            backgroundPosition: 'top',
            position: 'relative',
          }}
        >
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,23,42,0.08) 0%, rgba(15,23,42,0.18) 100%)' }} />
        </Box>

        {/* Desktop card picker */}
        <Box sx={{ flex: 1, bgcolor: 'white', px: 6, py: 6, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <Stack spacing={3} sx={{ maxWidth: 460, mx: 'auto', width: '100%' }}>
            <Stack spacing={2}>
              <Typography variant="overline" sx={{ color: '#d993a4', letterSpacing: 4, fontWeight: 900, fontSize: '0.85rem' }}>
                AI BEAUTY CONSULTANT
              </Typography>
              <Typography variant="h3" sx={{ color: '#0f172a', fontWeight: 900, lineHeight: 1.1, fontSize: { sm: '2rem', md: '2.5rem' } }}>
                ค้นหาสไตล์ที่ใช่สำหรับคุณ
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b', lineHeight: 1.7, fontSize: '1.15rem' }}>
                สัมผัสประสบการณ์ออกแบบทรงผมอัจฉริยะด้วยระบบ AI
              </Typography>
            </Stack>

            <Button
              onClick={() => onSelect('analysis')}
              sx={{ justifyContent: 'space-between', alignItems: 'stretch', p: 0, borderRadius: 4, overflow: 'hidden', textTransform: 'none', border: '1px solid rgba(74,21,37,0.12)' }}
            >
              <Stack direction="row" sx={{ width: '100%' }}>
                <Stack spacing={1} sx={{ p: 3, flex: 1, alignItems: 'flex-start' }}>
                  <Typography variant="h5" sx={{ color: '#0f172a', fontWeight: 900, fontSize: '1.35rem' }}>AI Analysis</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'left', lineHeight: 1.6, fontSize: '0.95rem' }}>
                    วิเคราะห์โครงหน้าและทรงผมที่เหมาะกับคุณที่สุด
                  </Typography>
                  <Chip label="Smart Analysis" sx={{ height: 28, fontSize: '0.72rem', bgcolor: 'rgba(74,21,37,0.08)', color: '#9f445e', fontWeight: 900, borderRadius: 1.5 }} />
                </Stack>
                <Box sx={{ width: 88, background: 'linear-gradient(160deg, #4a1525 0%, #2d0d17 100%)', color: '#e8b0c0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Magicpen size={28} variant="Bold" color="currentColor" />
                </Box>
              </Stack>
            </Button>

            <Button
              onClick={() => onSelect('try-on')}
              sx={{ justifyContent: 'space-between', alignItems: 'stretch', p: 0, borderRadius: 4, overflow: 'hidden', textTransform: 'none', border: '1px solid rgba(15,23,42,0.08)' }}
            >
              <Stack direction="row" sx={{ width: '100%' }}>
                <Stack spacing={1} sx={{ p: 3, flex: 1, alignItems: 'flex-start' }}>
                  <Typography variant="h5" sx={{ color: '#0f172a', fontWeight: 900, fontSize: '1.35rem' }}>AI Try-On</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'left', lineHeight: 1.6, fontSize: '0.95rem' }}>
                    จำลองทรงผมใหม่ยอดนิยมของร้านก่อนเริ่มตัดจริง
                  </Typography>
                  <Chip label="Virtual Try-On" sx={{ height: 28, fontSize: '0.72rem', bgcolor: 'rgba(15,23,42,0.08)', color: '#0f172a', fontWeight: 900, borderRadius: 1.5 }} />
                </Stack>
                <Box sx={{ width: 88, bgcolor: '#d993a4', color: '#1a1114', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Camera size={28} variant="Bold" color="currentColor" />
                </Box>
              </Stack>
            </Button>

            <Button
              onClick={() => onSelect('recolor')}
              sx={{ justifyContent: 'space-between', alignItems: 'stretch', p: 0, borderRadius: 4, overflow: 'hidden', textTransform: 'none', border: '1px solid rgba(124,61,40,0.12)' }}
            >
              <Stack direction="row" sx={{ width: '100%' }}>
                <Stack spacing={1} sx={{ p: 3, flex: 1, alignItems: 'flex-start' }}>
                  <Typography variant="h5" sx={{ color: '#0f172a', fontWeight: 900, fontSize: '1.35rem' }}>Color Preview</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'left', lineHeight: 1.6, fontSize: '0.95rem' }}>
                    ทดลองเฉดสีผมใหม่ๆ บนทรงผมเดิมของคุณ
                  </Typography>
                  <Chip label="AI Color" sx={{ height: 28, fontSize: '0.72rem', bgcolor: 'rgba(124,61,40,0.1)', color: '#7c3d28', fontWeight: 900, borderRadius: 1.5 }} />
                </Stack>
                <Box sx={{ width: 88, background: 'linear-gradient(160deg, #7c3d28 0%, #4d2418 100%)', color: '#e2b18a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Brush size={28} variant="Bold" color="currentColor" />
                </Box>
              </Stack>
            </Button>
          </Stack>

          {/* Footer Fal Credit for Desktop */}
          <Box sx={{ mt: 'auto', pt: 4, display: 'flex', justifyContent: 'center', width: '100%' }}>
            <FalCreditBalance />
          </Box>
        </Box>
      </Box>
    </AppWrapper>
  );
}

function UploadStep({
  mode,
  errorMessage,
  onGalleryClick,
  onStartCamera,
  onBack,
  inputRef,
  onFileChange,
}: {
  mode: FlowMode;
  errorMessage: string | null;
  onGalleryClick: () => void;
  onStartCamera: () => void;
  onBack: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  const modeCopy = mode === 'analysis'
    ? {
      title: 'เพิ่มรูปเพื่อวิเคราะห์ด้วย AI',
      subtitle: 'ภาพหน้าตรง แสงดี และเห็นกรอบหน้า จะช่วยให้คำแนะนำแม่นยำขึ้น',
    }
    : mode === 'recolor'
      ? {
        title: 'เพิ่มรูปเพื่อเปลี่ยนสีผม',
        subtitle: 'ใช้รูปทรงผมเดิม แล้วให้ AI ช่วยจำลองสีผมใหม่ๆ ให้ลูกค้าตัดสินใจได้ง่ายขึ้น',
      }
      : {
        title: 'เพิ่มรูปเพื่อเริ่ม Try-On',
        subtitle: 'ภาพที่คมชัดจะช่วยให้ AI จับทรงผมกับใบหน้าจริงได้เนียนกว่า',
      };

  return (
    <AppWrapper bgcolor="#1a1114">
      <Box sx={{ height: '100%', width: '100%', background: shellBackground, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', py: 8, px: 4 }}>
        <input type="file" accept="image/*" ref={inputRef} style={{ display: 'none' }} onChange={onFileChange} />
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: 380 }}>
          <Box sx={{ width: 160, height: 160, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4, background: 'rgba(255,255,255,0.03)' }}>
            <Camera size={60} variant="Bulk" color="#d993a4" />
          </Box>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 700, mb: 1, textAlign: 'center' }}>
            {modeCopy.title}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.56)', textAlign: 'center', lineHeight: 1.8 }}>
            {modeCopy.subtitle}
          </Typography>
          {errorMessage && (
            <Typography variant="body2" sx={{ color: '#fda4af', textAlign: 'center', mt: 2.5 }}>
              {errorMessage}
            </Typography>
          )}
        </Box>
        <Stack spacing={2} sx={{ width: '100%', maxWidth: 420 }}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<Camera variant="Bold" />}
            onClick={onStartCamera}
            sx={{ bgcolor: '#d993a4', color: '#1a1114', py: 2, borderRadius: 3, fontSize: '1rem', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#c88293' } }}
          >
            เปิดกล้องถ่ายรูป
          </Button>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<FolderOpen variant="Bold" />}
            onClick={onGalleryClick}
            sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.2)', py: 2, borderRadius: 3, fontSize: '1rem', fontWeight: 700, textTransform: 'none', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.05)' } }}
          >
            เลือกจากคลังรูปภาพ
          </Button>
          <Button onClick={onBack} sx={{ color: 'rgba(255,255,255,0.36)', mt: 1 }}>
            ย้อนกลับ
          </Button>
        </Stack>
      </Box>
    </AppWrapper>
  );
}

function PreviewStep({
  mode,
  selectedImage,
  errorMessage,
  onPrimary,
  onRetake,
  onBack,
}: {
  mode: FlowMode;
  selectedImage: string;
  errorMessage: string | null;
  onPrimary: () => void;
  onRetake: () => void;
  onBack: () => void;
}) {
  const modeCopy = mode === 'analysis'
    ? {
      title: 'ตรวจสอบรูปภาพก่อนวิเคราะห์',
      action: 'วิเคราะห์ด้วย AI',
      description: 'AI จะสรุปทรงผมที่เหมาะ ทรงที่ควรเลี่ยง และสีผมที่แนะนำจากภาพนี้',
    }
    : mode === 'recolor'
      ? {
        title: 'ตรวจสอบรูปภาพก่อนเปลี่ยนสี',
        action: 'ไปเลือกสีผม',
        description: 'ยืนยันรูปภาพนี้เพื่อเริ่มลองเปลี่ยนเฉดสีผมใหม่ๆ โดยยังคงทรงผมเดิมของลูกค้าไว้',
      }
      : {
        title: 'ตรวจสอบรูปภาพก่อนเลือกทรงผม',
        action: 'ไปเลือกทรงผม',
        description: 'หลังจากยืนยันรูปแล้ว ลูกค้าจะเลือกทรงผมยอดนิยมของร้านเพื่อสร้างผลลัพธ์แบบ try-on',
      };

  const glass = {
    background: 'rgba(255,255,255,0.12)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.2)',
  } as const;

  return (
    <Box sx={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden', bgcolor: '#1a1114' }}>

      {/* ── MOBILE: full-screen bg + bottom sheet ── */}
      <Box sx={{ display: { xs: 'block', sm: 'none' }, height: '100%', width: '100%', position: 'relative' }}>
        {/* Full-screen photo */}
        <Box
          component="img"
          src={selectedImage}
          alt="Preview"
          sx={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
        />
        {/* Gradient: bottom fade for readability */}
        <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.12) 0%, rgba(0,0,0,0.08) 50%, rgba(26,17,20,0.82) 100%)' }} />

        {/* Top bar */}
        <Stack direction="row" sx={{ position: 'absolute', top: 0, left: 0, right: 0, px: 2, pt: 2.5, justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
          <Box
            component="button"
            onClick={onBack}
            sx={{ ...glass, borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
          >
            <ArrowRight size={18} color="white" style={{ transform: 'rotate(180deg)' }} />
          </Box>
          <Box sx={{ ...glass, borderRadius: 99, px: 1.5, py: 0.5 }}>
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.75rem' }}>ตรวจสอบรูปภาพ</Typography>
          </Box>
          <Box sx={{ width: 40 }} />
        </Stack>

        {/* Bottom glass sheet — anchored to bottom */}
        <Box
          sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            px: 2,
            pb: 3,
            zIndex: 10,
          }}
        >
          <Box sx={{ ...glass, borderRadius: '20px 20px 14px 14px', p: 2.25 }}>
            {/* Mode badge */}
            <Box
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                background: mode === 'analysis' ? 'rgba(217,147,164,0.2)' : 'rgba(125,211,252,0.15)',
                borderRadius: 99, px: 1.25, py: 0.35, mb: 1.25,
                border: `1px solid ${mode === 'analysis' ? 'rgba(217,147,164,0.35)' : 'rgba(125,211,252,0.28)'}`,
              }}
            >
              {mode === 'analysis' ? <Magicpen size={12} color="#f9a8d4" variant="Bold" /> : <Camera size={12} color="#7dd3fc" variant="Bold" />}
              <Typography sx={{ color: mode === 'analysis' ? '#f9a8d4' : '#7dd3fc', fontWeight: 700, fontSize: '0.65rem' }}>
                {mode === 'analysis' ? 'AI ANALYSIS' : 'TRY-ON'}
              </Typography>
            </Box>

            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1rem', lineHeight: 1.2, mb: 0.5 }}>
              {modeCopy.title}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', lineHeight: 1.6, mb: 1.75 }}>
              {modeCopy.description}
            </Typography>

            {errorMessage && (
              <Box sx={{ background: 'rgba(253,164,175,0.15)', border: '1px solid rgba(253,164,175,0.3)', borderRadius: 2, px: 1.5, py: 0.75, mb: 1.5 }}>
                <Typography sx={{ color: '#fda4af', fontSize: '0.75rem' }}>{errorMessage}</Typography>
              </Box>
            )}

            <Stack direction="row" spacing={1.25}>
              <Box
                component="button"
                onClick={onRetake}
                sx={{ ...glass, flex: '0 0 auto', borderRadius: 3, px: 2, py: 1.5, border: '1px solid rgba(255,255,255,0.22)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.75 }}
              >
                <Refresh size={15} color="white" variant="Bold" />
                <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.82rem' }}>ถ่ายใหม่</Typography>
              </Box>
              <Box
                component="button"
                onClick={onPrimary}
                sx={{ flex: 1, bgcolor: '#d993a4', borderRadius: 3, py: 1.5, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75 }}
              >
                <Magicpen size={15} color="#1a1114" variant="Bold" />
                <Typography sx={{ color: '#1a1114', fontWeight: 800, fontSize: '0.88rem' }}>{modeCopy.action}</Typography>
              </Box>
            </Stack>
          </Box>
        </Box>
      </Box>

      {/* ── DESKTOP: side-by-side ── */}
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, height: '100%', width: '100%' }}>
        {/* Photo left */}
        <Box sx={{ flex: 1, position: 'relative', width: '50%' }}>
          <Box
            component="img"
            src={selectedImage}
            alt="Preview"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
          />
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, transparent 60%, rgba(26,17,20,0.45) 100%)' }} />
          {/* Back button */}
          <Box
            component="button"
            onClick={onBack}
            sx={{ ...glass, position: 'absolute', top: 24, left: 20, borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
          >
            <ArrowRight size={18} color="white" style={{ transform: 'rotate(180deg)' }} />
          </Box>
        </Box>

        {/* Action panel right */}
        <Box sx={{ flex: 1, width: '50%', display: 'flex', flexDirection: 'column', justifyContent: 'center', px: 5 }}>
          {/* Glass card */}
          <Box
            sx={{
              ...glass,
              borderRadius: 4,
              p: 4,
              maxWidth: 400,
              mx: 'auto',
              width: '100%',
            }}
          >
            {/* Mode badge */}
            <Box
              sx={{
                display: 'inline-flex', alignItems: 'center', gap: 0.75,
                background: mode === 'analysis' ? 'rgba(217,147,164,0.2)' : 'rgba(125,211,252,0.15)',
                borderRadius: 99, px: 1.5, py: 0.4, mb: 1.75,
                border: `1px solid ${mode === 'analysis' ? 'rgba(217,147,164,0.35)' : 'rgba(125,211,252,0.28)'}`,
              }}
            >
              {mode === 'analysis' ? <Magicpen size={13} color="#f9a8d4" variant="Bold" /> : <Camera size={13} color="#7dd3fc" variant="Bold" />}
              <Typography sx={{ color: mode === 'analysis' ? '#f9a8d4' : '#7dd3fc', fontWeight: 700, fontSize: '0.7rem' }}>
                {mode === 'analysis' ? 'AI ANALYSIS' : 'TRY-ON'}
              </Typography>
            </Box>

            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1.35rem', lineHeight: 1.25, mb: 1 }}>
              {modeCopy.title}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.88rem', lineHeight: 1.7, mb: 2.5 }}>
              {modeCopy.description}
            </Typography>

            {errorMessage && (
              <Box sx={{ background: 'rgba(253,164,175,0.15)', border: '1px solid rgba(253,164,175,0.3)', borderRadius: 2, px: 1.75, py: 1, mb: 2 }}>
                <Typography sx={{ color: '#fda4af', fontSize: '0.8rem', lineHeight: 1.6 }}>{errorMessage}</Typography>
              </Box>
            )}

            <Box
              component="button"
              onClick={onPrimary}
              sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, bgcolor: '#d993a4', borderRadius: 3, py: 1.75, border: 'none', cursor: 'pointer', mb: 1.25, '&:active': { opacity: 0.85 } }}
            >
              <Magicpen size={17} color="#1a1114" variant="Bold" />
              <Typography sx={{ color: '#1a1114', fontWeight: 800, fontSize: '0.95rem' }}>{modeCopy.action}</Typography>
            </Box>

            <Box
              component="button"
              onClick={onRetake}
              sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, ...glass, borderRadius: 3, py: 1.5, cursor: 'pointer', mb: 0.75 }}
            >
              <Refresh size={16} color="white" variant="Bold" />
              <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.88rem' }}>ถ่ายใหม่</Typography>
            </Box>

            <Box
              component="button"
              onClick={onBack}
              sx={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', py: 0.75 }}
            >
              <Typography sx={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.82rem' }}>ย้อนกลับ</Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function StylePickerStep({
  options,
  selectedIds,
  onToggle,
  onGenerate,
  onBack,
  selectedImage,
  maxStyles,
}: {
  options: HairstyleOption[];
  selectedIds: string[];
  onToggle: (styleId: string) => void;
  onGenerate: () => void;
  onBack: () => void;
  selectedImage: string;
  maxStyles: number;
}) {
  const [category, setCategory] = useState<'male' | 'female'>('male');
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [previewImage, setPreviewImage] = useState<{ url: string; label: string } | null>(null);

  const filtered = options.filter((o) => o.category === category);
  // Only highlight selections that belong to the current category
  const currentSelected = selectedIds.filter((id) => filtered.some((o) => o.id === id));
  const firstSelectedInCategory = filtered.find((o) => selectedIds.includes(o.id));
  const isFull = selectedIds.length >= maxStyles;

  const glass = {
    background: 'rgba(255,255,255,0.13)',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    border: '1px solid rgba(255,255,255,0.22)',
  } as const;

  const glassActive = {
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    border: '1px solid rgba(255,255,255,0.5)',
  } as const;

  return (
    <Box sx={{ height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden', bgcolor: '#1a1114' }}>
      {/* Full-screen background photo */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `url(${selectedImage})`,
          backgroundSize: { xs: 'cover', sm: 'contain' },
          backgroundPosition: { xs: 'top center', sm: 'center center' },
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#120c0f',
        }}
      />
      {/* Gradient overlay */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0.08) 40%, rgba(0,0,0,0.72) 100%)',
        }}
      />

      {/* Top bar */}
      <Stack
        direction="row"
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          px: 2,
          pt: { xs: 2.5, sm: 3 },
          pb: 1.5,
          justifyContent: 'space-between',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <Box
          component="button"
          onClick={onBack}
          sx={{
            ...glass,
            borderRadius: '50%',
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            color: 'white',
          }}
        >
          <ArrowRight size={18} style={{ transform: 'rotate(180deg)' }} color="currentColor" />
        </Box>

        <Box sx={{ ...glass, borderRadius: 99, px: 1.5, py: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.8rem' }}>Step 2/3</Typography>
        </Box>

        <Box
          component="button"
          onClick={() => setShowThumbnails((v) => !v)}
          sx={{
            ...glass,
            borderRadius: 99,
            px: 2,
            py: 0.75,
            display: 'flex',
            alignItems: 'center',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.7)',
          }}
        >
          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontWeight: 600, fontSize: '0.78rem' }}>
            {showThumbnails ? 'ซ่อนทรงผม' : 'แสดงทรงผม'}
          </Typography>
        </Box>
      </Stack>

      {/* Bottom glass sheet */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          px: { xs: 1.5, sm: 2.5 },
          pb: { xs: 2.5, sm: 3 },
          zIndex: 10,
        }}
      >
        {/* Info panel + Horizontal scroll thumbnails */}
        {showThumbnails && <>
          <Box sx={{ ...glass, borderRadius: '20px 20px 16px 16px', p: { xs: 2, sm: 2.5 }, mb: 1.5 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.25 }}>
              <Stack spacing={0.25}>
                <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>
                  เลือกลุคทรงผมที่ชอบ
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.62)', fontSize: '0.75rem' }}>
                  เลือกได้สูงสุด {maxStyles} ทรง ({selectedIds.length}/{maxStyles})
                </Typography>
              </Stack>
              {currentSelected.length > 0 && (
                <Box sx={{ ...glassActive, borderRadius: 99, px: 1.5, py: 0.4 }}>
                  <Typography sx={{ color: '#9f445e', fontWeight: 700, fontSize: '0.72rem' }}>
                    {currentSelected.length} ทรง
                  </Typography>
                </Box>
              )}
            </Stack>

            {/* Gender filter */}
            <Stack direction="row" spacing={1} sx={{ mb: firstSelectedInCategory ? 1.5 : 0 }}>
              {(['male', 'female'] as const).map((cat) => (
                <Box
                  key={cat}
                  component="button"
                  onClick={() => setCategory(cat)}
                  sx={{
                    ...(category === cat ? glassActive : glass),
                    borderRadius: 99,
                    px: 2,
                    py: 0.6,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      color: category === cat ? '#0f172a' : 'rgba(255,255,255,0.85)',
                    }}
                  >
                    {cat === 'male' ? 'ผู้ชาย' : 'ผู้หญิง'}
                  </Typography>
                </Box>
              ))}
            </Stack>

            {/* Selected style preview */}
            {firstSelectedInCategory && (
              <Box
                onClick={() => firstSelectedInCategory.thumbnail && setPreviewImage({ url: firstSelectedInCategory.thumbnail, label: firstSelectedInCategory.label })}
                sx={{ ...glass, borderRadius: 3, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5, cursor: firstSelectedInCategory.thumbnail ? 'zoom-in' : 'default' }}
              >
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 2,
                    flexShrink: 0,
                    backgroundImage: firstSelectedInCategory.thumbnail ? `url(${firstSelectedInCategory.thumbnail})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    background: !firstSelectedInCategory.thumbnail
                      ? (firstSelectedInCategory.category === 'male'
                        ? 'linear-gradient(135deg, rgba(125,211,252,0.5), rgba(56,189,248,0.3))'
                        : 'linear-gradient(135deg, rgba(249,168,212,0.5), rgba(217,147,164,0.3))')
                      : undefined,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {!firstSelectedInCategory.thumbnail && (
                    <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '1.2rem' }}>
                      {firstSelectedInCategory.label[0]}
                    </Typography>
                  )}
                </Box>
                <Stack spacing={0.15} sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ color: 'rgba(249,168,212,1)', fontWeight: 700, fontSize: '0.68rem' }}>
                      ทรงที่เลือก
                    </Typography>
                    {firstSelectedInCategory.thumbnail && (
                      <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem' }}>
                        แตะเพื่อดูรูปใหญ่
                      </Typography>
                    )}
                  </Stack>
                  <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.92rem', lineHeight: 1.1 }}>
                    {firstSelectedInCategory.label}
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.7rem' }}>
                    {firstSelectedInCategory.description}
                  </Typography>
                </Stack>
              </Box>
            )}
          </Box>
          <Box sx={{
            mb: 1.5,
            position: 'relative',
            width: '100%',
          }}>
            <Swiper
              modules={[FreeMode]}
              freeMode={{ sticky: true }}
              slidesPerView="auto"
              watchSlidesProgress={true}
              spaceBetween={14}
              style={{ paddingTop: 8, paddingBottom: 10, paddingLeft: 4, paddingRight: 4 }}
            >
              {filtered.map((style) => {
                const selected = currentSelected.includes(style.id);
                return (
                  <SwiperSlide key={style.id} style={{ width: 'auto' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 0.5,
                        position: 'relative',
                        width: 72,
                        opacity: !selected && isFull ? 0.38 : 1,
                        transition: 'opacity 0.2s',
                      }}
                    >
                      <Box
                        component="button"
                        onClick={() => onToggle(style.id)}
                        sx={{
                          width: 62,
                          height: 62,
                          borderRadius: '50%',
                          border: selected ? '2.5px solid #d993a4' : '2.5px solid rgba(255,255,255,0.15)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          transform: selected ? 'scale(1.05)' : 'scale(1)',
                          backgroundImage: style.thumbnail ? `url(${style.thumbnail})` : 'none',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          background: !style.thumbnail
                            ? (selected
                              ? 'linear-gradient(135deg, rgba(217,147,164,0.4), rgba(160,80,100,0.2))'
                              : 'rgba(255,255,255,0.08)')
                            : undefined,
                          cursor: 'pointer',
                          boxShadow: selected ? '0 0 15px rgba(217,147,164,0.3)' : 'none',
                          p: 0,
                          overflow: 'hidden',
                          '&:active': { transform: 'scale(0.95)' },
                        }}
                      >
                        {!style.thumbnail && (
                          <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '1.1rem', opacity: 0.8 }}>
                            {style.label[0]}
                          </Typography>
                        )}
                      </Box>

                      {/* Dedicated Preview Button */}
                      {style.thumbnail && (
                        <IconButton
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewImage({ url: style.thumbnail!, label: style.label });
                          }}
                          sx={{
                            position: 'absolute',
                            top: -4,
                            right: 4,
                            width: 26,
                            height: 26,
                            bgcolor: 'white',
                            color: '#1a1114',
                            p: 0,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                            zIndex: 2,
                            '&:hover': { bgcolor: '#f1f5f9', transform: 'scale(1.15) rotate(5deg)' },
                            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        >
                          <SearchNormal1 size={14} variant="Outline" color="currentColor" />
                        </IconButton>
                      )}

                      <Box sx={{ height: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', cursor: 'pointer' }} onClick={() => onToggle(style.id)}>
                        <Typography
                          sx={{
                            color: selected ? 'white' : 'rgba(255,255,255,0.7)',
                            fontSize: '0.62rem',
                            fontWeight: selected ? 700 : 400,
                            textAlign: 'center',
                            width: '100%',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                          }}
                        >
                          {style.label}
                        </Typography>
                      </Box>
                    </Box>
                  </SwiperSlide>
                );
              })}
            </Swiper>
          </Box>
        </>
        }

        {/* Action buttons */}
        <Stack direction="row" spacing={1.25}>
          <Box
            component="button"
            onClick={onBack}
            sx={{
              ...glass,
              borderRadius: 3,
              px: 2.5,
              py: 1.5,
              border: '1px solid rgba(255,255,255,0.22)',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.9rem' }}>ย้อนกลับ</Typography>
          </Box>
          <Box
            component="button"
            onClick={selectedIds.length > 0 ? onGenerate : undefined}
            sx={{
              flex: 1,
              borderRadius: 3,
              py: 1.5,
              border: 'none',
              cursor: selectedIds.length > 0 ? 'pointer' : 'default',
              bgcolor: selectedIds.length > 0 ? '#d993a4' : 'rgba(217,147,164,0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 0.75,
              transition: 'opacity 0.2s',
            }}
          >
            <Typography
              sx={{
                color: selectedIds.length > 0 ? '#1a1114' : 'rgba(255,255,255,0.4)',
                fontWeight: 800,
                fontSize: '0.92rem',
              }}
            >
              ไปยืนยันข้อมูล
            </Typography>
            {selectedIds.length > 0 && <ArrowRight size={18} color="#1a1114" />}
          </Box>
        </Stack>
      </Box>

      {/* Premium Hairstyle Preview Dialog */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            elevation: 0,
            sx: {
              bgcolor: 'transparent',
              backgroundImage: 'none',
              boxShadow: 'none',
              overflow: 'hidden',
              borderRadius: '32px',
              m: 2,
            }
          }
        }}
      >
        {previewImage && (() => {
          const style = options.find(o => o.id === (options.find(opt => opt.thumbnail === previewImage.url)?.id));
          if (!style) return null;
          const isSelected = selectedIds.includes(style.id);
          const canSelect = isSelected || !isFull;

          return (
            <Box
              sx={{
                position: 'relative',
                background: 'linear-gradient(165deg, rgba(45, 27, 34, 0.9) 0%, rgba(13, 8, 16, 0.95) 100%)',
                backdropFilter: 'blur(40px)',
                WebkitBackdropFilter: 'blur(40px)',
                borderRadius: '32px',
                border: '1px solid rgba(255,255,255,0.15)',
                overflow: 'hidden',
                boxShadow: '0 40px 100px rgba(0,0,0,0.9)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Image Section - The Main Hero */}
              <Box sx={{ position: 'relative', width: '100%', aspectRatio: '3/4', overflow: 'hidden' }}>
                <Box
                  component="img"
                  src={previewImage.url}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to bottom, transparent 60%, rgba(13, 8, 16, 0.95) 100%)'
                  }}
                />

                {/* Close Button Overlay */}
                <IconButton
                  onClick={() => setPreviewImage(null)}
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    bgcolor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    zIndex: 2,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  }}
                  size="small"
                >
                  <CloseCircle size={20} variant="Bold" color="currentColor" />
                </IconButton>

                {/* Title Overlay */}
                <Box sx={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
                  <Stack spacing={0.5}>
                    <Typography sx={{ color: '#d993a4', fontWeight: 900, fontSize: '0.65rem', letterSpacing: 2, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                      PREMIUM SELECTION
                    </Typography>
                    <Typography variant="h4" sx={{ color: 'white', fontWeight: 900, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                      {previewImage.label}
                    </Typography>
                  </Stack>
                </Box>
              </Box>

              {/* Minimalist Details Section */}
              <Box sx={{ p: 3, pt: 2 }}>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, mb: 3, fontSize: '0.85rem' }}>
                  {style.description}
                </Typography>



                <Stack direction="row" spacing={1.5}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      onToggle(style.id);
                      setPreviewImage(null);
                    }}
                    disabled={!canSelect}
                    sx={{
                      bgcolor: isSelected ? 'rgba(255,255,255,0.08)' : '#d993a4',
                      color: isSelected ? 'white' : '#1a1114',
                      border: isSelected ? '1px solid rgba(255,255,255,0.15)' : 'none',
                      borderRadius: '14px',
                      py: 1.5,
                      fontWeight: 900,
                      fontSize: '0.9rem',
                      textTransform: 'none',
                      boxShadow: isSelected ? 'none' : '0 10px 20px rgba(217,147,164,0.3)',
                      '&:hover': {
                        bgcolor: isSelected ? 'rgba(255,255,255,0.12)' : '#c88293',
                      }
                    }}
                    startIcon={isSelected ? <TickCircle variant="Bold" color="currentColor" /> : undefined}
                  >
                    {isSelected ? 'ยกเลิกการเลือกทรงนี้' : (isFull ? `เต็มแล้ว` : 'เลือกทรงนี้')}
                  </Button>

                  <Button
                    onClick={() => setPreviewImage(null)}
                    sx={{
                      borderRadius: '14px',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'rgba(255,255,255,0.4)',
                      px: 3,
                      textTransform: 'none',
                      fontSize: '0.85rem'
                    }}
                  >
                    ปิด
                  </Button>
                </Stack>
              </Box>
            </Box>
          );
        })()}
      </Dialog>
    </Box>
  );
}

const hairTrivia = [
  "💡 รู้หรือไม่? เส้นผมของคนเรางอกเฉลี่ยเดือนละ 1-1.5 เซนติเมตร",
  "💡 ทรงผมที่มีเลเยอร์ช่วยเพิ่มวอลลุ่มให้ผมดูหนาขึ้น เหมาะสำหรับคนผมเส้นเล็ก",
  "💡 การสระผมด้วยน้ำอุ่นจัดจะทำให้ผมแห้งเสียและสีผมหลุดลอกไวขึ้น",
  "💡 หน้าม้าซีทรู (See-Through Bangs) ช่วยพรางหน้าผากและทำให้หน้าดูเด็กลง",
  "💡 สีผมโทนหม่น (Ash) จะหลุดง่ายกว่าโทนร้อน ควรใช้แชมพูม่วงเพื่อรักษาสี",
  "💡 ทรีทเม้นต์สัปดาห์ละครั้ง ช่วยให้ผมเงางามและจัดทรงง่ายขึ้นอย่างเห็นได้ชัด",
  "💡 โครงหน้ากลมจะเหมาะกับทรงผมที่ยาวเลยคางลงไป เพื่อช่วยพรางช่วงแก้ม",
  "💡 การเล็มปลายผมทุกๆ 8 สัปดาห์ ช่วยลดปัญหาผมแตกปลายและทำให้ผมดูสุขภาพดี"
];

function ProcessingStep({ mode, message, elapsedLabel }: { mode: FlowMode; message: string; elapsedLabel: string }) {
  const [triviaIndex, setTriviaIndex] = useState(() => Math.floor(Math.random() * hairTrivia.length));
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false); // Start fade out
      setTimeout(() => {
        setTriviaIndex((prev) => (prev + 1) % hairTrivia.length);
        setFade(true); // Fade in with new text
      }, 500); // Wait for fade out to complete
    }, 4500); // Change every 4.5 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <AppWrapper bgcolor="#1a1114">
      <Box sx={{ height: '100%', width: '100%', background: shellBackground, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', px: 4 }}>
        <Stack spacing={3} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 420 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <Box sx={{ position: 'absolute', width: 112, height: 112, border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%', animation: `${pulse} 3s infinite ease-in-out` }} />
            <Box sx={{ width: 88, height: 88, borderRadius: '50%', bgcolor: 'rgba(217,147,164,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d993a4' }}>
              <Magicpen size={38} variant="Bold" color="currentColor" />
            </Box>
          </Box>

          <Box>
            <Typography variant="h5" sx={{ color: 'white', fontWeight: 800, mb: 1 }}>
              {mode === 'analysis' ? 'AI กำลังวิเคราะห์รูปภาพ' : 'AI กำลังสร้างทรงผม'}
            </Typography>
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.68)', lineHeight: 1.6 }}>
              {message}
            </Typography>
            <Typography sx={{ color: '#fbcfe8', fontSize: '0.8rem', fontWeight: 700, mt: 1.5 }}>
              ใช้เวลาแล้ว {elapsedLabel}
            </Typography>
          </Box>

          {/* Hair Trivia Box */}
          <Box sx={{
            mt: 2, p: 2.5, borderRadius: 4,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)',
            width: '100%',
            minHeight: 80,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Typography sx={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: '0.88rem',
              lineHeight: 1.6,
              fontWeight: 500,
              opacity: fade ? 1 : 0,
              transform: fade ? 'translateY(0)' : 'translateY(4px)',
              transition: 'all 0.4s ease-in-out'
            }}>
              {hairTrivia[triviaIndex]}
            </Typography>
          </Box>
        </Stack>
      </Box>
    </AppWrapper>
  );
}

function ResultStep({
  mode,
  selectedImage,
  analysisImageUrl,
  tryOnResults,
  errorMessage,
  selectedTryOnStyleId,
  onSelectTryOnStyle,
  selectedHairColorIds = [],
  activeColorId = '',
  onSelectHairColor,
  onGenerateHairColor,
  hairColorPreviewUrl,
  isGeneratingHairColor,
  hairColorErrorMessage,
  generationDurationMs,
  generationTimingBreakdown,
  colorCacheCount,
  onClearColorCache,
  onRestart,
  onBackToUpload,
  onRegenAnalysis,
  colorPreviews,
}: {
  mode: FlowMode;
  selectedImage: string;
  analysisImageUrl: string;
  tryOnResults: TryOnResult[];
  errorMessage: string | null;
  selectedTryOnStyleId: string | null;
  onSelectTryOnStyle: (styleId: string) => void;
  selectedHairColorIds: string[];
  activeColorId: string;
  onSelectHairColor: (colorId: string, options?: { toggle?: boolean }) => void;
  onGenerateHairColor: () => void;
  hairColorPreviewUrl: string;
  isGeneratingHairColor: boolean;
  hairColorErrorMessage: string | null;
  generationDurationMs: number | null;
  generationTimingBreakdown: GenerationTimingBreakdown | null;
  colorCacheCount: number;
  onClearColorCache: () => void;
  onRestart: () => void;
  onBackToUpload: () => void;
  onRegenAnalysis?: () => void;
  colorPreviews: Record<string, string>;
}) {
  const hasTryOnResults = tryOnResults.length > 0;
  const selectedTryOnResult = tryOnResults.find((result) => result.styleId === selectedTryOnStyleId) ?? tryOnResults[0] ?? null;
  const activeColor = hairColorOptions.find((color) => color.id === activeColorId) ?? null;
  const selectedColorCount = selectedHairColorIds?.length ?? 0;
  const isCurrentActiveCached = !!hairColorPreviewUrl;
  const generationTimeLabel = generationDurationMs ? formatElapsedMs(generationDurationMs) : null;
  const timingItems = [
    { label: 'ส่งคำขอ', value: formatTimingValue(generationTimingBreakdown?.submitMs ?? null) },
    { label: 'รอคิว', value: formatTimingValue(generationTimingBreakdown?.queueMs ?? null) },
    { label: 'สร้างภาพ', value: formatTimingValue(generationTimingBreakdown?.generationMs ?? null) },
    { label: 'Inference', value: formatTimingValue(generationTimingBreakdown?.providerInferenceMs ?? null) },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  const [isDownloading, setIsDownloading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const activeImageUrl = mode === 'analysis' ? analysisImageUrl : (hairColorPreviewUrl || selectedTryOnResult?.imageUrl || '');

  const handleDownloadActiveImage = async () => {
    if (!activeImageUrl || isDownloading) return;

    const fallbackOpen = () => {
      window.open(activeImageUrl, '_blank', 'noopener,noreferrer');
    };

    setIsDownloading(true);
    try {
      const response = await fetch(activeImageUrl);
      if (!response.ok) {
        fallbackOpen();
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const prefix = mode === 'analysis' ? 'salon-ai-analysis' : `salon-ai-${activeColor?.label || 'style'}`;
      const filename = `${prefix}-${timestamp}.png`;

      anchor.href = objectUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
    } catch (error) {
      console.error('Download failed:', error);
      fallbackOpen();
    } finally {
      setIsDownloading(false);
    }
  };

  const qrModal = (
    <Dialog
      open={showQrModal}
      onClose={() => setShowQrModal(false)}
      slots={{ transition: Fade }}
      slotProps={{
        paper: {
          sx: {
            bgcolor: 'transparent',
            backgroundImage: 'none',
            boxShadow: 'none',
            overflow: 'visible'
          }
        }
      }}
    >
      <DialogContent sx={{ p: 0, overflow: 'visible' }}>
        <Box sx={{
          width: { xs: '90vw', sm: 400 },
          bgcolor: '#1a1114',
          borderRadius: 6,
          border: '1px solid rgba(255,255,255,0.1)',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          p: 4
        }}>
          {/* Decorative Glow */}
          <Box sx={{ position: 'absolute', top: -100, right: -100, width: 200, height: 200, background: 'radial-gradient(circle, rgba(217,147,164,0.12) 0%, transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />

          <Stack spacing={4} sx={{ alignItems: 'center', position: 'relative', zIndex: 1 }}>
            {/* Header */}
            <Stack spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="overline" sx={{ color: '#d993a4', fontWeight: 800, letterSpacing: 3, fontSize: '0.65rem' }}>
                SAVE YOUR STYLE
              </Typography>
              <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '1.5rem', textAlign: 'center' }}>
                บันทึกรูปภาพ
              </Typography>
            </Stack>

            {/* Option 1: QR Code */}
            <Stack spacing={2} sx={{ alignItems: 'center', width: '100%' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.4)' }}>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.06)', width: 40 }} />
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em' }}>สแกนเพื่อรับรูปในมือถือ</Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.06)', width: 40 }} />
              </Box>

              <Box sx={{
                p: 2,
                bgcolor: 'white',
                borderRadius: 4,
                display: 'flex',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                transform: 'rotate(-1deg)',
                transition: 'transform 0.3s ease',
                '&:hover': { transform: 'rotate(0deg) scale(1.02)' }
              }}>
                {activeImageUrl.startsWith('data:') ? (
                  <Box sx={{ width: 180, height: 180, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8f9fa', borderRadius: 2, p: 2 }}>
                    <Refresh size={32} color="#d1d5db" className="animate-spin" style={{ marginBottom: 12 }} />
                    <Typography sx={{ color: '#1a1114', fontSize: '0.7rem', fontWeight: 700, textAlign: 'center' }}>
                      กำลังเตรียม QR Code...
                    </Typography>
                  </Box>
                ) : (
                  <QRCodeSVG
                    value={activeImageUrl}
                    size={180}
                    level="M"
                    includeMargin={false}
                  />
                )}
              </Box>
            </Stack>

            {/* Option 2: Direct Download */}
            <Stack spacing={2} sx={{ width: '100%', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(255,255,255,0.4)' }}>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.06)', width: 40 }} />
                <Typography sx={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em' }}>บันทึกลงเครื่องนี้</Typography>
                <Box sx={{ flex: 1, height: '1px', bgcolor: 'rgba(255,255,255,0.06)', width: 40 }} />
              </Box>

              <Button
                fullWidth
                variant="contained"
                onClick={handleDownloadActiveImage}
                disabled={isDownloading}
                startIcon={isDownloading ? <Refresh size={20} className="animate-spin" /> : <DocumentDownload size={20} variant="Bold" color="currentColor" />}
                sx={{
                  bgcolor: '#d993a4',
                  color: '#1a1114',
                  borderRadius: 3,
                  py: 2,
                  fontWeight: 900,
                  fontSize: '1rem',
                  textTransform: 'none',
                  boxShadow: '0 8px 24px rgba(217,147,164,0.2)',
                  '&:hover': { bgcolor: '#c88293', transform: 'translateY(-2px)' },
                  transition: 'all 0.2s ease'
                }}
              >
                {isDownloading ? 'กำลังบันทึก...' : 'ดาวน์โหลดรูปภาพ'}
              </Button>

              <Button
                onClick={() => setShowQrModal(false)}
                sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'none', '&:hover': { color: 'white' } }}
              >
                ปิดหน้าต่าง
              </Button>
            </Stack>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );


  if (mode === 'analysis') {
    return (
      <AppWrapper bgcolor="#1a1114">
        <Box sx={{ height: '100%', width: '100%', background: shellBackground, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.25}
            sx={{
              px: { xs: 2, sm: 3, lg: 4 },
              py: { xs: 1.5, sm: 2 },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', md: 'center' },
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              bgcolor: 'rgba(26,17,20,0.82)',
              flexShrink: 0,
            }}
          >
            <Stack spacing={0.4}>
              <Typography variant="h5" sx={{ color: 'white', fontWeight: 800, fontSize: { xs: '1.05rem', sm: '1.2rem' } }}>
                ผลวิเคราะห์จาก AI
              </Typography>
              {generationTimeLabel && (
                <Typography sx={{ color: 'rgba(251,207,232,0.88)', fontSize: '0.78rem', fontWeight: 700 }}>
                  ใช้เวลา {generationTimeLabel}
                </Typography>
              )}
              {timingItems.length > 0 && (
                <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75, pt: 0.35 }}>
                  {timingItems.map((item) => (
                    <Chip
                      key={item.label}
                      label={`${item.label} ${item.value}`}
                      size="small"
                      sx={{
                        bgcolor: 'rgba(255,255,255,0.08)',
                        color: 'rgba(255,255,255,0.72)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        fontWeight: 600,
                        height: 24,
                        '& .MuiChip-label': { px: 1 },
                      }}
                    />
                  ))}
                </Stack>
              )}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ width: { xs: '100%', md: 'auto' } }}>
              <Button
                onClick={onRegenAnalysis}
                size="small"
                sx={{
                  color: 'rgba(255,255,255,0.7)',
                  borderColor: 'rgba(255,255,255,0.15)',
                  border: '1px solid',
                  borderRadius: { xs: 3, sm: 2.5 },
                  px: { xs: 1.5, sm: 2 },
                  py: { xs: 1, sm: 0.75 },
                  minHeight: { xs: 44, sm: 34 },
                  minWidth: 0,
                  flex: { xs: 1, md: '0 0 auto' },
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: { xs: '0.8rem', sm: '0.85rem' },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.3)' }
                }}
                startIcon={<Refresh2 size={16} color="currentColor" />}
              >
                วิเคราะห์ใหม่
              </Button>

              <Button
                onClick={() => setShowQrModal(true)}
                disabled={!analysisImageUrl || isDownloading}
                size="small"
                sx={{ color: 'rgba(255,255,255,0.86)', borderColor: 'rgba(255,255,255,0.28)', border: '1px solid', borderRadius: { xs: 3, sm: 2.5 }, px: { xs: 1, sm: 2.25 }, py: { xs: 1, sm: 0.75 }, minHeight: { xs: 44, sm: 34 }, minWidth: 0, flex: { xs: 1, md: '0 0 auto' }, textTransform: 'none', fontWeight: 700, fontSize: { xs: '0.8rem', sm: '0.875rem' }, lineHeight: 1.15, whiteSpace: 'nowrap', touchAction: 'manipulation' }}
              >
                {isDownloading ? (
                  <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <Box component="span" sx={{ width: 13, height: 13, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'rgba(255,255,255,0.9)', borderRadius: '50%', animation: 'spin 0.7s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } }, flexShrink: 0 }} />
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>กำลังดาวน์โหลด...</Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>โหลด...</Box>
                  </Box>
                ) : (
                  <>
                    <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>ดาวน์โหลดรูป</Box>
                    <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>ดาวน์โหลด</Box>
                  </>
                )}
              </Button>
              <Button
                variant="outlined"
                startIcon={<Refresh variant="Bold" />}
                onClick={onBackToUpload}
                size="small"
                sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.28)', borderRadius: { xs: 3, sm: 2.5 }, px: { xs: 1, sm: 2.25 }, py: { xs: 1, sm: 0.75 }, minHeight: { xs: 44, sm: 34 }, minWidth: 0, flex: { xs: 1, md: '0 0 auto' }, textTransform: 'none', fontSize: { xs: '0.8rem', sm: '0.875rem' }, lineHeight: 1.15, touchAction: 'manipulation', '& .MuiButton-startIcon': { mr: { xs: 0.6, sm: 1 }, ml: 0 } }}
              >
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>ใช้รูปใหม่</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>รูปใหม่</Box>
              </Button>
              <Button variant="contained" startIcon={<TickCircle variant="Bold" />} onClick={onRestart} size="small" sx={{ bgcolor: '#d993a4', color: '#1a1114', borderRadius: { xs: 3, sm: 2.5 }, px: { xs: 1, sm: 2.25 }, py: { xs: 1, sm: 0.75 }, minHeight: { xs: 44, sm: 34 }, minWidth: 0, flex: { xs: 1, md: '0 0 auto' }, fontWeight: 700, textTransform: 'none', fontSize: { xs: '0.8rem', sm: '0.875rem' }, lineHeight: 1.15, touchAction: 'manipulation', '& .MuiButton-startIcon': { mr: { xs: 0.6, sm: 1 }, ml: 0 } }}>
                <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>กลับหน้าแรก</Box>
                <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>หน้าแรก</Box>
              </Button>
            </Stack>
          </Stack>

          <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: { xs: 1, sm: 1.5, md: 2, lg: 3 }, py: { xs: 1, sm: 1.5, lg: 2 } }}>
            {analysisImageUrl ? (
              <Box
                component="img"
                src={analysisImageUrl}
                alt="Hair Analysis Infographic"
                sx={{
                  width: '100%',
                  maxWidth: { xs: '100%', sm: 900, md: 1100, lg: 1320, xl: 1480 },
                  height: 'auto',
                  display: 'block',
                  mx: 'auto',
                  borderRadius: { xs: 2, sm: 3, lg: 4 },
                  objectFit: 'contain',
                  boxShadow: '0 22px 48px rgba(0,0,0,0.28)',
                }}
              />
            ) : (
              <Stack sx={{ alignItems: 'center', justifyContent: 'center', minHeight: '100%', gap: 2, px: 2 }}>
                {errorMessage && (
                  <Typography sx={{ color: '#fda4af', textAlign: 'center' }}>{errorMessage}</Typography>
                )}
                <Typography sx={{ color: 'rgba(255,255,255,0.4)' }}>ยังไม่มีผลวิเคราะห์</Typography>
              </Stack>
            )}
          </Box>

          {errorMessage && (
            <Typography variant="body2" sx={{ color: '#fda4af', px: { xs: 2, sm: 3, lg: 4 }, pb: { xs: 1.5, sm: 2 } }}>
              {errorMessage}
            </Typography>
          )}
        </Box>
        {qrModal}
      </AppWrapper>
    );
  }

  return (
    <AppWrapper bgcolor="#0d0810">
      <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* ── Header: Glass bar ── */}
        <Stack direction="row" sx={{ px: { xs: 2, md: 3 }, py: { xs: 1.5, md: 2 }, alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.04)', bgcolor: 'rgba(13,8,16,0.2)', backdropFilter: 'blur(20px)', zIndex: 10 }}>
          <Stack spacing={1}>
            <Typography variant="overline" sx={{ color: '#d993a4', letterSpacing: 3, fontWeight: 800, fontSize: '0.62rem', opacity: 0.8 }}>
              SIMULATION GALLERY
            </Typography>
            {timingItems.length > 0 && (
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                {timingItems.map((item) => (
                  <Box
                    key={item.label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.6,
                      px: 1,
                      py: 0.35,
                      bgcolor: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: 1.5,
                    }}
                  >
                    <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', fontWeight: 700, textTransform: 'uppercase' }}>{item.label}</Typography>
                    <Typography sx={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.6rem', fontWeight: 800 }}>{item.value}</Typography>
                  </Box>
                ))}
              </Stack>
            )}
          </Stack>
          <Stack direction="row" spacing={1.25} sx={{ alignItems: 'center' }}>
            <Button
              onClick={() => setShowQrModal(true)}
              disabled={!selectedTryOnResult && !hairColorPreviewUrl}
              startIcon={<DocumentDownload size={18} variant="Bold" color="currentColor" />}
              sx={{
                color: '#1a1114',
                bgcolor: '#d993a4',
                textTransform: 'none',
                fontWeight: 800,
                height: 42,
                px: { xs: 1.5, sm: 2.25 },
                borderRadius: 2.5,
                boxShadow: '0 4px 12px rgba(217,147,164,0.2)',
                '&:hover': { bgcolor: '#c88293', transform: 'translateY(-1px)' },
                transition: 'all 0.2s ease',
                '&.Mui-disabled': { color: 'rgba(255,255,255,0.15)', bgcolor: 'rgba(255,255,255,0.04)' }
              }}>
              <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>ดาวน์โหลด</Box>
              <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>บันทึก</Box>
            </Button>
            <IconButton
              onClick={onRestart}
              sx={{
                bgcolor: 'rgba(255,255,255,0.05)',
                color: 'white',
                width: 42,
                height: 42,
                borderRadius: 2.5,
                border: '1px solid rgba(255,255,255,0.08)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' }
              }}
            >
              <TickCircle variant="Bold" size={20} color="currentColor" />
            </IconButton>
          </Stack>
        </Stack>

        {/* ── Body: scrollable ── */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>

          {/* ── Left / Top: Feature image + filmstrip ── */}
          <Box sx={{ position: 'relative', width: { xs: '100%', md: '45%', lg: '38%' }, flexShrink: 0, bgcolor: '#0d0810', display: 'flex', flexDirection: 'column' }}>
            {/* Big featured image */}
            <Box sx={{
              width: '100%',
              aspectRatio: '2/3',
              position: 'relative',
              overflow: 'hidden',
              flexShrink: 0,
              borderRadius: { xs: 0, md: 4 },
              bgcolor: '#0d0810',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
            }}>
              {selectedTryOnResult ? (
                <Box component="img"
                  src={hairColorPreviewUrl || selectedTryOnResult.imageUrl}
                  alt={selectedTryOnResult.styleLabel}
                  sx={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center top',
                    display: 'block',
                    filter: isGeneratingHairColor && !hairColorPreviewUrl ? 'blur(4px) grayscale(0.5)' : 'none',
                    transition: 'filter 0.3s ease'
                  }}
                />
              ) : (
                <Box sx={{ width: '100%', height: '100%', minHeight: { xs: 260, md: 320 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>ยังไม่มีภาพ</Typography>
                </Box>
              )}

              {/* Loading Overlay for Hair Color */}
              {isGeneratingHairColor && !hairColorPreviewUrl && (
                <Box sx={{
                  position: 'absolute',
                  inset: 0,
                  bgcolor: 'rgba(13,8,16,0.5)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  zIndex: 2
                }}>
                  <Box sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    border: '3px solid rgba(255,255,255,0.1)',
                    borderTopColor: '#d993a4',
                    animation: `${spin} 1s linear infinite`
                  }} />
                  <Typography sx={{ color: 'white', fontWeight: 700, fontSize: '0.85rem', letterSpacing: '0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                    กำลังจำลองสีผม...
                  </Typography>
                </Box>
              )}
              {/* Gradient + label overlay */}
              {selectedTryOnResult && (
                <Box sx={{
                  position: 'absolute',
                  bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(13,8,16,0.95) 0%, rgba(13,8,16,0.6) 40%, transparent 100%)',
                  px: 2.5, pt: 5, pb: 2,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between'
                }}>
                  <Stack spacing={0.2}>
                    <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      {mode === 'recolor' ? 'Original Style' : 'AI Try-On Result'}
                    </Typography>
                    <Typography sx={{ color: 'white', fontWeight: 800, fontSize: { xs: '1.05rem', md: '1.2rem' }, letterSpacing: '-0.01em' }}>
                      {selectedTryOnResult.styleLabel}
                      {activeColor && (hairColorPreviewUrl || mode === 'recolor') ? (
                        <Box component="span" sx={{ color: '#d993a4', ml: 1.5, fontWeight: 500 }}>
                          – {activeColor.label}
                        </Box>
                      ) : null}
                    </Typography>
                  </Stack>
                  <Box sx={{ bgcolor: 'rgba(217,147,164,0.15)', border: '1px solid rgba(217,147,164,0.4)', color: '#fbcfe8', px: 1.2, py: 0.4, borderRadius: 1.5, fontSize: '0.62rem', fontWeight: 900, letterSpacing: '0.05em', backdropFilter: 'blur(8px)' }}>
                    SALON EXCLUSIVE
                  </Box>
                </Box>
              )}
            </Box>

            {/* Hairstyle filmstrip */}
            {hasTryOnResults && mode !== 'recolor' && (
              <Box sx={{ bgcolor: 'rgba(0,0,0,0.55)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.1em', px: 2, pt: 1, textTransform: 'uppercase' }}>Hairstyles</Typography>
                <Box sx={{ px: 1.75, pb: 1.5, pt: 0.5 }}>
                  <Swiper
                    modules={[FreeMode]}
                    freeMode={{ sticky: true }}
                    slidesPerView="auto"
                    spaceBetween={10}
                  >
                    {tryOnResults.map((result) => {
                      const selected = result.styleId === selectedTryOnResult?.styleId;
                      return (
                        <SwiperSlide key={result.styleId} style={{ width: 'auto' }}>
                          <Box component="button" onClick={() => onSelectTryOnStyle(result.styleId)}
                            sx={{ p: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0, width: { xs: 76, md: 86 }, textAlign: 'center' }}>
                            <Box sx={{ borderRadius: 2, overflow: 'hidden', border: selected ? '2.5px solid #f9a8d4' : '2.5px solid transparent', transition: 'border-color 0.15s', boxShadow: selected ? '0 0 0 1px rgba(249,168,212,0.3)' : 'none' }}>
                              <Box sx={{ width: '100%', aspectRatio: '2/3', overflow: 'hidden' }}>
                                <Box component="img" src={result.imageUrl} alt={result.styleLabel} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </Box>
                            </Box>
                            <Typography sx={{ color: selected ? '#fbcfe8' : 'rgba(255,255,255,0.6)', fontSize: '0.62rem', fontWeight: selected ? 800 : 500, mt: 0.5, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {result.styleLabel}
                            </Typography>
                          </Box>
                        </SwiperSlide>
                      );
                    })}
                  </Swiper>
                </Box>
              </Box>
            )}

            {/* Color preview results strip */}
            {selectedHairColorIds && selectedHairColorIds.length > 0 && (
              <Box sx={{ bgcolor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(10px)' }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.55rem', fontWeight: 900, letterSpacing: '0.1em', px: 2, pt: 1, textTransform: 'uppercase' }}>Color Previews</Typography>
                <Box sx={{ px: 1.75, pb: 1.5, pt: 0.5 }}>
                  <Swiper
                    modules={[FreeMode]}
                    freeMode={{ sticky: true }}
                    slidesPerView="auto"
                    spaceBetween={10}
                  >
                    {/* Original Version */}
                    <SwiperSlide style={{ width: 'auto' }}>
                      <Box component="button" onClick={() => onSelectHairColor('', { toggle: false })}
                        sx={{ p: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0, width: { xs: 76, md: 86 }, textAlign: 'center' }}>
                        <Box sx={{ 
                          borderRadius: 2, 
                          overflow: 'hidden', 
                          border: activeColorId === '' ? '2.5px solid #d993a4' : '2.5px solid transparent',
                          aspectRatio: '2/3',
                          bgcolor: '#0d0810'
                        }}>
                          <Box component="img" src={selectedTryOnResult?.imageUrl} alt="Original" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Box>
                        <Typography sx={{ color: activeColorId === '' ? 'white' : 'rgba(255,255,255,0.4)', fontSize: '0.62rem', fontWeight: 800, mt: 0.5 }}>
                          Original
                        </Typography>
                      </Box>
                    </SwiperSlide>

                    {/* Generated Colors */}
                    {selectedHairColorIds?.map(colorId => {
                      const color = hairColorOptions.find(c => c.id === colorId);
                      const cacheKey = `${selectedTryOnStyleId ?? 'original'}_${colorId}`;
                      const previewUrl = colorPreviews[cacheKey];
                      if (!previewUrl) return null;
                      
                      const active = activeColorId === colorId;
                      return (
                        <SwiperSlide key={colorId} style={{ width: 'auto' }}>
                          <Box component="button" onClick={() => onSelectHairColor(colorId, { toggle: false })}
                            sx={{ p: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0, width: { xs: 76, md: 86 }, textAlign: 'center' }}>
                            <Box sx={{ 
                              borderRadius: 2, 
                              overflow: 'hidden', 
                              border: active ? '2.5px solid #d993a4' : '2.5px solid transparent',
                              aspectRatio: '2/3',
                              bgcolor: color?.swatch 
                            }}>
                              <Box component="img" src={previewUrl} alt={color?.label} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </Box>
                            <Typography sx={{ color: active ? 'white' : 'rgba(255,255,255,0.4)', fontSize: '0.62rem', fontWeight: 800, mt: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {color?.label}
                            </Typography>
                          </Box>
                        </SwiperSlide>
                      );
                    })}
                  </Swiper>
                </Box>
              </Box>
            )}
          </Box>

          {/* ── Right / Bottom: Controls ── */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#1a1114' }}>
            {/* Color picker section */}
            <Box sx={{ px: { xs: 2.5, md: 3 }, pt: 3, pb: 3, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
                <Stack spacing={0.3}>
                  <Typography sx={{ color: 'white', fontSize: '0.95rem', fontWeight: 800 }}>
                    Color Palette
                  </Typography>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.68rem', fontWeight: 500 }}>
                    เลือกเฉดสีที่ต้องการจำลอง (เลือกได้หลายสี)
                  </Typography>
                </Stack>
                {colorCacheCount > 0 && (
                  <Button size="small" onClick={onClearColorCache}
                    sx={{ color: 'rgba(255,255,255,0.3)', textTransform: 'none', fontSize: '0.62rem', fontWeight: 700, minHeight: 0, py: 0.4, px: 1, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.08)', '&:hover': { bgcolor: 'rgba(255,255,255,0.05)', color: 'white' } }}>
                    Reset Cache
                  </Button>
                )}
              </Stack>

              {/* Categorized Swatches */}
              <Stack spacing={2.5} sx={{ mb: 3 }}>
                {['Natural & Dark', 'Fashion & Ash', 'Warm & Beige'].map(cat => (
                  <Box key={cat}>
                    <Typography sx={{ color: '#d993a4', fontSize: '0.6rem', fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', mb: 1.25, opacity: 0.8 }}>
                      {cat}
                    </Typography>
                    <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1 }}>
                      {hairColorOptions.filter(c => c.category === cat).map((color) => {
                        const isSelected = selectedHairColorIds.includes(color.id);
                        const isActive = color.id === activeColorId;
                        return (
                          <Box key={color.id} component="button" onClick={() => onSelectHairColor(color.id)}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1.1,
                              pl: 0.8, pr: 1.2, // Use fixed padding to prevent layout shifts
                              py: 0.8,
                              borderRadius: 99,
                              border: isActive ? `2.5px solid ${accentRose}` : isSelected ? `1.5px solid rgba(217,147,164,0.5)` : '1.5px solid rgba(255,255,255,0.06)',
                              background: (isActive || isSelected) ? '#fff' : 'rgba(255,255,255,0.02)',
                              color: (isActive || isSelected) ? '#1a1114' : 'rgba(255,255,255,0.5)',
                              cursor: 'pointer',
                              minHeight: 40,
                              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                              transform: isActive ? 'scale(1.08)' : 'scale(1)',
                              boxShadow: isActive ? `0 8px 24px rgba(217,147,164,0.35)` : isSelected ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
                              zIndex: isActive ? 2 : 1,
                              '&:hover': {
                                background: (isActive || isSelected) ? '#fff' : 'rgba(255,255,255,0.08)',
                                borderColor: isActive ? accentRose : isSelected ? accentRose : 'rgba(255,255,255,0.18)',
                                transform: isActive ? 'scale(1.08)' : 'scale(1.03)',
                              }
                            }}>
                            <Box sx={{
                              width: 24, height: 24, borderRadius: '50%',
                              bgcolor: color.swatch,
                              border: '2px solid rgba(255,255,255,0.3)',
                              flexShrink: 0,
                              position: 'relative',
                              overflow: 'hidden',
                              '&::after': {
                                content: '""',
                                position: 'absolute',
                                top: -2, left: -2, right: -2, bottom: -2,
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.4) 0%, transparent 60%)',
                                borderRadius: '50%'
                              }
                            }} />
                            
                            {/* Text container: Reserving space for bold text to prevent layout shift */}
                            <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
                              <Typography sx={{ fontSize: '0.78rem', fontWeight: 900, lineHeight: 1, letterSpacing: '0.01em', visibility: 'hidden' }}>
                                {color.label}
                              </Typography>
                              <Typography sx={{ position: 'absolute', left: 0, fontSize: '0.78rem', fontWeight: isSelected || isActive ? 900 : 500, lineHeight: 1, letterSpacing: '0.01em', whiteSpace: 'nowrap' }}>
                                {color.label}
                              </Typography>
                            </Box>

                            {/* Icon container: Always takes up 16px to prevent layout shift */}
                            <Box sx={{ 
                              width: 16, height: 16, 
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              opacity: isSelected ? 1 : 0,
                              transform: isSelected ? 'scale(1)' : 'scale(0.5)',
                              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                              ml: -0.2
                            }}>
                              <TickCircle size={16} variant="Bold" color={isActive ? accentRose : '#f9a8d4'} />
                            </Box>
                          </Box>
                        );
                      })}
                    </Stack>
                  </Box>
                ))}
              </Stack>

              <Button fullWidth variant="contained"
                onClick={onGenerateHairColor}
                disabled={!selectedTryOnResult || selectedColorCount === 0 || isGeneratingHairColor}
                sx={{
                  background: isCurrentActiveCached
                    ? 'rgba(255,255,255,0.02)'
                    : `linear-gradient(135deg, ${accentRose} 0%, #c2727f 100%)`,
                  color: isCurrentActiveCached ? accentRose : '#1a1114',
                  borderRadius: 3,
                  fontWeight: 900,
                  textTransform: 'none',
                  minHeight: 56,
                  fontSize: '0.95rem',
                  letterSpacing: '0.04em',
                  border: isCurrentActiveCached ? `1px solid rgba(217,147,164,0.3)` : 'none',
                  boxShadow: isCurrentActiveCached ? 'none' : '0 12px 32px rgba(194,114,127,0.35)',
                  '&:hover': {
                    background: isCurrentActiveCached ? 'rgba(255,255,255,0.05)' : `linear-gradient(135deg, #e2a3b2 0%, #b5636f 100%)`,
                    transform: isCurrentActiveCached ? 'none' : 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease',
                  '&.Mui-disabled': { 
                    background: 'rgba(255,255,255,0.05)', 
                    color: 'rgba(255,255,255,0.25)',
                    boxShadow: 'none',
                    border: '1px dashed rgba(255,255,255,0.15)'
                  }
                }}>
                {isGeneratingHairColor ? 'กำลังวิเคราะห์และจำลองสี...' : (selectedColorCount > 1 ? `จำลองสีผมที่เลือก (${selectedColorCount} เฉดสี)` : 'จำลองสีผมอัจฉริยะ')}
              </Button>
              {hairColorErrorMessage && (
                <Typography sx={{ color: '#fda4af', fontSize: '0.75rem', mt: 1.5, textAlign: 'center', fontWeight: 500 }}>{hairColorErrorMessage}</Typography>
              )}
            </Box>


          </Box>
        </Box>
      </Box>
      {qrModal}
    </AppWrapper>
  );
}

function CameraCaptureStep({
  videoRef,
  canvasRef,
  onClose,
  onCapture,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onClose: () => void;
  onCapture: () => void;
}) {
  const glass = {
    background: 'rgba(255,255,255,0.13)',
    backdropFilter: 'blur(22px)',
    WebkitBackdropFilter: 'blur(22px)',
    border: '1px solid rgba(255,255,255,0.22)',
  } as const;

  return (
    <Box sx={{ height: '100vh', width: '100vw', bgcolor: 'black', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          height: '100vh',
          maxWidth: { sm: 480 },
          overflow: 'hidden',
        }}
      >
        <Box
          component="video"
          ref={videoRef}
          autoPlay
          playsInline
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -58%)',
            width: { xs: '72%', sm: 300 },
            aspectRatio: '1/1',
            border: '2px dashed rgba(255,255,255,0.35)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <Typography
          sx={{
            position: 'absolute',
            bottom: 140,
            width: '100%',
            textAlign: 'center',
            color: 'white',
            opacity: 0.7,
            fontSize: '0.82rem',
          }}
        >
          จัดใบหน้าให้อยู่ในกรอบวงกลม
        </Typography>

        <Box
          component="button"
          onClick={onClose}
          sx={{ ...glass, position: 'absolute', top: { xs: 20, sm: 24 }, right: { xs: 16, sm: 20 }, borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}
        >
          <CloseCircle size={22} color="white" />
        </Box>

        <Box
          sx={{ position: 'absolute', bottom: { xs: 36, sm: 40 }, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}
        >
          <Box
            onClick={onCapture}
            sx={{ width: 76, height: 76, borderRadius: '50%', border: '4px solid white', p: '5px', cursor: 'pointer', '&:active': { transform: 'scale(0.9)' }, transition: 'transform 0.12s' }}
          >
            <Box sx={{ width: '100%', height: '100%', bgcolor: 'white', borderRadius: '50%' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function SalonExperience() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  const [mode, setMode] = useState<FlowMode | null>(null);
  const [step, setStep] = useState<FlowStep>('landing');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedStyleIds, setSelectedStyleIds] = useState<string[]>([]);
  const [analysisState, setAnalysisState] = useState<{ imageUrl: string; isGenerating: boolean; processingMessage: string; errorMessage: string | null; startedAt: number | null; lastDurationMs: number | null; timingBreakdown: GenerationTimingBreakdown | null }>({
    imageUrl: '',
    isGenerating: false,
    processingMessage: '',
    errorMessage: null,
    startedAt: null,
    lastDurationMs: null,
    timingBreakdown: null,
  });
  const [analysisCache, setAnalysisCache] = useState<Record<string, { imageUrl: string; timing: GenerationTimingBreakdown | null }>>({});
  const [tryOnState, setTryOnState] = useState<{ results: TryOnResult[]; isGenerating: boolean; processingMessage: string; errorMessage: string | null; selectedResultStyleId: string | null; selectedColorIds: string[]; activeColorId: string; colorPreviews: Record<string, string>; isColorGenerating: boolean; colorErrorMessage: string | null; startedAt: number | null; lastDurationMs: number | null }>({
    results: [],
    isGenerating: false,
    processingMessage: '',
    errorMessage: null,
    selectedResultStyleId: null,
    selectedColorIds: [],
    activeColorId: '',
    colorPreviews: {},
    isColorGenerating: false,
    colorErrorMessage: null,
    startedAt: null,
    lastDurationMs: null,
  });

  const [now, setNow] = useState(() => Date.now());

  const galleryInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (!analysisState.isGenerating && !tryOnState.isGenerating) {
      return;
    }

    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [analysisState.isGenerating, tryOnState.isGenerating]);

  const resetAnalysisState = () => {
    setAnalysisState({
      imageUrl: '',
      isGenerating: false,
      processingMessage: '',
      errorMessage: null,
      startedAt: null,
      lastDurationMs: null,
      timingBreakdown: null,
    });
  };

  const resetTryOnState = () => {
    setTryOnState({
      results: [],
      isGenerating: false,
      processingMessage: '',
      errorMessage: null,
      selectedResultStyleId: null,
      selectedColorIds: [],
      activeColorId: '',
      colorPreviews: {},
      isColorGenerating: false,
      colorErrorMessage: null,
      startedAt: null,
      lastDurationMs: null,
    });
  };

  const setModeError = (nextError: string | null) => {
    if (mode === 'analysis') {
      setAnalysisState((previous) => ({ ...previous, errorMessage: nextError }));
      return;
    }

    if (mode === 'try-on') {
      setTryOnState((previous) => ({ ...previous, errorMessage: nextError }));
    }
  };

  const resetFlow = (nextMode: FlowMode | null = null) => {
    stopCamera();
    setMode(nextMode);
    setStep(nextMode ? 'upload' : 'landing');
    setSelectedImage(null);
    setSessionId(null);
    setSelectedStyleIds([]);
    resetAnalysisState();
    resetTryOnState();
  };

  const handleModeSelect = (nextMode: FlowMode) => {
    resetFlow(nextMode);
  };

  const activeSalonId = (session?.user as any)?.id || process.env.NEXT_PUBLIC_SALON_ID;

  const initSession = async (base64Image: string) => {
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalImageBase64: base64Image,
          salonId: activeSalonId 
        }),
      });
      const data = await res.json();
      if (data.ok && data.sessionId) {
        setSessionId(data.sessionId);
      }
    } catch (err) {
      console.error('Failed to init session', err);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        return;
      }

      try {
        const optimizedImage = await optimizeImageDataUrl(result);
        setSelectedImage(optimizedImage);
        initSession(optimizedImage);
      } catch (error) {
        console.error('Image optimization error:', error);
        setSelectedImage(result);
        initSession(result);
      }

      resetAnalysisState();
      resetTryOnState();
      setSelectedStyleIds([]);
      setStep('preview');
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const startCamera = async () => {
    setModeError(null);
    setStep('camera');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1080 }, height: { ideal: 1080 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setModeError('ไม่สามารถเปิดกล้องได้ ลองเลือกจากคลังรูปภาพแทน');
      setStep('upload');
      galleryInputRef.current?.click();
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', INPUT_IMAGE_QUALITY);

    try {
      const optimizedImage = await optimizeImageDataUrl(dataUrl);
      setSelectedImage(optimizedImage);
      initSession(optimizedImage);
    } catch (error) {
      console.error('Captured image optimization error:', error);
      setSelectedImage(dataUrl);
      initSession(dataUrl);
    }

    resetAnalysisState();
    resetTryOnState();
    setSelectedStyleIds([]);
    stopCamera();
    setStep('preview');
  };

  const handleAnalysis = async (options: { force?: boolean } = {}) => {
    if (!selectedImage) {
      return;
    }

    // Check cache
    if (!options.force && analysisCache[selectedImage]) {
      const cached = analysisCache[selectedImage];
      setAnalysisState((previous) => ({
        ...previous,
        imageUrl: cached.imageUrl,
        timingBreakdown: cached.timing,
        isGenerating: false,
        errorMessage: null,
      }));
      setStep('result');
      return;
    }

    setAnalysisState((previous) => ({
      ...previous,
      imageUrl: '',
      isGenerating: true,
      processingMessage: 'กำลังสร้าง infographic วิเคราะห์ทรงผม รูปแบบ สี และคำแนะนำ',
      errorMessage: null,
      startedAt: Date.now(),
      lastDurationMs: null,
      timingBreakdown: null,
    }));
    setStep('processing');

    try {
      const { result, timing } = await subscribeAnalysisEdit(
        {
          image_urls: [selectedImage],
          prompt: analysisPrompt,
          quality: 'medium',
          image_size: 'portrait_4_3',
          output_format: 'png',
          num_images: 1,
        },
        {
          onStatusChange: (status) => {
            setAnalysisState((previous) => ({
              ...previous,
              processingMessage:
                status.phase === 'submitting'
                  ? 'กำลังส่งรูปเข้า AI'
                  : status.phase === 'queued'
                    ? status.queuePosition
                      ? `กำลังรอคิว AI ลำดับ ${status.queuePosition}`
                      : 'กำลังรอคิว AI'
                    : status.phase === 'generating'
                      ? 'AI เริ่มสร้าง infographic แล้ว'
                      : previous.processingMessage,
            }));
          },
        },
      );

      const imageUrl = result.data.images[0]?.url;
      if (imageUrl) {
        // Save to cache
        setAnalysisCache(prev => ({
          ...prev,
          [selectedImage]: { imageUrl, timing }
        }));

        setAnalysisState((previous) => ({ ...previous, imageUrl, timingBreakdown: timing }));
        setStep('result');

        // Log for cost tracking
        logAiGeneration({
          sessionId: sessionId ?? undefined,
          salonId: activeSalonId,
          generationType: 'analysis',
          modelId: 'openai/gpt-image-2/edit',
          outputImageUrl: imageUrl,
          durationMs: timing.totalMs ?? undefined,
          queueMs: timing.queueMs ?? undefined,
          inferenceMs: timing.providerInferenceMs ?? undefined,
          success: true,
        });
      } else {
        setAnalysisState((previous) => ({ ...previous, errorMessage: 'วิเคราะห์รูปภาพไม่สำเร็จ ลองใหม่อีกครั้ง', timingBreakdown: timing }));
        setStep('preview');
        logAiGeneration({ sessionId: sessionId ?? undefined, salonId: activeSalonId, generationType: 'analysis', modelId: 'openai/gpt-image-2/edit', success: false, errorMessage: 'No image in response' });
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisState((previous) => ({ ...previous, errorMessage: 'วิเคราะห์รูปภาพไม่สำเร็จ ลองใหม่อีกครั้ง' }));
      setStep('preview');
    } finally {
      setAnalysisState((previous) => ({
        ...previous,
        isGenerating: false,
        processingMessage: '',
        lastDurationMs: previous.timingBreakdown?.totalMs ?? (previous.startedAt ? Date.now() - previous.startedAt : previous.lastDurationMs),
        startedAt: null,
      }));
    }
  };

  const handleRegenAnalysis = () => {
    handleAnalysis({ force: true });
  };

  const toggleStyle = (styleId: string) => {
    setSelectedStyleIds((previous) => {
      if (previous.includes(styleId)) {
        // deselect
        return previous.filter((id) => id !== styleId);
      }
      if (previous.length >= MAX_STYLES) {
        // already full — ignore
        return previous;
      }
      return [...previous, styleId];
    });
  };

  const handleTryOn = async () => {
    if (!selectedImage || selectedStyleIds.length === 0) {
      return;
    }

    setTryOnState((previous) => ({
      ...previous,
      results: [],
      isGenerating: true,
      processingMessage: '',
      errorMessage: null,
      selectedResultStyleId: null,
      colorPreviewUrl: '',
      isColorGenerating: false,
      colorErrorMessage: null,
      startedAt: Date.now(),
      lastDurationMs: null,
    }));
    setStep('processing');

    const selectedStyles = hairstyleOptions.filter((style) => selectedStyleIds.includes(style.id));
    let completedCount = 0;
    setTryOnState((previous) => ({
      ...previous,
      processingMessage: `กำลังสร้างลุค 0/${selectedStyles.length} พร้อมกันสูงสุด ${Math.min(TRY_ON_CONCURRENCY, selectedStyles.length)} ทรง`,
    }));

    const settledResults = await mapWithConcurrency(selectedStyles, TRY_ON_CONCURRENCY, async (style) => {
      try {
        const result = await subscribeTryOnEdit({
          image_urls: [selectedImage],
          prompt: buildTryOnPrompt(style),
          quality: 'medium',
          image_size: 'portrait_4_3',
          output_format: 'png',
          num_images: 1,
        });

        const imageUrl = result.result.data.images[0]?.url;
        if (imageUrl) {
          // Log for cost tracking
          logAiGeneration({
            sessionId: sessionId ?? undefined,
            salonId: activeSalonId,
            generationType: 'try-on',
            styleId: style.id,
            styleLabel: style.label,
            modelId: 'openai/gpt-image-2/edit',
            outputImageUrl: imageUrl,
            durationMs: result.timing.totalMs ?? undefined,
            queueMs: result.timing.queueMs ?? undefined,
            inferenceMs: result.timing.providerInferenceMs ?? undefined,
            success: true,
          });
          return {
            ok: true as const,
            result: {
              styleId: style.id,
              styleLabel: style.label,
              imageUrl,
            },
          };
        }
        logAiGeneration({ sessionId: sessionId ?? undefined, salonId: activeSalonId, generationType: 'try-on', styleId: style.id, styleLabel: style.label, modelId: 'openai/gpt-image-2/edit', success: false, errorMessage: 'No image in response' });
        return { ok: false as const };
      } catch (error) {
        console.error(`Try-on error for ${style.id}:`, error);
        logAiGeneration({ sessionId: sessionId ?? undefined, salonId: activeSalonId, generationType: 'try-on', styleId: style.id, styleLabel: style.label, modelId: 'openai/gpt-image-2/edit', success: false, errorMessage: String(error) });
        return { ok: false as const };
      } finally {
        completedCount += 1;
        setTryOnState((previous) => ({
          ...previous,
          processingMessage: `กำลังสร้างลุค ${completedCount}/${selectedStyles.length}`,
        }));
      }
    });

    const nextResults = settledResults.flatMap((entry) => (entry.ok ? [entry.result] : []));
    const failedCount = settledResults.length - nextResults.length;

    setTryOnState((previous) => ({
      ...previous,
      results: nextResults,
      selectedResultStyleId: nextResults[0]?.styleId ?? null,
      colorPreviewUrl: '',
      colorErrorMessage: null,
    }));
    if (failedCount > 0) {
      setTryOnState((previous) => ({ ...previous, errorMessage: 'บางทรงผมสร้างไม่สำเร็จ แต่ผลลัพธ์ที่สำเร็จยังแสดงให้ดูได้' }));
    }

    if (nextResults.length === 0) {
      setTryOnState((previous) => ({ ...previous, errorMessage: 'สร้างภาพทรงผมไม่สำเร็จ ลองเลือกทรงอื่นหรือใช้รูปใหม่อีกครั้ง' }));
      setStep('styles');
    } else {
      setStep('result');
    }

    setTryOnState((previous) => ({
      ...previous,
      isGenerating: false,
      processingMessage: '',
      lastDurationMs: previous.startedAt ? Date.now() - previous.startedAt : previous.lastDurationMs,
      startedAt: null,
    }));
  };

  const handleSelectTryOnStyle = (styleId: string) => {
    setTryOnState((previous) => ({
      ...previous,
      selectedResultStyleId: styleId,
      colorErrorMessage: null,
    }));
  };

  const handleSelectHairColor = (colorId: string, options: { toggle?: boolean } = { toggle: true }) => {
    setTryOnState((previous) => {
      const isSelected = previous.selectedColorIds.includes(colorId);
      let nextSelected: string[];
      let nextActive = previous.activeColorId;

      if (isSelected) {
        if (options.toggle) {
          nextSelected = previous.selectedColorIds.filter((id) => id !== colorId);
          // If we deselected the currently active color, switch to the last selected color
          if (nextActive === colorId) {
            nextActive = nextSelected.length > 0 ? nextSelected[nextSelected.length - 1] : '';
          }
        } else {
          // Just make it active if it's already selected
          nextSelected = previous.selectedColorIds;
          nextActive = colorId;
        }
      } else {
        nextSelected = [...previous.selectedColorIds, colorId];
        // Selecting a new color always makes it active
        nextActive = colorId;
      }

      return {
        ...previous,
        selectedColorIds: nextSelected,
        activeColorId: nextActive,
        colorErrorMessage: null,
      };
    });
  };

  const handleClearColorCache = () => {
    setTryOnState((previous) => ({ ...previous, colorPreviews: {}, colorErrorMessage: null }));
  };

  const handleGenerateHairColor = async () => {
    const selectedResult = tryOnState.results.find((result) => result.styleId === tryOnState.selectedResultStyleId) ?? tryOnState.results[0];
    const colorsToGenerate = hairColorOptions.filter((color) => tryOnState.selectedColorIds.includes(color.id));

    if (!selectedResult || colorsToGenerate.length === 0) {
      setTryOnState((previous) => ({ ...previous, colorErrorMessage: 'กรุณาเลือกทรงผมและสีผมอย่างน้อย 1 สี' }));
      return;
    }

    setTryOnState((previous) => ({
      ...previous,
      isColorGenerating: true,
      colorErrorMessage: null,
      selectedResultStyleId: selectedResult.styleId,
    }));

    try {
      // Create a list of all generation tasks: (Style + Color) and (Original + Color)
      const tasks: { styleId: string; styleLabel: string; imageUrl: string; color: HairColorOption }[] = [];

      colorsToGenerate.forEach(color => {
        // Task for the current selected style
        tasks.push({
          styleId: selectedResult.styleId,
          styleLabel: selectedResult.styleLabel,
          imageUrl: selectedResult.imageUrl,
          color
        });

        // If we are in styles mode, also add task for Original Hair recoloring
        if (mode === 'styles') {
          tasks.push({
            styleId: 'original',
            styleLabel: 'ทรงผมเดิม',
            imageUrl: selectedImage!,
            color
          });
        }
      });

      // Generate with concurrency
      await mapWithConcurrency(tasks, 2, async (task) => {
        const cacheKey = `${task.styleId}_${task.color.id}`;
        if (tryOnState.colorPreviews[cacheKey]) return;

        const result = await subscribeTryOnEdit({
          image_urls: [task.imageUrl],
          prompt: buildHairColorPrompt(task.styleLabel, task.color),
          quality: 'medium',
          image_size: 'portrait_4_3',
          output_format: 'png',
          num_images: 1,
        });

        const imageUrl = result.result.data.images[0]?.url;
        if (imageUrl) {
          setTryOnState((previous) => ({
            ...previous,
            colorPreviews: { ...previous.colorPreviews, [cacheKey]: imageUrl },
          }));
          // Log for cost tracking
          logAiGeneration({
            sessionId: sessionId ?? undefined,
            salonId: activeSalonId,
            generationType: 'hair-color',
            styleId: task.styleId,
            styleLabel: task.styleLabel,
            colorId: task.color.id,
            colorLabel: task.color.label,
            modelId: 'openai/gpt-image-2/edit',
            outputImageUrl: imageUrl,
            durationMs: result.timing.totalMs ?? undefined,
            queueMs: result.timing.queueMs ?? undefined,
            inferenceMs: result.timing.providerInferenceMs ?? undefined,
            success: true,
          });
        } else {
          logAiGeneration({ sessionId: sessionId ?? undefined, salonId: activeSalonId, generationType: 'hair-color', styleId: task.styleId, styleLabel: task.styleLabel, colorId: task.color.id, colorLabel: task.color.label, modelId: 'openai/gpt-image-2/edit', success: false, errorMessage: 'No image in response' });
        }
      });
    } catch (error) {
      console.error('Try-on multi-hair color error:', error);
      setTryOnState((previous) => ({ ...previous, colorErrorMessage: 'สร้างพรีวิวบางสีไม่สำเร็จ ลองใหม่อีกครั้ง' }));
    } finally {
      setTryOnState((previous) => ({ ...previous, isColorGenerating: false }));
    }
  };

  const activeErrorMessage = mode === 'analysis' ? analysisState.errorMessage : tryOnState.errorMessage;
  const activeProcessingMessage = mode === 'analysis' ? analysisState.processingMessage : tryOnState.processingMessage;
  const activeIsGenerating = mode === 'analysis' ? analysisState.isGenerating : tryOnState.isGenerating;
  const activeStartedAt = mode === 'analysis' ? analysisState.startedAt : tryOnState.startedAt;
  const activeElapsedLabel = activeStartedAt ? formatElapsedMs(now - activeStartedAt) : formatElapsedMs(0);

  if (status === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", bgcolor: "#1a1114" }}>
        <Typography color="white">กำลังโหลดข้อมูลร้าน...</Typography>
      </Box>
    );
  }

  if (!mode || step === 'landing') {
    return <ModeSelectionStep onSelect={handleModeSelect} salonName={(session?.user as any)?.salonName} />;
  }

  if (step === 'upload') {
    return (
      <UploadStep
        mode={mode}
        errorMessage={activeErrorMessage}
        onGalleryClick={() => galleryInputRef.current?.click()}
        onStartCamera={startCamera}
        onBack={() => resetFlow(null)}
        inputRef={galleryInputRef}
        onFileChange={handleFileChange}
      />
    );
  }

  if (step === 'camera') {
    return (
      <CameraCaptureStep
        videoRef={videoRef}
        canvasRef={canvasRef}
        onClose={() => {
          stopCamera();
          setStep('upload');
        }}
        onCapture={capturePhoto}
      />
    );
  }

  if (step === 'preview' && selectedImage) {
    return (
      <PreviewStep
        mode={mode}
        selectedImage={selectedImage}
        errorMessage={activeErrorMessage}
        onPrimary={() => {
          if (mode === 'analysis') {
            handleAnalysis();
          } else if (mode === 'recolor') {
            setTryOnState((previous) => ({
              ...previous,
              results: [{ styleId: 'original', styleLabel: 'ทรงผมเดิม', imageUrl: selectedImage! }],
              selectedResultStyleId: 'original',
              errorMessage: null,
            }));
            setStep('result');
          } else {
            setTryOnState((previous) => ({ ...previous, errorMessage: null }));
            setStep('styles');
          }
        }}
        onRetake={startCamera}
        onBack={() => setStep('upload')}
      />
    );
  }

  if (step === 'styles') {
    return (
      <StylePickerStep
        options={hairstyleOptions}
        selectedIds={selectedStyleIds}
        onToggle={toggleStyle}
        onGenerate={handleTryOn}
        onBack={() => setStep('preview')}
        selectedImage={selectedImage!}
        maxStyles={MAX_STYLES}
      />
    );
  }

  if (step === 'processing' && activeIsGenerating) {
    return <ProcessingStep mode={mode} message={activeProcessingMessage} elapsedLabel={activeElapsedLabel} />;
  }

  if (step === 'result' && selectedImage) {
    const activeStyleId = tryOnState.selectedResultStyleId ?? tryOnState.results[0]?.styleId ?? '';
    const activeCacheKey = `${activeStyleId}_${tryOnState.activeColorId}`;
    const derivedColorPreviewUrl = tryOnState.colorPreviews[activeCacheKey] ?? '';
    const colorCacheCount = Object.keys(tryOnState.colorPreviews).length;

    return (
      <ResultStep
        mode={mode}
        selectedImage={selectedImage}
        analysisImageUrl={analysisState.imageUrl}
        tryOnResults={tryOnState.results}
        errorMessage={activeErrorMessage}
        selectedTryOnStyleId={tryOnState.selectedResultStyleId}
        onSelectTryOnStyle={handleSelectTryOnStyle}
        selectedHairColorIds={tryOnState.selectedColorIds}
        activeColorId={tryOnState.activeColorId}
        onSelectHairColor={handleSelectHairColor}
        onGenerateHairColor={handleGenerateHairColor}
        hairColorPreviewUrl={derivedColorPreviewUrl}
        isGeneratingHairColor={tryOnState.isColorGenerating}
        hairColorErrorMessage={tryOnState.colorErrorMessage}
        generationDurationMs={mode === 'analysis' ? analysisState.lastDurationMs : tryOnState.lastDurationMs}
        generationTimingBreakdown={mode === 'analysis' ? analysisState.timingBreakdown : null}
        colorCacheCount={colorCacheCount}
        onClearColorCache={handleClearColorCache}
        onRestart={() => resetFlow(null)}
        onBackToUpload={() => resetFlow(mode)}
        onRegenAnalysis={handleRegenAnalysis}
        colorPreviews={tryOnState.colorPreviews}
      />
    );
  }

  return <ModeSelectionStep onSelect={handleModeSelect} />;
}