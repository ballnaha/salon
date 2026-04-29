"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Button, Container, TextField, Typography, Paper, InputAdornment, IconButton, Fade } from "@mui/material";
import { Direct, Key, Eye, EyeSlash, LoginCurve, Shop } from "iconsax-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams?.get("registered");
  const callbackUrl = searchParams?.get("callbackUrl") || "/";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      setLoading(false);
    } else {
      router.push(callbackUrl);
      router.refresh();
    }
  };

  const inputStyle = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      backgroundColor: "rgba(255, 255, 255, 0.6)",
      transition: "all 0.2s",
      "&:hover": {
        backgroundColor: "rgba(255, 255, 255, 0.8)",
      },
      "&.Mui-focused": {
        backgroundColor: "#fff",
        boxShadow: "0 0 0 4px rgba(217, 147, 164, 0.15)",
      }
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        background: `linear-gradient(rgba(26, 17, 20, 0.4), rgba(26, 17, 20, 0.4)), url('/luxury_salon_bg_1777425033998.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        p: 2
      }}
    >
      <Fade in timeout={800}>
        <Container maxWidth="sm">
          <Paper
            elevation={0}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: "24px",
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.3)",
              textAlign: "center"
            }}
          >
            <Box
              sx={{
                width: 60, height: 60,
                borderRadius: "18px",
                background: "linear-gradient(135deg, #d993a4, #b08090)",
                display: "flex", alignItems: "center", justifyContent: "center",
                mx: "auto", mb: 3,
                boxShadow: "0 8px 20px rgba(217, 147, 164, 0.3)"
              }}
            >
              <Shop size={32} color="#fff" variant="Bold" />
            </Box>

            <Typography variant="h4" gutterBottom sx={{ fontWeight: 800, color: "#1a1114", fontSize: "1.75rem", letterSpacing: "-0.5px" }}>
              ยินดีต้อนรับ
            </Typography>
            <Typography variant="body2" sx={{ color: "#7a666e", mb: 4, fontWeight: 500 }}>
              เข้าสู่ระบบเพื่อจัดการร้าน เวโกเวลอป (Wegowelup) ของคุณ
            </Typography>

            {registered && (
              <Box sx={{ bgcolor: "rgba(34, 197, 94, 0.1)", p: 1.5, borderRadius: "12px", mb: 3, border: "1px solid rgba(34, 197, 94, 0.2)" }}>
                <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                  สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ
                </Typography>
              </Box>
            )}

            {error && (
              <Box sx={{ bgcolor: "rgba(239, 68, 68, 0.1)", p: 1.5, borderRadius: "12px", mb: 3, border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                  {error}
                </Typography>
              </Box>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <TextField
                fullWidth
                label="อีเมล (Email)"
                name="email"
                type="email"
                required
                sx={inputStyle}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Direct size={20} color="#b08090" />
                      </InputAdornment>
                    ),
                  }
                }}
              />
              <TextField
                fullWidth
                label="รหัสผ่าน (Password)"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                sx={inputStyle}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Key size={20} color="#b08090" />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                          {showPassword ? <EyeSlash size={20} color="#b08090" /> : <Eye size={20} color="#b08090" />}
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={!loading && <LoginCurve size={20} variant="Bold" />}
                sx={{
                  mt: 1.5, mb: 1,
                  height: "56px",
                  borderRadius: "14px",
                  background: "linear-gradient(135deg, #d993a4, #c47a8c)",
                  boxShadow: "0 10px 25px rgba(217, 147, 164, 0.35)",
                  textTransform: "none",
                  fontSize: "1rem",
                  fontWeight: 700,
                  "&:hover": {
                    background: "linear-gradient(135deg, #c47a8c, #b08090)",
                    transform: "translateY(-1px)",
                    boxShadow: "0 12px 30px rgba(217, 147, 164, 0.45)",
                  },
                  transition: "all 0.3s ease"
                }}
              >
                {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={() => router.push("/register")}
                sx={{
                  color: "#b08090",
                  textTransform: "none",
                  fontWeight: 600,
                  borderRadius: "12px",
                  py: 1.5,
                  "&:hover": { bgcolor: "rgba(217, 147, 164, 0.08)" }
                }}
              >
                ยังไม่มีบัญชี? สมัครสมาชิกที่นี่
              </Button>
            </Box>
          </Paper>
        </Container>
      </Fade>
    </Box>
  );
}
