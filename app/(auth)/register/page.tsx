"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Container, TextField, Typography, Paper, InputAdornment, IconButton, Fade } from "@mui/material";
import { Direct, Key, Eye, EyeSlash, UserAdd, Shop, User, Call } from "iconsax-react";

export default function RegisterPage() {
  const router = useRouter();
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
    const salonName = formData.get("salonName");
    const ownerName = formData.get("ownerName");
    const phone = formData.get("phone");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, salonName, ownerName, phone }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาด");
      }

      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    },
    "& .MuiInputLabel-root": {
        fontSize: '0.9rem'
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
        background: `linear-gradient(rgba(26, 17, 20, 0.5), rgba(26, 17, 20, 0.5)), url('/luxury_salon_bg_1777425033998.png')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        p: 2,
        py: 6
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
            }}
          >
            <Box sx={{ textAlign: "center", mb: 4 }}>
                <Box 
                sx={{ 
                    width: 50, height: 50, 
                    borderRadius: "14px", 
                    background: "linear-gradient(135deg, #d993a4, #b08090)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    mx: "auto", mb: 2,
                    boxShadow: "0 8px 20px rgba(217, 147, 164, 0.3)"
                }}
                >
                <UserAdd size={28} color="#fff" variant="Bold" />
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: "#1a1114", fontSize: "1.5rem", letterSpacing: "-0.5px", mb: 1 }}>
                    เปิดบัญชีร้านใหม่
                </Typography>
                <Typography variant="body2" sx={{ color: "#7a666e", fontWeight: 500 }}>
                    สมัครวันนี้รับฟรี <Box component="span" sx={{ color: '#d993a4', fontWeight: 700 }}>10 เครดิต</Box> สำหรับเริ่มใช้งาน
                </Typography>
            </Box>

            {error && (
              <Box sx={{ bgcolor: "rgba(239, 68, 68, 0.1)", p: 1.5, borderRadius: "12px", mb: 3, border: "1px solid rgba(239, 68, 68, 0.2)", textAlign: 'center' }}>
                <Typography variant="caption" color="error.main" sx={{ fontWeight: 600 }}>
                  {error}
                </Typography>
              </Box>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                <TextField
                    fullWidth
                    label="ชื่อร้านทำผม (Salon Name)"
                    name="salonName"
                    required
                    sx={inputStyle}
                    slotProps={{
                        input: {
                            startAdornment: (
                                <InputAdornment position="start">
                                    <Shop size={18} color="#b08090" />
                                </InputAdornment>
                            ),
                        }
                    }}
                />

                <Box sx={{ display: 'flex', gap: 2.5, flexDirection: { xs: 'column', sm: 'row' } }}>
                    <TextField
                        fullWidth
                        label="ชื่อเจ้าของร้าน"
                        name="ownerName"
                        required
                        sx={inputStyle}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <User size={18} color="#b08090" />
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />
                    <TextField
                        fullWidth
                        label="เบอร์โทรศัพท์"
                        name="phone"
                        required
                        sx={inputStyle}
                        slotProps={{
                            input: {
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <Call size={18} color="#b08090" />
                                    </InputAdornment>
                                ),
                            }
                        }}
                    />
                </Box>

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
                                    <Direct size={18} color="#b08090" />
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
                                    <Key size={18} color="#b08090" />
                                </InputAdornment>
                            ),
                            endAdornment: (
                                <InputAdornment position="end">
                                <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                                    {showPassword ? <EyeSlash size={18} color="#b08090" /> : <Eye size={18} color="#b08090" />}
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
                sx={{ 
                  mt: 3, mb: 2, 
                  height: "54px",
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
                {loading ? "กำลังสมัครสมาชิก..." : "ลงทะเบียนเปิดร้าน"}
              </Button>

              <Button
                fullWidth
                variant="text"
                onClick={() => router.push("/login")}
                sx={{ 
                  color: "#b08090", 
                  textTransform: "none", 
                  fontWeight: 600,
                  borderRadius: "12px",
                  py: 1.5,
                  "&:hover": { bgcolor: "rgba(217, 147, 164, 0.08)" }
                }}
              >
                มีบัญชีอยู่แล้ว? เข้าสู่ระบบที่นี่
              </Button>
            </Box>
          </Paper>
        </Container>
      </Fade>
    </Box>
  );
}
