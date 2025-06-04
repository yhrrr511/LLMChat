import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Box, Paper, Typography, Grid, Checkbox, Tooltip, useMediaQuery, Theme } from '@mui/material';

interface Message {
  type: 'user' | 'bot';
  text: string;
  formattedText?: string;
  imageUrls?: string[];
}

interface VirtualChunk {
  messageIndex: number;
  chunkIndex: number;
  isFirstChunk: boolean;
  isLastChunk: boolean;
  totalChunks: number;
  height: number;
  top: number;
  message: Message;
  text: string;
  formattedText?: string;
  imageUrls?: string[];
}

interface MessageListProps {
  messages: Message[];
  messageListRef: React.RefObject<HTMLDivElement | null>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onSelect: (selectedIndexes: number[]) => void;
}

const ESTIMATED_ITEM_HEIGHT = 120;
const OVERSCAN_COUNT = 3;
const MAX_MESSAGE_HEIGHT = 900; // 最大消息高度
const STANDARD_CHUNK_HEIGHT = 600; // 标准分块高度
const MIN_CHUNK_LENGTH = 50; // 新增：最小分块长度

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
  const [chunkHeights, setChunkHeights] = useState<Record<string, number>>({});
  const measuredChunksRef = useRef<Set<string>>(new Set());
  const pendingUpdatesRef = useRef<Record<string, number>>({});
  const updateTimeoutRef = useRef<number | null>(null);
  const isMobile = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));

  // 新增：游标驱动的分块上下文
  interface ChunkingContext {
    position: number;
    chunks: VirtualChunk[];
    currentTop: number;
  }

  const handleScroll = useCallback(() => {
    if (messageListRef.current) {
      setScrollTop(messageListRef.current.scrollTop);
      setContainerHeight(messageListRef.current.clientHeight);
    }
  }, [messageListRef]);

  // 批量更新高度，避免频繁触发渲染
  const batchUpdateHeights = useCallback(() => {
    const updates = pendingUpdatesRef.current;
    if (Object.keys(updates).length > 0) {
      setChunkHeights(prev => ({ ...prev, ...updates }));
      pendingUpdatesRef.current = {};
    }
    updateTimeoutRef.current = null;
  }, []);

  // 添加处理图片加载完成的事件监听器，保证图片加载后重新计算高度
  // const measureMessageHeight = useCallback((index: number, height: number) => {
  //   setMessageHeights((prev) => {
  //     // 只在高度有明显变化时更新（超过5px差异）
  //     if (Math.abs(prev[index] - height) > 5) {
  //       return { ...prev, [index]: height };
  //     }
  //     return prev;
  //   });
  // }, []);
  const measureMessageHeight = useCallback((index: number, height: number) => {
    setMessageHeights((prev) => {
      if (Math.abs(prev[index] - height) > 5) {
        // 当高度变化超过5px时强制重新分块
        return { ...prev, [index]: Math.min(height, MAX_MESSAGE_HEIGHT) };
      }
      return prev;
    });
  }, []);

  // 检测HTML字符串中的代码块位置（返回[startIndex, endIndex][]）
  const detectCodeBlocks = (html: string): [number, number][] => {
    const codeBlocks: [number, number][] = [];
    // 使用非贪婪匹配+游标遍历，修复嵌套代码块检测
    let cursor = 0;
    while (cursor < html.length) {
      const preStart = html.indexOf('<pre>', cursor);
      if (preStart === -1) break;
      
      const codeStart = html.indexOf('<code', preStart);
      const codeEnd = html.indexOf('</code>', codeStart);
      const preEnd = html.indexOf('</pre>', codeEnd);
      
      if (codeStart > -1 && codeEnd > -1 && preEnd > -1) {
        codeBlocks.push([preStart, preEnd + 6]); // +6 包含</pre>
        cursor = preEnd + 6;
      } else {
        break;
      }
    }
    return codeBlocks;
  };

  // 检查当前分割点是否在代码块内
  const isInsideCodeBlock = (position: number, codeBlocks: [number, number][]) => {
    return codeBlocks.some(([start, end]) => position > start && position < end);
  };

  // 测量分块高度的函数
  const measureChunkHeight = useCallback((chunkId: string, height: number) => {
    // 不直接调用 setState，而是将更新放入 pending 队列
    if (!measuredChunksRef.current.has(chunkId) ||
      Math.abs(chunkHeights[chunkId] - height) > 5) {
      measuredChunksRef.current.add(chunkId);
      pendingUpdatesRef.current[chunkId] = height;

      // 设置一个短暂的延迟来批量处理更新
      if (!updateTimeoutRef.current) {
        updateTimeoutRef.current = window.setTimeout(batchUpdateHeights, 50);
      }
    }
  }, [chunkHeights, batchUpdateHeights]);

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
      // 清除定时器
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [messageListRef, handleScroll]);

  // 当消息列表变化时，重置已测量的分块集合
  useEffect(() => {
    measuredChunksRef.current.clear();
  }, [messages]);

  // 新增工具函数：计算纯文本的分割范围
  const getTextSplitRange = (
    text: string,
    chunkIndex: number,
    totalChunks: number
  ): [number, number] => {
    const chunkSize = Math.ceil(text.length / totalChunks);
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, text.length);
    return [start, end];
  };

  // 分块消息处理函数 - 预先将大消息分块
  const createVirtualChunks = (messages: Message[]): VirtualChunk[] => {
    const chunks: VirtualChunk[] = [];
    let currentTop = 0;
  
    messages.forEach((message, messageIndex) => {
      let codeBlocks: [number, number][] = [];
      
      // 预检测代码块（仅Bot消息）
      if (message.type === 'bot' && message.formattedText) {
        codeBlocks = detectCodeBlocks(message.formattedText);
      }
  
      // 动态计算初始分块数
      let totalChunks = calculateTotalChunks(message, codeBlocks);
      
      // 临时存储生成的分块（用于空内容校验）
      const generatedChunks: VirtualChunk[] = [];
      
      // 第一阶段：生成原始分块
      for (let i = 0; i < totalChunks; i++) {
        const isLast = i === totalChunks - 1;
        const chunkId = `msg-${messageIndex}-chunk-${i}`;
        
        const chunkContent = getChunkContent(
          message,
          i,
          totalChunks,
          codeBlocks
        );
  
        generatedChunks.push({
          messageIndex,
          chunkIndex: i,
          isFirstChunk: i === 0,
          isLastChunk: isLast,
          totalChunks,
          height: chunkHeights[chunkId] || ESTIMATED_ITEM_HEIGHT,
          top: currentTop,
          message,
          text: chunkContent,
          formattedText: isLast ? message.formattedText : undefined,
          imageUrls: message.imageUrls
        });
  
        currentTop += chunkHeights[chunkId] || ESTIMATED_ITEM_HEIGHT;
      }
  
      // 第二阶段：过滤无效分块
      const validChunks = generatedChunks.filter((chunk, index) => {
        // 始终保留第一个分块（即使为空）
        if (index === 0) return true;
        
        // 过滤后续空内容分块（保留至少10个可见字符）
        return chunk.text.trim().length > 10 || 
               (chunk.imageUrls && chunk.imageUrls.length > 0);
      });
  
      // 第三阶段：修正分块元数据
      const finalChunks = validChunks.map((chunk, index) => ({
        ...chunk,
        isFirstChunk: index === 0,
        isLastChunk: index === validChunks.length - 1,
        totalChunks: validChunks.length
      }));
  
      chunks.push(...finalChunks);
      
      // 更新当前Top位置（基于有效分块）
      currentTop = finalChunks.reduce((acc, cur) => acc + cur.height, currentTop);
    });
  
    return chunks;
  };

  // 新增：智能计算总分块数
  const calculateTotalChunks = (
    message: Message,
    codeBlocks: [number, number][]
  ): number => {
    // 用户消息根据文本长度估算
    if (message.type === 'user') {
      return Math.ceil((message.text.length || 0) / 1000); // 每1000字符分一块
    }

    // Bot消息根据代码块数量决定
    if (codeBlocks.length > 0) {
      return codeBlocks.length; // 每个代码块单独分块
    }

    // 普通HTML内容根据预估高度
    const baseChunks = Math.ceil(
      (message.formattedText?.length || 0) / 2000 // 每2000字符分一块
    );
    return Math.max(1, baseChunks);
  };

  // 新增内容分割函数
  const getChunkContent = (
    message: Message,
    chunkIndex: number,
    totalChunks: number,
    codeBlocks: [number, number][] = []
  ): string => {
    // 用户消息处理（纯文本）
    if (message.type === 'user') {
      const [start, end] = getTextSplitRange(message.text, chunkIndex, totalChunks);
      return message.text.slice(start, end);
    }

    // Bot消息处理（HTML内容）
    if (!message.formattedText) return '';

    const content = message.formattedText;
    const length = content.length;

    // 首次分割时检测代码块
    if (chunkIndex === 0 && codeBlocks.length === 0) {
      codeBlocks = detectCodeBlocks(content);
    }

    // 修正初始分割点计算
  let splitPos = Math.floor((length / totalChunks) * chunkIndex); // 使用floor避免为0

  // 智能调整分割点（新增最小值保护）
  let safeSplitPos = Math.max(
    findSafeSplitPosition(content, splitPos, codeBlocks),
    50 // 保证至少有50字符内容
  );
  
  return chunkIndex === totalChunks - 1 
    ? content 
    : content.slice(0, safeSplitPos);
  };

  const findSafeSplitPosition = (
    html: string,
    initialPos: number,
    codeBlocks: [number, number][]
  ): number => {
    let pos = Math.max(initialPos, 1); // 确保至少从位置1开始
    
    // 优先检查代码块边界
    const inCodeBlock = codeBlocks.find(([s, e]) => s < pos && e > pos);
    if (inCodeBlock) return inCodeBlock[1];
  
    // 新增段落边界检测
    const paragraphEnd = html.lastIndexOf('</p>', pos);
    if (paragraphEnd > 0) return paragraphEnd + 4;
  
    // 查找最近的句子结束点
    const sentenceEnd = Math.max(
      html.lastIndexOf('. ', pos),
      html.lastIndexOf('。', pos)
    );
    if (sentenceEnd > 0) return sentenceEnd + 1;
  
    // 保底逻辑：向前查找最近的空格
    while (pos > 0 && html[pos] !== ' ') pos--;
    
    return pos > 0 ? pos : initialPos;
  };

  // 将消息分块并计算位置
  const allVirtualChunks = useMemo(() => {
    return createVirtualChunks(messages);
  }, [messages, createVirtualChunks, messageHeights]);

  // 计算总高度
  const totalHeight = useMemo(() => {
    if (allVirtualChunks.length === 0) return 0;
    const lastChunk = allVirtualChunks[allVirtualChunks.length - 1];
    return lastChunk.top + lastChunk.height;
  }, [allVirtualChunks]);

  // 根据滚动位置确定可见的分块
  const visibleChunks = useMemo(() => {
    if (containerHeight === 0) {
      // 初始渲染或容器高度未测量时，返回前几个块
      return allVirtualChunks.slice(0, 10);
    }

    // 找到可见区域内的分块
    const visibleStartIndex = allVirtualChunks.findIndex(
      (chunk) => (chunk.top + chunk.height) > (scrollTop - STANDARD_CHUNK_HEIGHT * OVERSCAN_COUNT)
    );

    const visibleEndIndex = allVirtualChunks.findIndex(
      (chunk) => chunk.top > (scrollTop + containerHeight + STANDARD_CHUNK_HEIGHT * OVERSCAN_COUNT)
    );

    const startIndex = Math.max(0, visibleStartIndex === -1 ? 0 : visibleStartIndex);
    const endIndex = visibleEndIndex === -1 ? allVirtualChunks.length : visibleEndIndex;

    return allVirtualChunks.slice(startIndex, endIndex);
  }, [allVirtualChunks, scrollTop, containerHeight]);

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
      {/* 设置内容容器的总高度，确保滚动正常 */}
      <div style={{ height: totalHeight, position: 'absolute', width: '100%', pointerEvents: 'none' }} />

      {/* 渲染可见的消息块 */}
      {visibleChunks.map((chunk) => {
        const {
          messageIndex,
          chunkIndex,
          isFirstChunk,
          isLastChunk,
          totalChunks,
          top,
          height,
          message,
          text,
          formattedText,
          imageUrls
        } = chunk;

        // 创建唯一的块ID
        const chunkId = `msg-${messageIndex}-chunk-${chunkIndex}`;

        return (
          <div
            key={chunkId}
            id={chunkId}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              transform: `translateY(${top}px)`,
              width: '100%',
              padding: '4px 10px',
            }}
            ref={(el) => {
              if (el) {
                // 使用 requestAnimationFrame 避免在渲染过程中更新状态
                requestAnimationFrame(() => {
                  const newHeight = el.getBoundingClientRect().height;
                  if (newHeight > 0 && Math.abs(newHeight - height) > 5) {
                    measureChunkHeight(chunkId, newHeight);
                  }
                });
              }
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start',
                width: '100%',
                alignItems: 'flex-start',
                mb: isLastChunk ? 2 : 0,
                mt: !isFirstChunk ? 0 : undefined,
              }}
            >
              {/* 只在首个分块上显示复选框 */}
              {message.type === 'user' && isFirstChunk && (
                <Tooltip title="选择记忆上下文" arrow>
                  <Checkbox
                    checked={selectedIndexes.includes(messageIndex)}
                    onChange={() => handleCheckboxChange(messageIndex)}
                    sx={{ mr: 1 }}
                  />
                </Tooltip>
              )}

              <Paper
                ref={(el) => {
                  if (el && isLastChunk) { // 只在最后一个分块测量完整消息高度
                    // 使用 requestAnimationFrame 避免在渲染过程中更新状态
                    requestAnimationFrame(() => {
                      const height = el.offsetHeight;
                      if (height > 0) {
                        measureMessageHeight(messageIndex, height);
                      }
                    });
                  }
                }}
                sx={{
                  p: 1.25,
                  maxWidth: isMobile ? '85%' : (imageUrls && imageUrls.length > 1 ? '100%' : '800px'),
                  width: 'auto',
                  bgcolor: message.type === 'user' ? '#d1e7ff' : '#fff',
                  boxShadow: message.type === 'user' ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
                  borderRadius: totalChunks > 1
                    ? isFirstChunk
                      ? isLastChunk ? 1 : '4px 4px 0 0'
                      : isLastChunk
                        ? '0 0 4px 4px'
                        : 0
                    : 1,
                  mt: !isFirstChunk ? -1 : 0,
                }}
              >
                {message.type === 'user' ? (
                  <>
                    {/* 用户图片消息 - 仅在第一块显示 */}
                    {imageUrls && imageUrls.length > 0 && (
                      <Box sx={{ width: '100%', textAlign: 'center', mt: 2 }}>
                        <Grid container spacing={2} justifyContent="center">
                          {imageUrls.map((url, imgIndex) => (
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
                                  loading="lazy"
                                  alt={`用户上传的图片 ${imgIndex + 1}`}
                                  style={{
                                    height: imageUrls.length > 1 ? '200px' : '300px',
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
                    {/* 用户文本消息 */}
                    {text && (
                      <Typography sx={{ color: '#000', whiteSpace: 'pre-wrap' }}>{text}</Typography>
                    )}
                  </>
                ) : imageUrls ? (
                  // AI图片消息 - 仅在第一块显示
                  <Box sx={{ width: '100%', textAlign: 'center' }}>
                    <Grid container spacing={2} justifyContent="center">
                      {imageUrls.map((url, imgIndex) => (
                        <Grid item xs={12} sm={imageUrls.length > 1 ? 6 : 12} key={imgIndex}>
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
                              loading="lazy"
                              style={{
                                width: '100%',
                                maxHeight: imageUrls.length > 1 ? '400px' : '600px',
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
                      由大模型生成的图片
                    </Typography>
                  </Box>
                ) : (
                  // AI文本消息
                  <div
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: formattedText || text }}
                  />
                )}
              </Paper>

              {/* 只在首个分块上显示复选框 */}
              {message.type === 'bot' && isFirstChunk && (
                <Tooltip title="选择记忆上下文" arrow>
                  <Checkbox
                    checked={selectedIndexes.includes(messageIndex)}
                    onChange={() => handleCheckboxChange(messageIndex)}
                    sx={{ ml: 1 }}
                  />
                </Tooltip>
              )}
            </Box>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </Box>
  );
};

export default MessageList;
