import React, { useRef,useState } from 'react';
import {
  Box,
  Paper,
  TextareaAutosize,
  IconButton,
  Typography,
  TextField,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
  CircularProgress,
  useMediaQuery, 
  Theme
} from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import ImageIcon from '@mui/icons-material/Image';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import CloseIcon from '@mui/icons-material/Close';

interface DalleSettings {
  imageCount: number;
  imageSize: string;
}

interface ImagePreview {
  id: string;
  base64: string;
}

interface InputAreaProps {
  // input: string;
  loading: boolean;
  selectedModel: string;
  dalleSettings: DalleSettings;
  // setInput: (value: string) => void;
  handleSend: (e: React.FormEvent, input:string) => void;
  handleImageCountChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleImageSizeChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleFileUpload: (fileOrEvent: File | React.ChangeEvent<HTMLInputElement>) => void;
  selectedIndexes: number[];
  imagePreviews: ImagePreview[];
  handleCancelRequest: () => void;
  onDeleteImage: (id: string) => void;
}

interface ImagePreview {
  id: string;
  base64: string;
}

const InputArea: React.FC<InputAreaProps> = ({
  // input,
  loading,
  selectedModel,
  dalleSettings,
  // setInput,
  handleSend,
  handleImageCountChange,
  handleImageSizeChange,
  handleFileUpload,
  selectedIndexes,
  imagePreviews,
  handleCancelRequest,
  onDeleteImage,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 将状态移到子组件中管理
  const [input, setInput] = useState('');
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  // // 添加新的状态用于测试结果
  // const [testResults, setTestResults] = useState<{
  //   mainThreadTime: string;
  //   workerTime: string;
  //   uiResponsive: boolean;
  // }>({
  //   mainThreadTime: '未测试',
  //   workerTime: '未测试',
  //   uiResponsive: true
  // });

  // // 模拟计算密集型任务（斐波那契数列）
  // const heavyCalculation = (n: number): number => {
  //   if (n <= 1) return n;
  //   return heavyCalculation(n - 1) + heavyCalculation(n - 2);
  // };

  // // 主线程测试
  // const testMainThread = () => {
  //   console.log('开始主线程测试')
  //   setTestResults(prev => ({ ...prev, uiResponsive: false }));
  //   const start = performance.now();
  //   const result = heavyCalculation(42); // 使用较大的数字确保明显延迟
  //   const end = performance.now();
  //   setTestResults(prev => ({
  //     ...prev,
  //     mainThreadTime: `${(end - start).toFixed(2)}ms`,
  //     uiResponsive: true
  //   }));
  //   console.log('主线程计算结果:', result);
  // };

  // // Web Worker 测试
  // const testWithWorker = () => {
  //   // 创建内联 Worker
  //   const workerCode = `
  //     const heavyCalculation = (n) => {
  //       if (n <= 1) return n;
  //       return heavyCalculation(n - 1) + heavyCalculation(n - 2);
  //     };
      
  //     self.onmessage = (e) => {
  //       const start = performance.now();
  //       const result = heavyCalculation(e.data);
  //       const end = performance.now();
  //       postMessage({
  //         time: end - start,
  //         result
  //       });
  //     };
  //   `;
    
  //   const blob = new Blob([workerCode], { type: 'application/javascript' });
  //   const workerUrl = URL.createObjectURL(blob);
  //   const worker = new Worker(workerUrl);
    
  //   worker.postMessage(42); // 发送相同参数
    
  //   worker.onmessage = (e) => {
  //     setTestResults(prev => ({
  //       ...prev,
  //       workerTime: `${e.data.time.toFixed(2)}ms`,
  //       uiResponsive: true
  //     }));
  //     console.log('Worker计算结果:', e.data.result);
  //     worker.terminate();
  //     URL.revokeObjectURL(workerUrl);
  //   };
  // };

  // // UI响应性测试
  // const testUiResponsiveness = () => {
  //   let counter = 0;
  //   const interval = setInterval(() => {
  //     counter++;
  //     setTestResults(prev => ({ ...prev, uiResponsive: !prev.uiResponsive }));
  //     if (counter >= 10) clearInterval(interval);
  //   }, 100);
  // };

  // 修改handleSend调用，传递input值
  const onSend = (e: React.FormEvent) => {
    handleSend(e, input);
    setInput(''); // 发送后清空输入
  };
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // 检查粘贴的内容是否为图片
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            handleFileUpload(file); // 调用文件上传函数
            e.preventDefault(); // 阻止默认粘贴行为
            return;
          }
        }
      }
    }
  };

  const stopChat = () => {
    // 停止聊天
    handleCancelRequest();
  };

  const clickR = () => {
    for(let i=0;i<10000000;i++){
      let a = Math.sqrt(i);
    }
    console.log('结束')
  };

  return (
    <Box
      sx={{
        position: 'relative',
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: '#f9f9f9',
        p: 2,
        pb: 4,
        paddingBottom: '16px'
      }}
    >
      <Box
        component="form"
        // onSubmit={handleSend}
        sx={{
          position: 'relative',
          width: '100%',
          mb: 3,
        }}
      >
        {imagePreviews.length > 0 && (
          <Box
              sx={{
                  display: 'flex',
                  gap: 1,
                  mb: 2,
                  overflowX: 'auto',
                  '&::-webkit-scrollbar': {
                      height: '6px',
                  },
                  '&::-webkit-scrollbar-thumb': {
                      backgroundColor: '#bdbdbd',
                      borderRadius: '3px',
                  },
              }}
          >
              {imagePreviews.map((preview) => (
                  <Box
                      key={preview.id}
                      sx={{
                          position: 'relative',
                          height: '80px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          paddingRight: '16px',
                      }}
                  >
                      <img
                          src={preview.base64}
                          alt="预览"
                          style={{
                              height: '60px',
                              width: 'auto',
                              borderRadius: '4px',
                          }}
                      />
                      <IconButton
                          size="small"
                          onClick={() => onDeleteImage(preview.id)}
                          sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              backgroundColor: 'rgba(0, 0, 0, 0.5)',
                              color: 'white',
                              padding: '4px',
                              '&:hover': {
                                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                              },
                          }}
                      >
                          <CloseIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                  </Box>
              ))}
          </Box>
        )}
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            p: '16px',
            borderRadius: '12px',
            border: '1px solid #e0e0e0',
            backgroundColor: 'white',
            boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
            '&:focus-within': {
              boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
              borderColor: '#1a73e8',
            },
          }}
        >
          <TextareaAutosize
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPaste={handlePaste}
            placeholder="输入你的问题..."
            style={{
              width: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              padding: '8px',
              paddingRight: '56px',
              fontSize: '16px',
              fontFamily: 'inherit',
              backgroundColor: 'transparent',
              lineHeight: '1.5',
              minHeight: '72px',
              maxHeight: '144px',
              height: 'auto',
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                onSend(e as any);
              }
            }}
          />

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 2,
              pt: 2,
              borderTop: '1px solid #e0e0e0',
            }}
          >
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              {selectedModel === 'dall-e-3' || selectedModel === 'gpt-image-1' ? (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Tooltip title="生成图片数量 (1-4)" arrow>
                    <TextField
                      type="number"
                      size="small"
                      value={dalleSettings.imageCount}
                      onChange={handleImageCountChange}
                      InputProps={{
                        inputProps: { min: 1, max: 4 },
                        startAdornment: (
                          <ImageIcon sx={{ mr: 1, color: 'action.active' }} />
                        ),
                      }}
                      sx={{
                        width: '120px',
                        '& .MuiOutlinedInput-root': {
                          backgroundColor: '#f8f9fa',
                          '&:hover fieldset': {
                            borderColor: 'primary.main',
                          },
                        },
                      }}
                    />
                  </Tooltip>
                  <Tooltip title="图片分辨率" arrow>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                      <Select
                        value={dalleSettings.imageSize}
                        onChange={(e) => handleImageSizeChange(e as any)}
                        startAdornment={<AspectRatioIcon sx={{ mr: 1, color: 'action.active' }} />}
                        sx={{
                          backgroundColor: '#f8f9fa',
                          '&:hover': {
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: 'primary.main',
                            },
                          },
                        }}
                      >
                        <MenuItem value="1024x1024">1024 x 1024</MenuItem>
                        <MenuItem value="1792x1024">1792 x 1024(dall-e-3)</MenuItem>
                        <MenuItem value="1024x1792">1024 x 1792(dall-e-3)</MenuItem>
                        <MenuItem value="1024x1792">1024 x 1536(gpt-image)</MenuItem>
                        <MenuItem value="1024x1792">1536 x 1024(gpt-image)</MenuItem>
                      </Select>
                    </FormControl>
                  </Tooltip>
                </Box>
              ) : (
                <Box>
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <Tooltip title="上传图片" arrow>
                    <IconButton
                      onClick={() => fileInputRef.current?.click()}
                      sx={{
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: '#f0f0f0',
                        },
                      }}
                    >
                      <FileUploadIcon />
                    </IconButton>
                  </Tooltip>
                </Box>
              )}
            </Box>
            <IconButton
              type="submit"
              disabled={!input.trim() && selectedIndexes.length === 0 && !loading} // 仅当输入为空时禁用
              onClick={() => {
                if (loading) {
                  stopChat(); // 调用停止对话的函数
                }
              }}
              sx={{
                color: loading ? '#1a73e8' : !input.trim() && selectedIndexes.length === 0 ? '#bdbdbd' : '#1a73e8', // 根据状态设置颜色
                transition: 'all 0.2s ease',
                '&:hover': {
                  backgroundColor: loading ? 'rgba(26, 115, 232, 0.04)' : !input.trim() ? 'transparent' : 'rgba(26, 115, 232, 0.04)',
                },
              }}
            >
              <Tooltip
                title={
                  loading
                    ? '停止对话' // 当 loading 为 true 时显示“停止对话”
                    : !input.trim() && selectedIndexes.length === 0
                    ? '请输入问题' // 当 input 为空且没有选中索引时显示“请输入问题”
                    : '发送' // 默认情况下显示“发送”
                }
                placement="top" // 提示文字显示在按钮上方
              >
                {/* 根据 loading 状态显示图标或旋转圆圈 */}
                {loading ? (
                  <CircularProgress
                    size={24} // 圆圈大小
                    thickness={4} // 圆圈粗细
                    sx={{
                      color: '#1a73e8', // 圆圈颜色
                      animationDuration: '0.75s', // 旋转速度
                    }}
                  />
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.5 19.5L19.5 12L4.5 4.5V9.5L15.5 12L4.5 14.5V19.5Z" fill="currentColor" />
                  </svg>
                )}
              </Tooltip>
            </IconButton>
          </Box>
        </Paper>
        <Typography
          variant="caption"
          sx={{
            position: 'absolute',
            bottom: '-24px',
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#666',
            whiteSpace: isMobile ? 'nowrap' : 'normal', // 移动端强制不换行
            maxWidth: isMobile ? '90vw' : '100%',      // 移动端限制最大宽度为视口宽度
            overflow: 'hidden',
            textOverflow: 'ellipsis', // 文字过长时显示省略号
            px: 1,                    // 添加水平内边距防止贴边
          }}
        >
          {isMobile ? '按 Enter 发送' : '按 Enter 发送，Shift + Enter 换行'}
          {/* 按 Enter 发送，Shift + Enter 换行 */}
        </Typography>
        {/* 添加测试区域 */}
        {/* <Box sx={{ 
          mt: 4, 
          p: 2, 
          backgroundColor: 'white', 
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <Typography variant="h6" gutterBottom>
            Web Worker 性能测试
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <button type="button" onClick={testMainThread}>主线程测试</button>
            <button type="button" onClick={testWithWorker}>Web Worker测试</button>
            <button type="button" onClick={testUiResponsiveness}>测试UI响应性</button>
          </Box>
          
          <Box sx={{ mb: 2 }}>
            <Typography>主线程计算时间: {testResults.mainThreadTime}</Typography>
            <Typography>Worker计算时间: {testResults.workerTime}</Typography>
          </Box>
          
          <Box sx={{ 
            p: 2, 
            backgroundColor: testResults.uiResponsive ? '#e8f5e9' : '#ffebee',
            borderRadius: '4px'
          }}>
            <Typography>
              UI状态: {testResults.uiResponsive ? '响应正常' : '阻塞中...'}
            </Typography>
          </Box>
          
          <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
            测试说明: <br/>
            1. 点击"主线程测试"后立即点击"测试UI响应性" - UI会卡住<br/>
            2. 点击"Web Worker测试"后立即点击"测试UI响应性" - UI保持响应<br/>
            3. 比较两种方式的计算时间
          </Typography>
        </Box> */}
      </Box>
    </Box>
  );
};

export default InputArea; 