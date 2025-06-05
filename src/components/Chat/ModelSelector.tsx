import React, {useState, useEffect} from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  FormControlLabel,
  useMediaQuery,
  Theme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';

interface ModelSelectorProps {
  drawerOpen: boolean;
  selectedModel: string;
  handleDrawerToggle: () => void;
  handleModelChange: (event: any) => void;
  onlyShowThinking: boolean;
  handleOnlyShowThinkingChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  money: number;
}

const modelOptions = [
  { value: 'gpt-4o-mini', label: 'gpt-4o-mini(提问$0.15，回答$0.6)' },
  { value: 'gpt-4o', label: 'gpt-4o($2.5，$10)' },
  { value: 'o1-preview', label: 'gpt-o1($15，$60)' },
  { value: 'gpt-4.5-preview', label: 'gpt-4.5($75，$150)' },
  { value: 'gpt-4.1', label: 'gpt-4.1($2，$8)' },
  { value: 'gpt-4.1-mini', label: 'gpt-4.1-mini($0.4，$1.6)' },
  { value: 'gpt-image-1', label: 'gpt-image-1(1k*1k的图0.011美元)' },
  { value: 'o3', label: 'gpt-o3($10，$40)' },
  { value: 'o4-mini', label: 'gpt-o4-mini($1.1，$4.4)' },
  { value: 'deepseek-reasoner', label: 'DeepSeek-R1($0.55，$1.1)' },
  { value: 'deepseek-chat', label: 'DeepSeek-V3($0.27，$0.55)' },
  { value: 'deepseek-coder', label: 'DeepSeek-coder($0.27，$0.55)' },
  { value: 'claude-opus-4-20250514', label: 'claude-opus-4($15，$75)' },
  { value: 'claude-opus-4-20250514-thinking', label: 'claude-opus-4-thinking($15，$75)' },
  { value: 'claude-sonnet-4-20250514', label: 'claude-sonnet-4($3，$15)' },
  { value: 'claude-sonnet-4-20250514-thinking', label: 'claude-sonnet-4-thinking($3，$15)' },
  { value: 'claude-3-7-sonnet-20250219', label: 'claude3.7-sonnet($3，$15)' },
  { value: 'claude-3-7-sonnet-thinking', label: 'claude3.7-sonnet-thinking($3，$15)' },
  { value: 'claude-3-5-sonnet-20241022', label: 'claude3.5-sonnet($3，$15)' },
  { value: 'grok-3', label: 'grok-3($4，$20)' },
  { value: 'dall-e-3', label: 'DALL·E·3绘图(一张1k*1k的图$0.04)' },
  { value: 'ERNIE-Speed-128K', label: '百度文心一言模型（免费）' },
];

const ModelSelector: React.FC<ModelSelectorProps> = ({
  drawerOpen,
  selectedModel,
  handleDrawerToggle,
  handleModelChange,
  onlyShowThinking,
  handleOnlyShowThinkingChange,
  money,
}) => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  return (
    <AppBar 
      position="static" 
      color="transparent" 
      elevation={0}
      sx={{ 
        borderBottom: '1px solid #e0e0e0',
        backgroundColor: '#fff',
        height: '72px'
      }}
    >
      <Toolbar sx={{ position: 'relative' }}>
        <IconButton
          edge="start"
          color="inherit"
          aria-label="menu"
          onClick={handleDrawerToggle}
          sx={{ 
            mr: 2,
            position: 'absolute',
            left: '20px',
            ...(drawerOpen && { display: 'none' })
          }}
        >
          <MenuIcon />
        </IconButton>
        <div className='money' style={{position: 'absolute', right: '120px', top: '20px'}}>
          余额：{money}
        </div>
        {!isMobile && (
          <div className='logout-button'>
            <button
              onClick={() => {
                navigate('/login');
              }}
              className='logout-button-button'
            >
              注销
            </button>
          </div>
        )}
        <Box sx={{ 
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <FormControl sx={{ minWidth: 200 }}>
            <Select
              value={selectedModel}
              onChange={handleModelChange}
              displayEmpty
              sx={{
                height: '40px',
                backgroundColor: '#f8f9fa',
                '&:hover': { backgroundColor: '#f0f0f0' },
              }}
              MenuProps={{
                PaperProps: {
                  style: {
                    maxHeight: 300,  // 设置下拉菜单的最大高度
                    overflow: 'auto',  // 启用滚动
                  },
                },
              }}
            >
              {modelOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
            {(selectedModel === 'claude-3-7-sonnet-thinking' || selectedModel === 'deepseek-reasoner' || selectedModel === 'claude-opus-4-20250514-thinking' || selectedModel === 'claude-sonnet-4-20250514-thinking') && (
              <Box sx={{ position: 'absolute', right: '-200px' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={onlyShowThinking}
                      onChange={handleOnlyShowThinkingChange}
                      name="onlyShowThinking"
                      color="primary"
                    />
                  }
                  label="仅展示思考内容"
                />
              </Box>
            )}
          </FormControl>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default ModelSelector; 