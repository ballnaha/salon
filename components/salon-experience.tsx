'use client';

import { ChangeEvent, ReactNode, useEffect, useRef, useState } from 'react';
import { Box, Button, Chip, IconButton, Stack, Typography, keyframes } from '@mui/material';
import { ArrowRight, Camera, CloseCircle, FolderOpen, Magicpen, Refresh, TickCircle } from 'iconsax-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, FreeMode } from 'swiper/modules';
import 'swiper/swiper-bundle.css';
import { subscribeAnalysisEdit, subscribeTryOnEdit } from '@/components/salon-experience-fal';
import { analysisPrompt, buildHairColorPrompt, buildTryOnPrompt } from '@/components/salon-experience-prompts';
import { hairColorOptions, hairstyleOptions } from '@/components/salon-experience-styles';
import type { FlowMode, FlowStep, GenerationTimingBreakdown, HairColorOption, HairstyleOption, TryOnResult } from '@/components/salon-experience-types';

const pulse = keyframes`
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.08); opacity: 0.3; }
  100% { transform: scale(1); opacity: 0.6; }
`;

const shellBackground = 'radial-gradient(circle at center, #2d1b22 0%, #1a1114 100%)';
const defaultHairColorId = hairColorOptions[0]?.id ?? '';
const MAX_INPUT_IMAGE_DIMENSION = 1280;
const INPUT_IMAGE_QUALITY = 0.86;
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

function AppWrapper({ children, bgcolor = 'white' }: { children: ReactNode; bgcolor?: string }) {
  return (
    <Box
      sx={{
        height: '100vh',
        width: '100vw',
        bgcolor,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Box
        sx={{
          height: '100vh',
          width: '100%',
          position: 'relative',
          bgcolor,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

function ModeSelectionStep({ onSelect }: { onSelect: (mode: FlowMode) => void }) {
  return (
    <AppWrapper>
      {/* ── MOBILE LAYOUT ── */}
      <Box sx={{ display: { xs: 'flex', sm: 'none' }, height: '100vh', width: '100%', flexDirection: 'column' }}>
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
              เริ่มต้นด้วยอะไร?
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1.5} sx={{ width: '100%' }}>
            {/* AI Analysis tile */}
            <Box
              component="button"
              onClick={() => onSelect('analysis')}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                py: 3.5,
                px: 1,
                bgcolor: '#0f172a',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.15s, opacity 0.15s',
                '&:active': { transform: 'scale(0.96)', opacity: 0.85 },
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d993a4',
                }}
              >
                <Magicpen size={26} variant="Bold" color="currentColor" />
              </Box>
              <Stack spacing={0.25} sx={{ alignItems: 'center' }}>
                <Typography sx={{ color: 'white', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1 }}>
                  AI Analysis
                </Typography>
                <Typography sx={{ color: 'rgba(255,255,255,0.48)', fontSize: '0.7rem', lineHeight: 1.4, textAlign: 'center' }}>
                  วิเคราะห์ทรงผม
                </Typography>
              </Stack>
            </Box>

            {/* Try-On tile */}
            <Box
              component="button"
              onClick={() => onSelect('try-on')}
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1.5,
                py: 3.5,
                px: 1,
                bgcolor: '#d993a4',
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.15s, opacity 0.15s',
                '&:active': { transform: 'scale(0.96)', opacity: 0.85 },
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: 'rgba(255,255,255,0.22)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#1a1114',
                }}
              >
                <Camera size={26} variant="Bold" color="currentColor" />
              </Box>
              <Stack spacing={0.25} sx={{ alignItems: 'center' }}>
                <Typography sx={{ color: '#1a1114', fontWeight: 800, fontSize: '0.95rem', lineHeight: 1 }}>
                  Try-On
                </Typography>
                <Typography sx={{ color: 'rgba(26,17,20,0.55)', fontSize: '0.7rem', lineHeight: 1.4, textAlign: 'center' }}>
                  ลองทรงผม
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Box>
      </Box>

      {/* ── DESKTOP LAYOUT ── */}
      <Box sx={{ display: { xs: 'none', sm: 'flex' }, width: '100%', height: '100%' }}>
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
            <Stack spacing={1.5}>
              <Typography variant="overline" sx={{ color: '#d993a4', letterSpacing: 4, fontWeight: 800 }}>
                CHOOSE YOUR FLOW
              </Typography>
              <Typography variant="h4" sx={{ color: '#0f172a', fontWeight: 900, lineHeight: 1.1 }}>
                เริ่มจากสิ่งที่ลูกค้าต้องการก่อน
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b', lineHeight: 1.7 }}>
                แยกเป็น 2 โหมดชัดเจน: ให้ AI วิเคราะห์ความเหมาะสม หรือให้ลูกค้าเลือกทรงยอดนิยมแล้วลองแบบจริง
              </Typography>
            </Stack>

            <Button
              onClick={() => onSelect('analysis')}
              sx={{ justifyContent: 'space-between', alignItems: 'stretch', p: 0, borderRadius: 4, overflow: 'hidden', textTransform: 'none', border: '1px solid rgba(15,23,42,0.08)' }}
            >
              <Stack direction="row" sx={{ width: '100%' }}>
                <Stack spacing={1.25} sx={{ p: 3, flex: 1, alignItems: 'flex-start' }}>
                  <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 800 }}>AI Analysis</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'left', lineHeight: 1.7 }}>
                    วิเคราะห์โครงหน้า ทรงผมที่เหมาะ ทรงที่ควรเลี่ยง และสีผมที่แนะนำจากรูปของลูกค้า
                  </Typography>
                  <Chip label="Vision + text recommendation" sx={{ bgcolor: '#f8e7ec', color: '#9f445e', fontWeight: 700 }} />
                </Stack>
                <Box sx={{ width: 88, bgcolor: '#111827', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Magicpen size={28} variant="Bold" />
                </Box>
              </Stack>
            </Button>

            <Button
              onClick={() => onSelect('try-on')}
              sx={{ justifyContent: 'space-between', alignItems: 'stretch', p: 0, borderRadius: 4, overflow: 'hidden', textTransform: 'none', border: '1px solid rgba(15,23,42,0.08)' }}
            >
              <Stack direction="row" sx={{ width: '100%' }}>
                <Stack spacing={1.25} sx={{ p: 3, flex: 1, alignItems: 'flex-start' }}>
                  <Typography variant="h6" sx={{ color: '#0f172a', fontWeight: 800 }}>Try-On</Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', textAlign: 'left', lineHeight: 1.7 }}>
                    เลือกทรงผมยอดนิยมของร้าน แล้วให้ AI จับคู่กับรูปจริงของลูกค้าเพื่อดูผลลัพธ์ก่อนทำ
                  </Typography>
                  <Chip label="Multi-style image edit" sx={{ bgcolor: '#e8f5ee', color: '#1c7c54', fontWeight: 700 }} />
                </Stack>
                <Box sx={{ width: 88, bgcolor: '#d993a4', color: '#1a1114', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ArrowRight size={28} variant="Linear" />
                </Box>
              </Stack>
            </Button>
          </Stack>
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
        {/* Info panel */}
        <Box sx={{ ...glass, borderRadius: '20px 20px 16px 16px', p: { xs: 2, sm: 2.5 }, mb: 1 }}>
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
            <Box sx={{ ...glass, borderRadius: 3, p: 1.5, display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.5 }}>
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2,
                  flexShrink: 0,
                  background: firstSelectedInCategory.category === 'male'
                    ? 'linear-gradient(135deg, rgba(125,211,252,0.5), rgba(56,189,248,0.3))'
                    : 'linear-gradient(135deg, rgba(249,168,212,0.5), rgba(217,147,164,0.3))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '1.2rem' }}>
                  {firstSelectedInCategory.label[0]}
                </Typography>
              </Box>
              <Stack spacing={0.15} sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ color: 'rgba(249,168,212,1)', fontWeight: 700, fontSize: '0.68rem' }}>
                  ทรงที่เลือก
                </Typography>
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

        {/* Horizontal scroll thumbnails — Swiper carousel */}
        {showThumbnails && (
        <Box sx={{ mb: 1, '.swiper-pagination': { position: 'static', mt: 0.75 }, '.swiper-pagination-bullet': { bgcolor: 'rgba(255,255,255,0.35)', opacity: 1, width: 6, height: 6 }, '.swiper-pagination-bullet-active': { bgcolor: '#f9a8d4', width: 16, borderRadius: 99 } }}>
          <Swiper
            modules={[Pagination, FreeMode]}
            freeMode
            slidesPerView="auto"
            spaceBetween={10}
            pagination={{ clickable: true, dynamicBullets: false }}
            style={{ paddingBottom: 28, paddingLeft: 4, paddingRight: 4 }}
          >
            {filtered.map((style) => {
              const selected = currentSelected.includes(style.id);
              return (
                <SwiperSlide key={style.id} style={{ width: 'auto' }}>
                  <Box
                    component="button"
                    onClick={() => onToggle(style.id)}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 0.5,
                      background: 'none',
                      border: 'none',
                      cursor: selected || !isFull ? 'pointer' : 'not-allowed',
                      p: 0,
                      width: 72,
                      opacity: !selected && isFull ? 0.38 : 1,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <Box
                      sx={{
                        width: 62,
                        height: 62,
                        borderRadius: '50%',
                        border: selected ? '2.5px solid #f9a8d4' : '2.5px solid rgba(255,255,255,0.28)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        transform: selected ? 'scale(1.08)' : 'scale(1)',
                        background: selected
                          ? (style.category === 'male'
                            ? 'linear-gradient(135deg, rgba(125,211,252,0.6), rgba(56,189,248,0.45))'
                            : 'linear-gradient(135deg, rgba(249,168,212,0.65), rgba(217,147,164,0.5))')
                          : 'rgba(255,255,255,0.13)',
                        backdropFilter: 'blur(22px)',
                        WebkitBackdropFilter: 'blur(22px)',
                        flexShrink: 0,
                      }}
                    >
                      <Typography sx={{ color: 'white', fontWeight: 900, fontSize: '1.1rem', textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>
                        {style.label[0]}
                      </Typography>
                    </Box>
                    {/* Fixed-height label: 2 lines × 0.62rem × 1.3 ≈ 26px */}
                    <Box sx={{ height: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
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
        )}

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
    </Box>
  );
}

function ProcessingStep({ mode, message, elapsedLabel }: { mode: FlowMode; message: string; elapsedLabel: string }) {
  return (
    <AppWrapper bgcolor="#1a1114">
      <Box sx={{ height: '100%', width: '100%', background: shellBackground, display: 'flex', alignItems: 'center', justifyContent: 'center', px: 4 }}>
        <Stack spacing={2.5} sx={{ alignItems: 'center', textAlign: 'center', maxWidth: 380 }}>
          <Box sx={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Box sx={{ position: 'absolute', width: 112, height: 112, border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%', animation: `${pulse} 3s infinite ease-in-out` }} />
            <Box sx={{ width: 88, height: 88, borderRadius: '50%', bgcolor: 'rgba(217,147,164,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d993a4' }}>
              <Magicpen size={38} variant="Bold" color="currentColor" />
            </Box>
          </Box>
          <Typography variant="h5" sx={{ color: 'white', fontWeight: 800 }}>
            {mode === 'analysis' ? 'AI กำลังวิเคราะห์' : 'AI กำลังสร้างทรงผม'}
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.68)', lineHeight: 1.8 }}>
            {message}
          </Typography>
          <Typography sx={{ color: '#fbcfe8', fontSize: '0.86rem', fontWeight: 700 }}>
            ใช้เวลาแล้ว {elapsedLabel}
          </Typography>
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
  selectedHairColorId,
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
}: {
  mode: FlowMode;
  selectedImage: string;
  analysisImageUrl: string;
  tryOnResults: TryOnResult[];
  errorMessage: string | null;
  selectedTryOnStyleId: string | null;
  onSelectTryOnStyle: (styleId: string) => void;
  selectedHairColorId: string;
  onSelectHairColor: (colorId: string) => void;
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
}) {
  const hasTryOnResults = tryOnResults.length > 0;
  const selectedTryOnResult = tryOnResults.find((result) => result.styleId === selectedTryOnStyleId) ?? tryOnResults[0] ?? null;
  const selectedHairColor = hairColorOptions.find((color) => color.id === selectedHairColorId) ?? null;
  const currentCacheKey = selectedTryOnResult && selectedHairColor ? `${selectedTryOnResult.styleId}_${selectedHairColor.id}` : null;
  const isCurrentCached = currentCacheKey ? !!hairColorPreviewUrl : false;
  const generationTimeLabel = generationDurationMs ? formatElapsedMs(generationDurationMs) : null;
  const timingItems = [
    { label: 'ส่งคำขอ', value: formatTimingValue(generationTimingBreakdown?.submitMs ?? null) },
    { label: 'รอคิว', value: formatTimingValue(generationTimingBreakdown?.queueMs ?? null) },
    { label: 'สร้างภาพ', value: formatTimingValue(generationTimingBreakdown?.generationMs ?? null) },
    { label: 'Inference', value: formatTimingValue(generationTimingBreakdown?.providerInferenceMs ?? null) },
  ].filter((item): item is { label: string; value: string } => Boolean(item.value));

  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadAnalysisImage = async () => {
    if (!analysisImageUrl || isDownloading) {
      return;
    }

    const fallbackOpen = () => {
      window.open(analysisImageUrl, '_blank', 'noopener,noreferrer');
    };

    setIsDownloading(true);
    try {
      const response = await fetch(analysisImageUrl);
      if (!response.ok) {
        fallbackOpen();
        return;
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      anchor.href = objectUrl;
      anchor.download = `hair-analysis-${timestamp}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      fallbackOpen();
    } finally {
      setIsDownloading(false);
    }
  };

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
                onClick={handleDownloadAnalysisImage}
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
      </AppWrapper>
    );
  }

  return (
    <AppWrapper bgcolor="#0d0810">
      <Box sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Top bar ── */}
        <Stack direction="row"
          sx={{ px: { xs: 2, md: 3 }, py: { xs: 1.25, md: 1.75 }, flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'space-between' }}>
          <Stack spacing={0.35}>
            <Typography sx={{ color: 'white', fontWeight: 800, fontSize: { xs: '0.95rem', md: '1.1rem' } }}>
              ลองทรงผม
            </Typography>
            {generationTimeLabel && (
              <Typography sx={{ color: 'rgba(251,207,232,0.82)', fontSize: '0.75rem', fontWeight: 700 }}>
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
                      height: 22,
                      '& .MuiChip-label': { px: 0.9 },
                    }}
                  />
                ))}
              </Stack>
            )}
          </Stack>
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Button size="small" onClick={onBackToUpload}
              sx={{ color: 'rgba(255,255,255,0.55)', textTransform: 'none', fontWeight: 600, minHeight: 36, px: 1.5, borderRadius: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.07)' } }}>
              ใช้รูปใหม่
            </Button>
            <Button size="small" variant="contained" startIcon={<TickCircle variant="Bold" />} onClick={onRestart}
              sx={{ bgcolor: '#c2727f', color: 'white', borderRadius: 2, fontWeight: 700, textTransform: 'none', minHeight: 36, px: 1.75, '&:hover': { bgcolor: '#b5636f' } }}>
              เสร็จสิ้น
            </Button>
          </Stack>
        </Stack>

        {/* ── Body: scrollable ── */}
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: { xs: 'column', md: 'row' } }}>

          {/* ── Left / Top: Feature image + filmstrip ── */}
          <Box sx={{ position: 'relative', width: { xs: '100%', md: '56%' }, flexShrink: 0, bgcolor: '#0d0810', display: 'flex', flexDirection: 'column' }}>
            {/* Big featured image */}
            <Box sx={{ width: '100%', aspectRatio: { xs: '1/1', md: 'unset' }, flex: { md: 1 }, position: 'relative', minHeight: { md: 0 } }}>
              {selectedTryOnResult ? (
                <Box component="img"
                  src={hairColorPreviewUrl || selectedTryOnResult.imageUrl}
                  alt={selectedTryOnResult.styleLabel}
                  sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <Box sx={{ width: '100%', height: '100%', minHeight: { xs: 260, md: 320 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.85rem' }}>ยังไม่มีภาพ</Typography>
                </Box>
              )}
              {/* Gradient + label overlay */}
              {selectedTryOnResult && (
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)', px: 2, pt: 3, pb: 1.25 }}>
                  <Typography sx={{ color: 'white', fontWeight: 700, fontSize: { xs: '0.88rem', md: '0.95rem' } }}>
                    {selectedTryOnResult.styleLabel}
                    {hairColorPreviewUrl && selectedHairColor ? (
                      <Box component="span" sx={{ color: '#fbcfe8', ml: 0.75 }}>· {selectedHairColor.label}</Box>
                    ) : null}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Hairstyle filmstrip */}
            {hasTryOnResults && (
              <Stack direction="row" spacing={1.25}
                sx={{ overflowX: 'auto', flexShrink: 0, px: 1.75, py: 1.5, bgcolor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(10px)', '&::-webkit-scrollbar': { display: 'none' } }}>
                {tryOnResults.map((result) => {
                  const selected = result.styleId === selectedTryOnResult?.styleId;
                  return (
                    <Box key={result.styleId} component="button" onClick={() => onSelectTryOnStyle(result.styleId)}
                      sx={{ p: 0, border: 'none', background: 'none', cursor: 'pointer', flexShrink: 0, width: { xs: 64, md: 76 }, textAlign: 'center' }}>
                      <Box sx={{ borderRadius: 2, overflow: 'hidden', border: selected ? '2.5px solid #f9a8d4' : '2.5px solid transparent', transition: 'border-color 0.15s', boxShadow: selected ? '0 0 0 1px rgba(249,168,212,0.3)' : 'none' }}>
                        <Box sx={{ width: '100%', aspectRatio: '1/1', overflow: 'hidden' }}>
                          <Box component="img" src={result.imageUrl} alt={result.styleLabel} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </Box>
                      </Box>
                      <Typography sx={{ color: selected ? '#fbcfe8' : 'rgba(255,255,255,0.6)', fontSize: '0.6rem', fontWeight: selected ? 800 : 500, mt: 0.5, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {result.styleLabel}
                      </Typography>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>

          {/* ── Right / Bottom: Controls ── */}
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: '#1a1114' }}>

            {/* Color picker section */}
            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: { xs: 2, md: 2.5 }, pb: { xs: 2, md: 2.5 }, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1.25 }}>
                <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  เลือกสีผม
                </Typography>
                {colorCacheCount > 0 && (
                  <Button size="small" onClick={onClearColorCache}
                    sx={{ color: 'rgba(255,255,255,0.35)', textTransform: 'none', fontSize: '0.65rem', fontWeight: 600, minHeight: 0, py: 0.3, px: 0.9, borderRadius: 1.5, border: '1px solid rgba(255,255,255,0.1)', lineHeight: 1.3, '&:hover': { bgcolor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)' } }}>
                    ล้าง cache ({colorCacheCount})
                  </Button>
                )}
              </Stack>
              <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mb: 1.75 }}>
                {hairColorOptions.map((color) => {
                  const selected = color.id === selectedHairColorId;
                  return (
                    <Box key={color.id} component="button" onClick={() => onSelectHairColor(color.id)}
                      sx={{ display: 'flex', alignItems: 'center', gap: 0.6, px: 1.1, py: 0.5, borderRadius: 99, border: selected ? '1.5px solid #f9a8d4' : '1.5px solid rgba(255,255,255,0.13)', background: selected ? 'rgba(249,168,212,0.13)' : 'rgba(255,255,255,0.04)', color: selected ? '#fbcfe8' : 'rgba(255,255,255,0.75)', cursor: 'pointer', minHeight: 30, transition: 'all 0.15s' }}>
                      <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: color.swatch, border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: selected ? 700 : 500, lineHeight: 1 }}>{color.label}</Typography>
                    </Box>
                  );
                })}
              </Stack>
              <Button fullWidth variant="contained"
                onClick={onGenerateHairColor}
                disabled={!selectedTryOnResult || !selectedHairColor || isGeneratingHairColor}
                sx={{ bgcolor: isCurrentCached ? 'rgba(194,114,127,0.35)' : '#c2727f', color: 'white', borderRadius: 2.5, fontWeight: 800, textTransform: 'none', minHeight: 46, fontSize: '0.9rem', border: isCurrentCached ? '1px solid #c2727f' : 'none', '&:hover': { bgcolor: isCurrentCached ? 'rgba(194,114,127,0.5)' : '#b5636f' }, '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.2)' } }}>
                {isGeneratingHairColor ? 'กำลังสร้างพรีวิว...' : isCurrentCached ? '✓ มีผลแล้ว (แสดงใหม่)' : 'ดูตัวอย่างสีผม'}
              </Button>
              {hairColorErrorMessage && (
                <Typography sx={{ color: '#fda4af', fontSize: '0.75rem', mt: 1, lineHeight: 1.5 }}>{hairColorErrorMessage}</Typography>
              )}
            </Box>

            {/* Before / After comparison */}
            <Box sx={{ px: { xs: 2, md: 2.5 }, pt: { xs: 2, md: 2.5 }, pb: { xs: 2, md: 2.5 }, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.67rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', mb: 1.25 }}>
                เปรียบเทียบก่อน-หลัง
              </Typography>
              <Stack direction="row" spacing={1}>
                {/* Original photo */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', mb: 0.6 }}>ภาพลูกค้า</Typography>
                  <Box sx={{ width: '100%', aspectRatio: '1/1', borderRadius: 2.5, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)' }}>
                    <Box component="img" src={selectedImage} alt="Original" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </Box>
                </Box>
                {/* Try-on result */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', mb: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedTryOnResult ? selectedTryOnResult.styleLabel : 'ทรงผม'}
                  </Typography>
                  <Box sx={{ width: '100%', aspectRatio: '1/1', borderRadius: 2.5, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.03)' }}>
                    {selectedTryOnResult ? (
                      <Box component="img" src={selectedTryOnResult.imageUrl} alt="Hairstyle" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Typography sx={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.65rem', textAlign: 'center', px: 1 }}>เลือกทรงผม</Typography>
                    )}
                  </Box>
                </Box>
                {/* Color preview */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem', mb: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedHairColor ? selectedHairColor.label : 'สีผม'}
                  </Typography>
                  <Box sx={{ width: '100%', aspectRatio: '1/1', borderRadius: 2.5, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.09)', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(255,255,255,0.03)' }}>
                    {hairColorPreviewUrl ? (
                      <Box component="img" src={hairColorPreviewUrl} alt="Color preview" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Typography sx={{ color: 'rgba(255,255,255,0.22)', fontSize: '0.65rem', textAlign: 'center', px: 1 }}>ยังไม่มีพรีวิว</Typography>
                    )}
                  </Box>
                </Box>
              </Stack>
            </Box>

            {/* Error + note */}
            <Box sx={{ px: { xs: 2, md: 2.5 }, py: 1.5 }}>
              {errorMessage && (
                <Typography sx={{ color: '#fda4af', fontSize: '0.75rem', mb: 1, lineHeight: 1.5 }}>{errorMessage}</Typography>
              )}
              <Typography sx={{ color: 'rgba(255,255,255,0.25)', fontSize: '0.68rem', lineHeight: 1.6 }}>
                * AI เปลี่ยนเฉพาะสีผม คงทรงผมและลักษณะใบหน้าเดิม
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
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
  const [mode, setMode] = useState<FlowMode | null>(null);
  const [step, setStep] = useState<FlowStep>('landing');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
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
  const [tryOnState, setTryOnState] = useState<{ results: TryOnResult[]; isGenerating: boolean; processingMessage: string; errorMessage: string | null; selectedResultStyleId: string | null; selectedColorId: string; colorPreviews: Record<string, string>; isColorGenerating: boolean; colorErrorMessage: string | null; startedAt: number | null; lastDurationMs: number | null }>({
    results: [],
    isGenerating: false,
    processingMessage: '',
    errorMessage: null,
    selectedResultStyleId: null,
    selectedColorId: defaultHairColorId,
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
      selectedColorId: defaultHairColorId,
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
    setSelectedStyleIds([]);
    resetAnalysisState();
    resetTryOnState();
  };

  const handleModeSelect = (nextMode: FlowMode) => {
    resetFlow(nextMode);
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
      } catch (error) {
        console.error('Image optimization error:', error);
        setSelectedImage(result);
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
    } catch (error) {
      console.error('Captured image optimization error:', error);
      setSelectedImage(dataUrl);
    }

    resetAnalysisState();
    resetTryOnState();
    setSelectedStyleIds([]);
    stopCamera();
    setStep('preview');
  };

  const handleAnalysis = async () => {
    if (!selectedImage) {
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
        setAnalysisState((previous) => ({ ...previous, imageUrl, timingBreakdown: timing }));
        setStep('result');
      } else {
        setAnalysisState((previous) => ({ ...previous, errorMessage: 'วิเคราะห์รูปภาพไม่สำเร็จ ลองใหม่อีกครั้ง', timingBreakdown: timing }));
        setStep('preview');
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
          image_size: 'square_hd',
          output_format: 'png',
          num_images: 1,
        });

        const imageUrl = result.result.data.images[0]?.url;
        return imageUrl
          ? {
              ok: true as const,
              result: {
                styleId: style.id,
                styleLabel: style.label,
                imageUrl,
              },
            }
          : { ok: false as const };
      } catch (error) {
        console.error(`Try-on error for ${style.id}:`, error);
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

  const handleSelectHairColor = (colorId: string) => {
    setTryOnState((previous) => ({
      ...previous,
      selectedColorId: colorId,
      colorErrorMessage: null,
    }));
  };

  const handleClearColorCache = () => {
    setTryOnState((previous) => ({ ...previous, colorPreviews: {}, colorErrorMessage: null }));
  };

  const handleGenerateHairColor = async () => {
    const selectedResult = tryOnState.results.find((result) => result.styleId === tryOnState.selectedResultStyleId) ?? tryOnState.results[0];
    const selectedColor = hairColorOptions.find((color) => color.id === tryOnState.selectedColorId);

    if (!selectedResult || !selectedColor) {
      setTryOnState((previous) => ({ ...previous, colorErrorMessage: 'กรุณาเลือกทรงผมและสีผมก่อนสร้างพรีวิว' }));
      return;
    }

    const cacheKey = `${selectedResult.styleId}_${selectedColor.id}`;

    // ── Return cached result without calling AI ──
    if (tryOnState.colorPreviews[cacheKey]) {
      setTryOnState((previous) => ({
        ...previous,
        selectedResultStyleId: selectedResult.styleId,
        colorErrorMessage: null,
      }));
      return;
    }

    setTryOnState((previous) => ({
      ...previous,
      isColorGenerating: true,
      colorErrorMessage: null,
      selectedResultStyleId: selectedResult.styleId,
    }));

    try {
      const result = await subscribeTryOnEdit({
        image_urls: [selectedResult.imageUrl],
        prompt: buildHairColorPrompt(selectedResult.styleLabel, selectedColor),
        quality: 'medium',
        image_size: 'square_hd',
        output_format: 'png',
        num_images: 1,
      });

      const imageUrl = result.result.data.images[0]?.url;
      if (imageUrl) {
        setTryOnState((previous) => ({
          ...previous,
          colorPreviews: { ...previous.colorPreviews, [cacheKey]: imageUrl },
        }));
      } else {
        setTryOnState((previous) => ({ ...previous, colorErrorMessage: 'สร้างพรีวิวสีผมไม่สำเร็จ ลองเลือกสีใหม่อีกครั้ง' }));
      }
    } catch (error) {
      console.error('Try-on hair color error:', error);
      setTryOnState((previous) => ({ ...previous, colorErrorMessage: 'สร้างพรีวิวสีผมไม่สำเร็จ ลองใหม่อีกครั้ง' }));
    } finally {
      setTryOnState((previous) => ({ ...previous, isColorGenerating: false }));
    }
  };

  const activeErrorMessage = mode === 'analysis' ? analysisState.errorMessage : tryOnState.errorMessage;
  const activeProcessingMessage = mode === 'analysis' ? analysisState.processingMessage : tryOnState.processingMessage;
  const activeIsGenerating = mode === 'analysis' ? analysisState.isGenerating : tryOnState.isGenerating;
  const activeStartedAt = mode === 'analysis' ? analysisState.startedAt : tryOnState.startedAt;
  const activeElapsedLabel = activeStartedAt ? formatElapsedMs(now - activeStartedAt) : formatElapsedMs(0);

  if (!mode || step === 'landing') {
    return <ModeSelectionStep onSelect={handleModeSelect} />;
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
    const activeCacheKey = `${activeStyleId}_${tryOnState.selectedColorId}`;
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
        selectedHairColorId={tryOnState.selectedColorId}
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
      />
    );
  }

  return <ModeSelectionStep onSelect={handleModeSelect} />;
}