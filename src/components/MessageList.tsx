// MessageList.tsx 修复版本
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Box, Paper, Typography, Grid, Checkbox, Tooltip } from '@mui/material';

interface Message {
  type: 'user' | 'bot';
  text: string;
  formattedText?: string;
  imageUrls?: string[];
}

// 添加虚拟消息接口，包含位置信息
interface VirtualMessage extends Message {
  height: number;
  top: number;
}

// 添加带索引的可视消息接口
interface VisibleMessage extends VirtualMessage {
  index: number; // 添加索引属性
}

interface MessageListProps {
  messages: Message[];
  messageListRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (selectedIndexes: number[]) => void;
}

// 设定消息的估计高度
const ESTIMATED_ITEM_HEIGHT = 120; // 默认消息高度估计值
const OVERSCAN_COUNT = 3; // 上下多渲染的消息数量

const MessageList: React.FC<MessageListProps> = ({
  messages,
  messageListRef,
  messagesEndRef,
  onSelect,
}) => {
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  
  // 存储每条消息的实际高度
  const [messageHeights, setMessageHeights] = useState<Record<number, number>>({});
  
  // 处理滚动事件
  const handleScroll = useCallback(() => {
    if (messageListRef.current) {
      setScrollTop(messageListRef.current.scrollTop);
      setContainerHeight(messageListRef.current.clientHeight);
    }
  }, [messageListRef]);
  
  // 初始化和监听滚动事件
  useEffect(() => {
    const messageListElement = messageListRef.current;
    if (messageListElement) {
      setContainerHeight(messageListElement.clientHeight);
      messageListElement.addEventListener('scroll', handleScroll);
      
      // 初始滚动位置
      setScrollTop(messageListElement.scrollTop);
    }
    
    return () => {
      if (messageListElement) {
        messageListElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [messageListRef, handleScroll]);
  
  // 计算每条消息的位置信息
  const virtualMessages = useMemo(() => {
    let totalHeight = 0;
    const items: VirtualMessage[] = messages.map((message, index) => {
      // 使用已知高度或估计高度
      const height = messageHeights[index] || 
                    (message.imageUrls?.length ? ESTIMATED_ITEM_HEIGHT * 2 : ESTIMATED_ITEM_HEIGHT);
      
      const item: VirtualMessage = {
        ...message,
        height,
        top: totalHeight,
      };
      
      totalHeight += height;
      return item;
    });
    
    return items;
  }, [messages, messageHeights]);
  
  // 计算总内容高度
  const totalHeight = useMemo(() => {
    return virtualMessages.length > 0 
      ? virtualMessages[virtualMessages.length - 1].top + virtualMessages[virtualMessages.length - 1].height 
      : 0;
  }, [virtualMessages]);
  
  // 确定需要渲染的消息范围
  const visibleMessages = useMemo(() => {
    if (containerHeight === 0) return virtualMessages.map((item, index) => ({ ...item, index }));
    
    const startIndex = virtualMessages.findIndex(
      (item) => item.top + item.height > scrollTop - ESTIMATED_ITEM_HEIGHT * OVERSCAN_COUNT
    );
    
    const endIndex = virtualMessages.findIndex(
      (item) => item.top > scrollTop + containerHeight + ESTIMATED_ITEM_HEIGHT * OVERSCAN_COUNT
    );
    
    const visibleStart = Math.max(0, startIndex === -1 ? 0 : startIndex);
    const visibleEnd = endIndex === -1 ? virtualMessages.length : endIndex;
    
    return virtualMessages.slice(visibleStart, visibleEnd).map((item, idx) => ({
      ...item,
      index: visibleStart + idx, // 保存原始索引
    }));
  }, [virtualMessages, scrollTop, containerHeight]) as VisibleMessage[]; // 添加类型断言
  
  useEffect(() => {
    onSelect(selectedIndexes);
  }, [selectedIndexes, onSelect]);
  
  const handleCheckboxChange = (index: number) => {
    setSelectedIndexes((prevSelected) => {
      const newSelected = prevSelected.includes(index)
        ? prevSelected.filter((i) => i !== index) 
        : [...prevSelected, index].sort((a, b) => a - b);
      
      return newSelected;
    });
  };
  
  // 计算消息实际高度的回调
  const measureMessageHeight = useCallback((index: number, height: number) => {
    setMessageHeights(prev => {
      if (prev[index] === height) return prev;
      return { ...prev, [index]: height };
    });
  }, []);

  return (
    <Box 
      ref={messageListRef}
      sx={{ 
        flex: 1,
        overflow: 'auto',
        p: 2.5,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        height: `calc(100vh - 72px - 180px)`,
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'transparent',
        },
        '&::-webkit-scrollbar-thumb': {
          background: '#888',
          borderRadius: '4px',
        },
        '&::-webkit-scrollbar-thumb:hover': {
          background: '#666',
        },
      }}
    >
      {/* 创建一个容器维持滚动区域的高度 */}
      <div style={{ height: totalHeight, position: 'relative', width: '100%' }}>
        {visibleMessages.map(({ index, top, height, ...message }) => (
          <div
            key={index}
            style={{ 
              position: 'absolute',
              top,
              width: '100%',
            }}
            ref={el => {
              if (el) {
                const newHeight = el.getBoundingClientRect().height;
                if (newHeight !== height) {
                  measureMessageHeight(index, newHeight);
                }
              }
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                width: '100%',
                alignItems: 'flex-start',
                mb: 2,
              }}
            >
              {message.type === 'user' && (
                <Tooltip title="选择记忆上下文" arrow>
                  <Checkbox
                    checked={selectedIndexes.includes(index)}
                    onChange={() => handleCheckboxChange(index)}
                    sx={{ mr: 1 }}
                  />
                </Tooltip>
              )}
              <Paper
                sx={{
                  p: 1.25,
                  maxWidth: message.imageUrls && message.imageUrls.length > 1 ? '100%' : '800px',
                  width: 'auto',
                  bgcolor: message.type === 'user' ? '#d1e7ff' : '#fff',
                  boxShadow: message.type === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                  borderRadius: 1,
                }}
              >
                {message.type === 'user' ? (
                  <>
                    {message.imageUrls && message.imageUrls.length > 0 && (
                      <Box sx={{ width: '100%', textAlign: 'center', mt: 2 }}>
                        <Grid container spacing={2} justifyContent="center">
                          {message.imageUrls.map((url, imgIndex) => (
                            <Grid item xs="auto" key={imgIndex}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  '&:hover': {
                                    '& img': {
                                      transform: 'scale(1.02)',
                                    },
                                  },
                                }}
                              >
                                <img
                                  src={url}
                                  alt={`用户上传的图片 ${imgIndex + 1}`}
                                  style={{
                                    height: message.imageUrls!.length > 1 ? '200px' : '300px',
                                    width: 'auto',
                                    objectFit: 'contain',
                                    borderRadius: '4px',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    transition: 'transform 0.3s ease',
                                  }}
                                />
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                        <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#666' }}>
                          上传的图片
                        </Typography>
                      </Box>
                    )}
                    <Typography sx={{ color: '#000' }}>{message.text}</Typography>
                  </>
                ) : message.imageUrls ? (
                  <Box sx={{ width: '100%', textAlign: 'center' }}>
                    <Grid container spacing={2} justifyContent="center">
                      {message.imageUrls.map((url, imgIndex) => (
                        <Grid item xs={12} sm={message.imageUrls!.length > 1 ? 6 : 12} key={imgIndex}>
                          <Box
                            sx={{
                              position: 'relative',
                              width: '100%',
                              '&:hover': {
                                '& img': {
                                  transform: 'scale(1.02)',
                                },
                              },
                            }}
                          >
                            <img 
                              src={url} 
                              alt={`AI生成的图片 ${imgIndex + 1}`}
                              style={{ 
                                width: '100%',
                                maxHeight: message.imageUrls!.length > 1 ? '400px' : '600px',
                                objectFit: 'contain',
                                borderRadius: '4px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                transition: 'transform 0.3s ease',
                              }} 
                            />
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#666' }}>
                      由 DALL-E 3 生成的图片
                    </Typography>
                  </Box>
                ) : (
                  <div 
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: message.formattedText || message.text }}
                  />
                )}
              </Paper>
              {message.type === 'bot' && (
                <Tooltip title="选择记忆上下文" arrow>
                  <Checkbox
                    checked={selectedIndexes.includes(index)}
                    onChange={() => handleCheckboxChange(index)}
                    sx={{ ml: 1 }}
                  />
                </Tooltip>
              )}
            </Box>
          </div>
        ))}
      </div>
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
