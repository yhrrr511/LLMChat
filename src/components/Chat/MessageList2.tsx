import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Paper, Typography, Grid, Checkbox, Tooltip,useMediaQuery,Theme, } from '@mui/material';

interface Message {
  type: 'user' | 'bot';
  text: string;
  formattedText?: string;
  imageUrls?: string[];
}

interface VirtualMessage extends Message {
  height: number;
  top: number;
}

interface VisibleMessage extends VirtualMessage {
  index: number;
}

interface MessageListProps {
  messages: Message[];
  messageListRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (selectedIndexes: number[]) => void;
}

const ESTIMATED_ITEM_HEIGHT = 120;
const OVERSCAN_COUNT = 3;

const MessageList: React.FC<MessageListProps> = ({
  messages,
  messageListRef,
  messagesEndRef,
  onSelect,
}) => {
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [messageHeights, setMessageHeights] = useState<Record<number, number>>({});
  const totalHeightRef = useRef<number>(0);
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  const handleScroll = useCallback(() => {
    if (messageListRef.current) {
      setScrollTop(messageListRef.current.scrollTop);
      setContainerHeight(messageListRef.current.clientHeight);
    }
  }, [messageListRef]);

  // 添加处理图片加载完成的事件监听器，保证图片加载后重新计算高度
  const measureMessageHeight = useCallback((index: number, height: number) => {
    setMessageHeights((prev) => {
      if (prev[index] !== height) {
        return { ...prev, [index]: height };
      }
      return prev;
    });
  }, []);

  // 初始化滚动和容器高度
  useEffect(() => {
    const messageListElement = messageListRef.current;
    if (messageListElement) {
      setContainerHeight(messageListElement.clientHeight);
      messageListElement.addEventListener('scroll', handleScroll);
      setScrollTop(messageListElement.scrollTop);
    }
    return () => {
      if (messageListElement) {
        messageListElement.removeEventListener('scroll', handleScroll);
      }
    };
  }, [messageListRef, handleScroll]);

  const virtualMessages = useMemo(() => {
    let totalHeight = 0;
    return messages.map((message, index) => {
      const height =
        messageHeights[index] || (message.imageUrls?.length ? ESTIMATED_ITEM_HEIGHT * 3 : ESTIMATED_ITEM_HEIGHT);
      const item: VirtualMessage = {
        ...message,
        height,
        top: totalHeight,
      };
      totalHeight += height;
      return item;
    });
  }, [messages, messageHeights]);

  const totalHeight = useMemo(() => {
    return virtualMessages.reduce((acc, item) => acc + item.height, 0);
  }, [virtualMessages]);

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
      index: visibleStart + idx,
    }));
  }, [virtualMessages, scrollTop, containerHeight]) as VisibleMessage[];

  useEffect(() => {
    if (selectedIndexes.length > 0) {
      onSelect(selectedIndexes);
    }
  }, [selectedIndexes, onSelect]);

  const handleCheckboxChange = (index: number) => {
    setSelectedIndexes((prevSelected) => {
      const newSelected = prevSelected.includes(index)
        ? prevSelected.filter((i) => i !== index)
        : [...prevSelected, index].sort((a, b) => a - b);
      return newSelected;
    });
  };

  return (
    <Box
      ref={messageListRef}
      sx={{
        flex: 1,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
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
      <div style={{ height: totalHeight, position: 'absolute', width: '100%' }}>
      </div>
      {visibleMessages.map(({ index, top, height, ...message }) => (
        <div
          key={index}
          style={{
            position: 'absolute',
            right: 0,
            transform: `translateY(${top}px)`,
            width: '100%',
            padding: '4px 10px',
          }}
          ref={(el) => {
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
                // maxWidth: message.imageUrls && message.imageUrls.length > 1 ? '100%' : '800px',
                maxWidth: isMobile ? '85%' : (message.imageUrls && message.imageUrls.length > 1 ? '100%' : '800px'),
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
                  <Typography sx={{ color: '#000', whiteSpace: 'pre-wrap' }}>{message.text}</Typography>
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
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
