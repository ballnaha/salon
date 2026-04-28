"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Container, TextField, Typography, Paper } from "@mui/material";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
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

      // นำทางไปหน้า login หลังสมัครเสร็จ
      router.push("/login?registered=true");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", bgcolor: "#f8fafc" }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 5, borderRadius: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom align="center" color="#0f172a">
            สมัครใช้งานระบบ Salon AI
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" mb={4}>
            สมัครวันนี้รับฟรี 100 เครดิตสำหรับให้ลูกค้าใช้งาน
          </Typography>

          {error && (
            <Typography color="error" align="center" mb={2}>
              {error}
            </Typography>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="ชื่อร้านทำผม (Salon Name)"
              name="salonName"
              required
              margin="normal"
            />
            <TextField
              fullWidth
              label="ชื่อ-นามสกุล เจ้าของร้าน"
              name="ownerName"
              required
              margin="normal"
            />
            <TextField
              fullWidth
              label="เบอร์โทรศัพท์"
              name="phone"
              required
              margin="normal"
            />
            <TextField
              fullWidth
              label="อีเมล (Email)"
              name="email"
              type="email"
              required
              margin="normal"
            />
            <TextField
              fullWidth
              label="รหัสผ่าน (Password)"
              name="password"
              type="password"
              required
              margin="normal"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, bgcolor: "#d993a4", "&:hover": { bgcolor: "#c47a8c" } }}
            >
              {loading ? "กำลังสมัครสมาชิก..." : "ลงทะเบียนเปิดร้าน"}
            </Button>
            
            <Button
              fullWidth
              variant="text"
              onClick={() => router.push("/login")}
            >
              มีบัญชีอยู่แล้ว? เข้าสู่ระบบ
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
