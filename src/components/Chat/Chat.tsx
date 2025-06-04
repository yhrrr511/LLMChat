import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Typography,
  Snackbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Divider,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { marked } from 'marked';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { useNavigate } from 'react-router-dom';
import ModelSelector from './ModelSelector';
import MessageList from './MessageList';
// import MessageList from './MessageList2';
// import MessageList from './MessageList3';
import InputArea from './InputArea';

import '../../styles/Chat.scss'
import '../../styles/Markdown.scss';
import '../../styles/CodeHighlight.scss';

interface Message {
  type: 'user' | 'bot';
  text: string;
  formattedText?: string;
  imageUrls?: string[];
}

interface ChatHistory {
  id: string;
  title: string;
  date: string;
}

interface DalleSettings {
  imageCount: number;
  imageSize: string;
}

interface ImagePreview {
  id: string;
  base64: string;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedIndexes, setSelectedIndexes] = useState<number[]>([]);
  const navigate = useNavigate();
  // const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCopyHint, setShowCopyHint] = useState(false);
  const [error, setError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const API_KEY = 'sk-zk2a25f41cc835440b0d2ac912b92da794a677faa6970365';  //zzz
  // const API_KEY = 'b496c98f-f1f0-492e-a26e-e770b2f74b34';  //火山
  const API_URL = 'https://api.zhizengzeng.com/v1/chat/completions';  //zzz
  // const API_URL = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions';
  const [dalleSettings, setDalleSettings] = useState<DalleSettings>({
    imageCount: 1,
    imageSize: '1024x1024',
  });
  const [onlyShowThinking, setOnlyShowThinking] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [controller, setController] = useState<AbortController | null>(null);

  // 模拟历史聊天记录
  const [chatHistory] = useState<ChatHistory[]>([
    { id: '1', title: '关于React的讨论', date: '2024-03-20' },
    { id: '2', title: '数据结构学习', date: '2024-03-19' },
    { id: '3', title: 'TypeScript问题解答', date: '2024-03-18' },
  ]);

  // 监听滚动事件
  // useEffect(() => {
  //   const messageList = messageListRef.current;
  //   if (!messageList) return;

  //   const handleScroll = () => {
  //     const { scrollHeight, clientHeight, scrollTop } = messageList;
  //     const maxScroll = scrollHeight - clientHeight;
  //     const isNearBottom = maxScroll - scrollTop < 100;
  //     setShouldAutoScroll(isNearBottom);
  //   };

  //   messageList.addEventListener('scroll', handleScroll);
  //   return () => messageList.removeEventListener('scroll', handleScroll);
  // }, []);

  useEffect(() => {
    // console.log('loading 状态变化:', loading);
    const messageList = messageListRef.current;
    if (!messageList) return;

    const handleScroll = () => {
      const { scrollHeight, clientHeight, scrollTop } = messageList;
      const maxScroll = scrollHeight - clientHeight;
      const isNearBottom = maxScroll - scrollTop < 100;
      setShouldAutoScroll(isNearBottom && loading);
    };

    messageList.addEventListener('scroll', handleScroll);
    return () => messageList.removeEventListener('scroll', handleScroll);
  }, [loading]);

  const drawerWidth = 260;

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleModelChange = (event: any) => {
    setSelectedModel(event.target.value);
  };

  const handleOnlyShowThinkingChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setOnlyShowThinking(event.target.checked);
  };

  // 配置marked
  useEffect(() => {
    const markedOptions = {
      breaks: true,
      gfm: true,
      highlight: function(code: string, language: string | undefined) {
        if (language) {
          try {
            return hljs.highlight(code, {
              language: language || 'plaintext',
              ignoreIllegals: true
            }).value;
          } catch (err) {
            console.error('代码高亮失败:', err);
          }
        }
        // 如果没有指定语言或高亮失败，使用自动检测
        return hljs.highlightAuto(code).value;
      }
    };

    // @ts-ignore
    marked.setOptions(markedOptions);
  }, []);

  // 自动滚动和高亮
  useEffect(() => {
    scrollToBottom();
  }, [messages, shouldAutoScroll]);

  const scrollToBottom = () => {
    // console.log('scrollToBottom:',shouldAutoScroll)
    if (!shouldAutoScroll) return;
    
    const messageList = messageListRef.current;
    if (messageList) {
      const { scrollHeight, clientHeight, scrollTop } = messageList;
      const maxScroll = scrollHeight - clientHeight;
      const isNearBottom = maxScroll - scrollTop < 150;
      
      if (isNearBottom) {
        messageList.scrollTo({
          top: scrollHeight,
          behavior: 'smooth'
        });
      }
    }
  };

  // 格式化响应
  const formatResponse = (text: string): string => {
    // console.log('formatResponse:', text);
    const normalized = text
      .replace(/\\\[/g, '$$')
      .replace(/\\\]/g, '$$')
      .replace(/\\\(/g, '$')
      .replace(/\\\)/g, '$');

    try {
      // 先将数学公式替换为占位符
      let mathExpressions: string[] = [];
      let thinkBlocks: string[] = []; // 存储 <think> 内容
      let tempHtml = normalized.replace(/(\$\$[\s\S]*?\$\$|\$[^$\n]*?\$)/g, (match) => {
        mathExpressions.push(match);
        return `MATH_EXPRESSION_${mathExpressions.length - 1}`;
      });

      // **步骤 2**: 处理 <think>...</think> 结构，转换为 <span class="think-style">...</span>
      tempHtml = tempHtml.replace(/<think>([\s\S]*?)<\/think>/g, (match, content) => {
        thinkBlocks.push(content);
        return `THINK_BLOCK_${thinkBlocks.length - 1}`;
      });

      // 使用marked处理Markdown
      tempHtml = marked.parse(tempHtml) as string;

      tempHtml = tempHtml.replace(/THINK_BLOCK_(\d+)/g, (_, index) => {
        return `<span class="think-style">${thinkBlocks[parseInt(index)]}</span><br>`;
      });

      // 将数学公式重新插入，并用KaTeX渲染
      tempHtml = tempHtml.replace(/MATH_EXPRESSION_(\d+)/g, (_, index) => {
        const match = mathExpressions[parseInt(index)];
        try {
          const displayMode = match.startsWith('$$');
          return katex.renderToString(match.replace(/\$/g, ''), {
            displayMode,
            throwOnError: false
          });
        } catch (e) {
          return `<span class="katex-error">${match}</span>`;
        }
      });

      // 清理所有数学公式周围的br标签
      return tempHtml.replace(/<br\s*\/?>\s*(<span class="katex(?:-display)?">[\s\S]*?<\/span>)\s*<br\s*\/?>/g, '$1');
    } catch (err) {
      return text;
    }
  };

  // 复制代码功能
  const copyCode = (code: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setShowCopyHint(true);
        setTimeout(() => setShowCopyHint(false), 2000);
      }).catch((err) => {
        fallbackCopy(code);
      });
    } else {
      fallbackCopy(code);
    }
  };
  
  // 备用的 document.execCommand 方案
  const fallbackCopy = (text: string) => {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
    setShowCopyHint(true);
    setTimeout(() => setShowCopyHint(false), 2000);
  };

  // 应用代码高亮和工具栏
  const applyCodeHighlight = () => {
    // console.log('applyCodeHighlight')
    requestAnimationFrame(() => {
      const codeBlocks = document.querySelectorAll('pre code');
      // console.log('codeBlocks:',codeBlocks)
      codeBlocks.forEach((block) => {
        if (block instanceof HTMLElement && !block.classList.contains('hljs')) {
          // console.log('========',block)
          hljs.highlightElement(block);
          
          const pre = block.parentElement;
          if (pre && !pre.querySelector('.code-toolbar')) {
            const toolbar = document.createElement('div');
            toolbar.className = 'code-toolbar';
            
            const className = block.className;
            const langMatch = className.match(/language-(\w+)/);
            const lang = langMatch ? langMatch[1] : 'plaintext';
            toolbar.setAttribute('data-language', lang);

            const copyButton = document.createElement('button');
            copyButton.className = 'copy-button';
            copyButton.textContent = '复制';
            copyButton.onclick = () => copyCode(block.textContent || '');
            
            toolbar.appendChild(copyButton);
            pre.insertBefore(toolbar, pre.firstChild);
          }
        }
      });
    });
  };

  // 监听 DOM 变化
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      const hasRelevantChanges = mutations.some(mutation => 
        Array.from(mutation.addedNodes).some(node => 
          node instanceof HTMLElement && 
          (node.querySelector('pre code') || node.matches('pre code'))
        )
      );

      if (hasRelevantChanges) {
        // console.log('hasRelevantChanges:', hasRelevantChanges);
        applyCodeHighlight();
      }
    });

    const messageList = messageListRef.current;
    if (messageList) {
      observer.observe(messageList, { 
        childList: true, 
        subtree: true,
        // attributes: true,
        // characterData: true 
      });
    }

    // 初始应用高亮
    applyCodeHighlight();

    return () => observer.disconnect();
  }, [messages]); // 添加 messages 作为依赖，确保在消息更新时重新设置观察者

  // 处理选中的消息索引
  const handleSelectMessages = (selected: number[]) => {
    setSelectedIndexes(selected);
  };


  const handleSend = async (e: React.FormEvent, inputText: string) => {
    e.preventDefault();

    // 检查是否有图片且模型是否为 gpt-4o
    if (imagePreviews.length > 0 && !['gpt-4o-mini','gpt-4o','o1-preview','gpt-4.5-preview','gpt-4.1','gpt-4.1-mini','claude-3-7-sonnet-20250219','claude-3-7-sonnet-thinking',
      'claude-3-5-sonnet-20241022','grok-3'
    ].includes(selectedModel)) {
      alert('图片内容需要选择 gpt系列/claude系列/grok系列 模型');
      return; // 停止发送
    }

    if ((!inputText.trim() && selectedIndexes.length === 0) || loading) return;
  
    const userMessage: Message = {
      type: 'user',
      text: inputText.trim(),
      imageUrls: imagePreviews.map(item => item.base64),
    };
  
    if(inputText.trim()){
      setMessages((prev) => [...prev, userMessage]);
    }
    setLoading(true);
    setError('');
    setImagePreviews([]);
  
    // 创建新的 AbortController 实例并赋值给 controller
    const controller = new AbortController();
    setController(controller);
    const { signal } = controller;
  
    try {
      let response;
      let requestBody;
  
      if (selectedModel === 'dall-e-3' || selectedModel === 'gpt-image-1') {
        // DALL·E 3 图片生成请求
        requestBody = {
          model: 'dall-e-3',
          prompt: inputText.trim(),
          n: dalleSettings.imageCount,
          size: dalleSettings.imageSize,
        };
  
        const fetchOptions: RequestInit = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
          },
          body: JSON.stringify(requestBody),
          signal: signal,
        };
  
        response = await fetch('https://api.zhizengzeng.com/v1/images/generations', fetchOptions);
  
        const result = await response.json();
        if (result?.data?.length > 0) {
          const imageUrls = result.data.map((item: any) => item.url);
  
          const botMessage: Message = {
            type: 'bot',
            text: '图片生成成功',
            imageUrls: imageUrls,
          };
  
          setMessages((prev) => [...prev, botMessage]);
        } else {
          throw new Error('图片生成失败');
        }
      } else {
        // 处理文本对话的请求
        // console.log("选择的信息",selectedIndexes)
        // return
        requestBody = {
          messages: [
            { role: 'system', content: 'You are a helpful assistant.' },
            ...selectedIndexes.map((index) => {
              const message = messages[index]; // 获取对应索引的消息对象
              if (!message) return null; // 兜底处理，避免索引错误
              return {
                role: message.type === 'user' ? 'user' : 'assistant',
                content: [
                  {
                    type: 'text',
                    text: message.text,
                  },
                  ...(message.imageUrls || []).map((url, _) => ({
                    type: 'image_url',
                    image_url: {
                      url: url,
                    },
                  })),
                ], // 使用 `text` 作为内容
              };
            }).filter(Boolean), // 过滤掉可能为 `null` 的情况
            ...(inputText.trim() ? [{ role: 'user', content: [
              {
                type: 'text',
                text: inputText.trim(),
              },
              ...imagePreviews.map((image, _) => ({
                type: 'image_url',
                image_url: {
                  url: image.base64,
                },
              })),
            ] }] : []), // 判断 input 是否为空
          ],
          model: selectedModel,
          // model: 'deepseek-v3-241226',
          // model: 'deepseek-r1-250120',
          stream: true,
        };
  
        const fetchOptions: RequestInit = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_KEY}`,
          },
          body: JSON.stringify(requestBody),
          signal: signal,
        };
  
        response = await fetch(API_URL, fetchOptions);
  
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let responseText = '';
        let reasoningIndex = 0;
  
        const botMessage: Message = {
          type: 'bot',
          text: '',
          formattedText: '',
        };
        setMessages((prev) => [...prev, botMessage]);
  
        while (reader) {
          const { done, value } = await reader.read();
          if (done) {
            setTimeout(() => {
              setMessages((prev) =>
                prev.map((msg, idx) =>
                  idx === prev.length - 1
                    ? { ...msg, text: responseText, formattedText: formatResponse(responseText) }
                    : msg
                )
              );
            }, 0);
            break;
          }
  
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
  
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
  
            const jsonStr = trimmedLine.replace('data: ', '').trim();
            if (!jsonStr || jsonStr === '[DONE]') continue;
  
            try {
              const result = JSON.parse(jsonStr);
              const content = result.choices?.[0]?.delta?.content || '';
              const reasoningContent = result.choices?.[0]?.delta?.reasoning_content || '';
              if (reasoningContent && reasoningIndex === 0) {
                responseText += "<think>" + reasoningContent + "</think>";
                reasoningIndex++;
              }else if (reasoningContent && reasoningIndex > 0) {
                responseText = responseText.slice(0, responseText.length-8) + reasoningContent + "</think>";
              }
              if (content) {
                responseText += content;
                reasoningIndex++;
              }
  
              // 检查是否存在 <think> 和 </think>，如果存在则取消请求
              if (onlyShowThinking && (content.includes('</think>') || (responseText.includes('</think>') && reasoningIndex > 1))) {
                handleCancelRequest(); // 取消请求
                setMessages((prev) =>
                  prev.map((msg, idx) =>
                    idx === prev.length - 1
                      ? { ...msg, text: responseText, formattedText: formatResponse(responseText) }
                      : msg
                  )
                );
                return; // 返回后不再继续处理
              }

              setMessages((prev) =>
                prev.map((msg, idx) =>
                  idx === prev.length - 1
                    ? { ...msg, text: responseText, formattedText: formatResponse(responseText) }
                    : msg
                )
              );
            } catch (error) {
              console.warn('JSON解析失败:', error);
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('请求已被取消');
      } else {
        setError(`请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
        setTimeout(() => setError(''), 5000);
      }
    } finally {
      // console.log('请求结束:',loading)
      setLoading(false);
    }
  };

  // 取消请求的处理函数
  const handleCancelRequest = () => {
    if (controller) {
      controller.abort(); // 取消请求
      console.log('请求已被取消',loading)
      setLoading(false); // 设置加载状态为 false
      setController(null);
    }
  };

  const handleImageCountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (value >= 1 && value <= 4) {
      setDalleSettings(prev => ({ ...prev, imageCount: value }));
    }
  };

  const handleImageSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setDalleSettings(prev => ({ ...prev, imageSize: event.target.value }));
  };

  const handleFileUpload = (fileOrEvent: File | React.ChangeEvent<HTMLInputElement>) => {
    let file: File | null = null;
  
    // 判断传入的参数是 File 还是事件对象
    if (fileOrEvent instanceof File) {
      file = fileOrEvent; // 直接使用 File 对象
    } else if (fileOrEvent.target?.files?.[0]) {
      file = fileOrEvent.target.files[0]; // 从事件对象中获取 File
    }
  
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        console.log('File uploaded:', e);
        const base64 = e.target?.result as string;
        const newImagePreview = {
          id: Date.now().toString(), // 使用时间戳作为唯一标识
          base64,
        };
        setImagePreviews((prev) => [...prev, newImagePreview]); // 更新状态
  
        // 如果是通过文件输入框上传，清空 input 的 value
        if (!(fileOrEvent instanceof File) && fileOrEvent.target) {
          fileOrEvent.target.value = ''; // 清空 input 的值
        }
      };
      reader.readAsDataURL(file); // 将文件转换为 Base64
    }
  };

  return (
    <Box sx={{ 
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      bgcolor: '#f9f9f9',
    }}>
      {/* 侧边栏 */}
      <Box
        sx={{
          width: drawerOpen ? drawerWidth : 0,
          flexShrink: 0,
          overflow: 'hidden',
          transition: 'width 225ms cubic-bezier(0.4, 0, 0.6, 1) 0ms',
        }}
      >
        <Drawer
          variant="persistent"
          anchor="left"
          open={drawerOpen}
          sx={{
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: '#f8f9fa',
              borderRight: '1px solid #e0e0e0',
              position: 'relative',
            },
          }}
        >
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            p: 2,
            borderBottom: '1px solid #e0e0e0'
          }}>
            <Typography variant="h6" sx={{ color: '#1a73e8' }}>历史记录</Typography>
            <IconButton onClick={handleDrawerToggle}>
              <ChevronLeftIcon />
            </IconButton>
          </Box>
          <List>
            {chatHistory.map((chat) => (
              <React.Fragment key={chat.id}>
                <ListItem component="div" sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.08)' } }}>
                  <ListItemText 
                    primary={chat.title}
                    secondary={chat.date}
                    primaryTypographyProps={{
                      style: { 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }
                    }}
                  />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </Drawer>
      </Box>

      {/* 主要内容区域 */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <ModelSelector
          drawerOpen={drawerOpen}
          selectedModel={selectedModel}
          handleDrawerToggle={handleDrawerToggle}
          handleModelChange={handleModelChange}
          onlyShowThinking={onlyShowThinking}
          handleOnlyShowThinkingChange={handleOnlyShowThinkingChange}
        />

        <Box sx={{ 
          height: 'calc(100vh - 72px)',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#f9f9f9',
        }}>
          <MessageList
            messages={messages}
            messageListRef={messageListRef}
            messagesEndRef={messagesEndRef}
            onSelect={handleSelectMessages}
          />

          <InputArea
            // input={input}
            loading={loading}
            selectedModel={selectedModel}
            dalleSettings={dalleSettings}
            // setInput={setInput}
            handleSend={handleSend}
            handleImageCountChange={handleImageCountChange}
            handleImageSizeChange={handleImageSizeChange}
            handleFileUpload={handleFileUpload}
            selectedIndexes={selectedIndexes}
            imagePreviews={imagePreviews} // 将预览数据传递给子组件
            handleCancelRequest={handleCancelRequest}
            onDeleteImage={(id:string) => {
              setImagePreviews((prev) => prev.filter((img) => img.id !== id));
            }}
          />
        </Box>
      </Box>

      <Snackbar
        open={showCopyHint}
        message="已复制！"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
        }}
      />

      <Snackbar
        open={!!error}
        message={error}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
    </Box>
  );
};

export default Chat; 