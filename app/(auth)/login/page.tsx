"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Box, Button, Container, TextField, Typography, Paper } from "@mui/material";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams?.get("registered");
  const callbackUrl = searchParams?.get("callbackUrl") || "/";

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", bgcolor: "#f8fafc" }}>
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 5, borderRadius: 3 }}>
          <Typography variant="h4" fontWeight="bold" gutterBottom align="center" color="#0f172a">
            เข้าสู่ระบบ
          </Typography>
          <Typography variant="body1" color="text.secondary" align="center" mb={4}>
            จัดการร้านทำผมของคุณด้วย Salon AI
          </Typography>

          {registered && (
            <Typography color="success.main" align="center" mb={2}>
              สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ
            </Typography>
          )}

          {error && (
            <Typography color="error" align="center" mb={2}>
              {error}
            </Typography>
          )}

          <Box component="form" onSubmit={handleSubmit}>
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
              {loading ? "กำลังตรวจสอบ..." : "เข้าสู่ระบบ"}
            </Button>
            
            <Button
              fullWidth
              variant="text"
              onClick={() => router.push("/register")}
            >
              ยังไม่มีบัญชี? สมัครสมาชิก
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
}
