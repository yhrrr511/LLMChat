import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
} from '@mui/material';

interface LoginData {
  username: string;
  password: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [loginData, setLoginData] = useState<LoginData>({
    username: 'admin',
    password: '123456',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginData.username === 'admin' && loginData.password === '123456') {
      navigate('/chat');
    } else {
      setError('用户名或密码错误');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h5">
            登录
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              margin="normal"
              required
              fullWidth
              id="username"
              label="用户名"
              name="username"
              autoComplete="username"
              autoFocus
              value={loginData.username}
              onChange={handleChange}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="密码"
              type="password"
              id="password"
              autoComplete="current-password"
              value={loginData.password}
              onChange={handleChange}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              登录
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login; 