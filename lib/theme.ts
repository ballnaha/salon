'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-prompt), Prompt, sans-serif',
  },
  palette: {
    mode: 'light',
  },
});

export default theme;
