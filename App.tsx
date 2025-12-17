import React, { useState, useRef, useEffect } from 'react';
import { Message, ChatSession, ToolType } from './types';
import { sendMessageStream, generateImage, generateChatTitle, hasApiKey } from './services/geminiService';
import MessageBubble from './components/MessageBubble';
import InputArea from './components/InputArea';
import CallOverlay from './components/CallOverlay';
import AIStudio from './components/AIStudio';
import SettingsModal from './components/SettingsModal';
import WelcomeScreen from './components/WelcomeScreen';
import { Sparkles, Trash2, Menu, X, MessageSquare, Plus, Moon, Sun, Monitor, ArrowUp, Bot, Phone, Search, ArchiveX, Cpu, Settings, Edit2, Download, AlertCircle } from 'lucide-react';
import { APP_NAME } from './constants';

const STORAGE_KEY = 'unified_ai_sessions_v1';
const THEME_KEY = 'unified_ai_theme';
const MESSAGES_PER_PAGE = 20;

const App: React.FC = () => {
  // Theme State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // View Mode & Settings
  const [viewMode, setViewMode] = useState<'chat' | 'studio'>('chat');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [missingKeyError, setMissingKeyError] = useState(false);

  // Load sessions from local storage
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return parsed.map((session: any) => ({
        ...session,
        messages: session.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
          isStreaming: false,
        })),
      })).sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt);
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  });

  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCallMode, setIsCallMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Editing Title State
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [editingTitleText, setEditingTitleText] = useState('');
  
  // Pagination State
  const [visibleCount, setVisibleCount] = useState(MESSAGES_PER_PAGE);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageIdRef = useRef<string | null>(null);

  // Apply Theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
  }, [isDarkMode]);

  // Reset pagination when switching sessions
  useEffect(() => {
    setVisibleCount(MESSAGES_PER_PAGE);
    lastMessageIdRef.current = null;
  }, [activeSessionId]);

  // Check for API Key on mount
  useEffect(() => {
     if (!hasApiKey()) {
        setIsSettingsOpen(true);
     }
  }, []);

  // Derive current messages based on active session and pagination
  const activeSession = activeSessionId ? sessions.find(s => s.id === activeSessionId) : null;
  const allMessages = activeSession?.messages || [];
  
  // Get the slice of messages to display (last X messages)
  const currentMessages = allMessages.slice(-visibleCount);
  const hasMoreMessages = allMessages.length > visibleCount;

  // Filter sessions based on search term
  const filteredSessions = sessions.filter(session => {
    const term = searchTerm.toLowerCase();
    const titleMatch = session.title.toLowerCase().includes(term);
    // Also search inside message content
    const contentMatch = session.messages.some(msg => msg.content.toLowerCase().includes(term));
    return titleMatch || contentMatch;
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Optimized Scroll Effect
  useEffect(() => {
    if (viewMode === 'chat') {
        const lastMsg = currentMessages[currentMessages.length - 1];
        const isNewMessageAtBottom = lastMsg?.id !== lastMessageIdRef.current;

        if (isLoading || isNewMessageAtBottom) {
        scrollToBottom();
        }

        if (lastMsg) {
        lastMessageIdRef.current = lastMsg.id;
        }
    }
  }, [currentMessages, isLoading, viewMode]);

  // Persist sessions
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error: any) {
       console.error('Error saving sessions:', error);
    }
  }, [sessions]);

  const handleNewChat = () => {
    setActiveSessionId(null);
    setIsSidebarOpen(false); 
    setSearchTerm('');
    setViewMode('chat'); 
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    setIsSidebarOpen(false); 
    setViewMode('chat');
  };

  const handleLoadMore = () => {
    setVisibleCount(prev => prev + MESSAGES_PER_PAGE);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault(); 
    if (window.confirm('Tem certeza que deseja apagar permanentemente esta conversa?')) {
      const newSessions = sessions.filter(s => s.id !== id);
      setSessions(newSessions);
      if (activeSessionId === id) {
        setActiveSessionId(null);
      }
    }
  };

  // Chat Title Editing
  const startEditingTitle = (e: React.MouseEvent, session: ChatSession) => {
    e.stopPropagation();
    e.preventDefault();
    setEditingTitleId(session.id);
    setEditingTitleText(session.title);
  };

  const saveTitle = (id: string) => {
    if (editingTitleText.trim()) {
      setSessions(prev => prev.map(s => s.id === id ? { ...s, title: editingTitleText.trim() } : s));
    }
    setEditingTitleId(null);
  };

  // Chat Export
  const handleExportChat = () => {
    if (!activeSession) return;
    
    const content = activeSession.messages.map(m => {
      const role = m.role === 'user' ? 'User' : 'Ditto AI';
      return `### ${role} (${m.timestamp.toLocaleString()}):\n${m.content}\n\n`;
    }).join('---\n\n');

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${activeSession.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClearAllHistory = () => {
    if (window.confirm('ATENÇÃO: Isso apagará TODO o histórico de conversas e não pode ser desfeito. Continuar?')) {
      setSessions([]);
      setActiveSessionId(null);
      localStorage.removeItem(STORAGE_KEY);
      setIsSidebarOpen(false);
    }
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // Special handler for Call Overlay
  const handleCallMessage = async (text: string): Promise<string> => {
    setViewMode('chat');
    
    // 1. Determine or create session
    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: sessionId,
        title: "Chamada de Voz " + new Date().toLocaleTimeString(),
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(sessionId);
    }

    // 2. Add User Message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return { ...session, messages: [...session.messages, userMessage], updatedAt: Date.now() };
      }
      return session;
    }));

    // 3. Add Bot Placeholder
    const botMessageId = (Date.now() + 1).toString();
    setSessions(prev => prev.map(session => {
      if (session.id === sessionId) {
        return {
          ...session,
          messages: [...session.messages, {
            id: botMessageId,
            role: 'model',
            content: '',
            timestamp: new Date(),
            isStreaming: true,
          }],
        };
      }
      return session;
    }));

    // 4. Call API
    let fullResponse = '';
    try {
      const history = sessions.find(s => s.id === sessionId)?.messages || [];
      const stream = await sendMessageStream(text, undefined, sessionId, history, 'none');
      
      for await (const chunk of stream) {
        fullResponse += chunk.text;
        setSessions(prev => prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              messages: session.messages.map(msg => 
                msg.id === botMessageId ? { ...msg, content: fullResponse } : msg
              ),
            };
          }
          return session;
        }));
      }

      setSessions(prev => prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            messages: session.messages.map(msg => 
              msg.id === botMessageId ? { ...msg, isStreaming: false } : msg
            ),
          };
        }
        return session;
      }));

      return fullResponse;

    } catch (e) {
      console.error(e);
      setMissingKeyError(true);
      return "Ocorreu um erro. Verifique sua chave de API nas configurações.";
    }
  };
  
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeSessionId) return;
    const sessionId = activeSessionId;

    setIsLoading(true);

    let updatedSession: ChatSession | undefined;
    let messagesContext: Message[] = [];
    let mediaForRequest: { data: string, mimeType: string } | undefined;

    setSessions(prev => {
      const sessionIndex = prev.findIndex(s => s.id === sessionId);
      if (sessionIndex === -1) return prev;

      const session = prev[sessionIndex];
      const messageIndex = session.messages.findIndex(m => m.id === messageId);
      
      if (messageIndex === -1) return prev;

      // Truncate history after the edited message
      const truncatedMessages = session.messages.slice(0, messageIndex + 1);
      
      // Update content of the targeted user message
      truncatedMessages[messageIndex] = {
        ...truncatedMessages[messageIndex],
        content: newContent,
        timestamp: new Date() // optional: update timestamp to show it was changed
      };

      // Extract media from the edited message if it exists (so we don't lose the image context)
      const editedMsg = truncatedMessages[messageIndex];
      if (editedMsg.media && editedMsg.mimeType) {
        mediaForRequest = {
           data: editedMsg.media,
           mimeType: editedMsg.mimeType
        };
      }
      
      // Prepare history for API (messages BEFORE the edited one)
      messagesContext = truncatedMessages.slice(0, messageIndex);

      updatedSession = {
        ...session,
        messages: truncatedMessages,
        updatedAt: Date.now()
      };

      const newSessions = [...prev];
      newSessions[sessionIndex] = updatedSession;
      return newSessions;
    });

    // Add Bot Placeholder
    const botMessageId = (Date.now() + 1).toString();
    setSessions(prev => prev.map(s => {
       if (s.id === sessionId) {
         return {
           ...s,
           messages: [...s.messages, {
             id: botMessageId,
             role: 'model',
             content: '',
             timestamp: new Date(),
             isStreaming: true
           }]
         };
       }
       return s;
    }));

    try {
      // Re-send to API
      // Note: We pass 'none' as tool because we don't track the original tool used. 
      // Ideally, we could store the tool used in the message object, but for now 'none' is a safe default or auto-detection kicks in.
      const stream = await sendMessageStream(newContent, mediaForRequest, sessionId, messagesContext, 'none');

      let fullContent = '';
      let currentMetadata = null;

      for await (const chunk of stream) {
        fullContent += chunk.text;
        if (chunk.groundingMetadata) currentMetadata = chunk.groundingMetadata;

        setSessions(prev => prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              messages: session.messages.map(msg => 
                msg.id === botMessageId 
                  ? { ...msg, content: fullContent, groundingMetadata: currentMetadata } 
                  : msg
              ),
            };
          }
          return session;
        }));
      }

      setSessions(prev => prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            messages: session.messages.map(msg => 
              msg.id === botMessageId 
                ? { ...msg, isStreaming: false } 
                : msg
            ),
          };
        }
        return session;
      }));

    } catch (error) {
       console.error("Error regenerating response:", error);
       setSessions(prev => prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            messages: session.messages.map(msg => 
              msg.id === botMessageId
                ? { ...msg, content: 'Erro ao regenerar resposta.', isStreaming: false } 
                : msg
            ),
          };
        }
        return session;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (
    text: string, 
    tool: ToolType, 
    media?: { data: string, mimeType: string, type: 'image' | 'video' | 'audio' }
  ) => {
    setIsLoading(true);
    setMissingKeyError(false);
    let sessionId = activeSessionId;

    const mediaForStorage = media ? media.data.split(',')[1] : undefined; 
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: text,
      timestamp: new Date(),
      media: mediaForStorage, 
      mediaType: media?.type,
      mimeType: media?.mimeType
    };

    if (!sessionId) {
      sessionId = Date.now().toString();
      const newSession: ChatSession = {
        id: sessionId,
        title: "Nova Conversa...", 
        messages: [userMessage],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setSessions(prev => [newSession, ...prev]);
      setActiveSessionId(sessionId);
    } else {
      setSessions(prev => prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            messages: [...session.messages, userMessage],
            updatedAt: Date.now(),
          };
        }
        return session;
      }).sort((a, b) => b.updatedAt - a.updatedAt));
    }

    const botMessageId = (Date.now() + 1).toString();

    try {
      setSessions(prev => prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            messages: [...session.messages, {
              id: botMessageId,
              role: 'model',
              content: '',
              timestamp: new Date(),
              isStreaming: true,
            }],
          };
        }
        return session;
      }));

      if (tool === 'imageGeneration') {
        const base64Image = await generateImage(text, media);
        
        setSessions(prev => prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              messages: session.messages.map(msg => 
                msg.id === botMessageId 
                  ? { 
                      ...msg, 
                      content: `Aqui está uma imagem gerada para: "${text}"`, 
                      media: base64Image,
                      mediaType: 'image',
                      mimeType: 'image/jpeg',
                      isStreaming: false 
                    } 
                  : msg
              ),
            };
          }
          return session;
        }));

      } else {
        const history = sessions.find(s => s.id === sessionId)?.messages || [];
        const serviceMedia = media ? { data: media.data, mimeType: media.mimeType } : undefined;
        const stream = await sendMessageStream(text, serviceMedia, sessionId, history, tool);

        let fullContent = '';
        let currentMetadata = null;
        
        for await (const chunk of stream) {
          fullContent += chunk.text;
          if (chunk.groundingMetadata) currentMetadata = chunk.groundingMetadata;

          setSessions(prev => prev.map(session => {
            if (session.id === sessionId) {
              return {
                ...session,
                messages: session.messages.map(msg => 
                  msg.id === botMessageId 
                    ? { ...msg, content: fullContent, groundingMetadata: currentMetadata } 
                    : msg
                ),
              };
            }
            return session;
          }));
        }

        setSessions(prev => prev.map(session => {
          if (session.id === sessionId) {
            return {
              ...session,
              messages: session.messages.map(msg => 
                msg.id === botMessageId 
                  ? { ...msg, isStreaming: false } 
                  : msg
              ),
            };
          }
          return session;
        }));
      }

      const currentTitle = sessions.find(s => s.id === sessionId)?.title;
      if (currentTitle === "Nova Conversa..." || !currentTitle || (text.length > 0 && currentTitle.length > 50)) {
         generateChatTitle(text).then(newTitle => {
           setSessions(prev => prev.map(s => {
             if (s.id === sessionId) return { ...s, title: newTitle };
             return s;
           }));
         });
      }

    } catch (error: any) {
      console.error('Error processing message:', error);
      if (error.message === 'API_KEY_MISSING' || error.message.includes('API key')) {
         setMissingKeyError(true);
         setIsSettingsOpen(true);
      }
      setSessions(prev => prev.map(session => {
        if (session.id === sessionId) {
          return {
            ...session,
            messages: session.messages.map(msg => 
              msg.id === botMessageId
                ? { ...msg, content: 'Desculpe, ocorreu um erro (possivelmente chave de API inválida).', isStreaming: false } 
                : msg
            ),
          };
        }
        return session;
      }));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative overflow-hidden text-slate-900 dark:text-slate-100">
      
      {/* Modals */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      
      {/* Call Mode Overlay */}
      {isCallMode && (
        <CallOverlay 
          onClose={() => setIsCallMode(false)}
          onSendMessage={handleCallMessage}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-30 w-72 bg-slate-900 dark:bg-black text-slate-300 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:flex-shrink-0 flex flex-col border-r border-slate-800
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-bold tracking-tight">
            <Bot className="text-purple-400" size={24} />
            <span>{APP_NAME}</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4 pb-2">
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-xl transition-all font-medium text-sm shadow-lg shadow-purple-900/20 active:scale-95"
          >
            <Plus size={18} />
            Nova Conversa
          </button>
        </div>

        {/* View Switcher (Chat / Studio) */}
        <div className="px-4 pb-4">
           <div className="flex bg-slate-800/50 p-1 rounded-lg">
             <button
               onClick={() => { setViewMode('chat'); setIsSidebarOpen(false); }}
               className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'chat' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             >
               <MessageSquare size={14} />
               Chat
             </button>
             <button
               onClick={() => { setViewMode('studio'); setIsSidebarOpen(false); }}
               className={`flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'studio' ? 'bg-purple-900/50 text-purple-200 shadow' : 'text-slate-400 hover:text-white'}`}
             >
               <Cpu size={14} />
               Studio
             </button>
           </div>
        </div>

        {/* Search Bar */}
        <div className="px-4 pb-2">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-purple-400 transition-colors" size={14} />
            <input
              type="text"
              placeholder="Pesquisar histórico..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-800/50 text-slate-200 pl-9 pr-3 py-2 rounded-lg text-sm border border-slate-700 focus:border-purple-500/50 outline-none placeholder-slate-500 transition-all focus:bg-slate-800"
            />
          </div>
        </div>
        
        {/* Chat List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {filteredSessions.length === 0 ? (
            <div className="text-xs text-slate-600 italic px-4 py-4 text-center">
              {searchTerm ? "Nenhuma conversa encontrada" : "Nenhuma conversa salva"}
            </div>
          ) : (
            filteredSessions.map(session => (
              <div 
                key={session.id}
                onClick={() => handleSelectSession(session.id)}
                className={`
                  group flex items-center gap-3 px-3 py-3 rounded-lg text-sm cursor-pointer transition-colors relative
                  ${activeSessionId === session.id && viewMode === 'chat'
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700/50' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }
                `}
              >
                <MessageSquare size={16} className={`flex-shrink-0 ${activeSessionId === session.id && viewMode === 'chat' ? 'text-purple-400' : 'opacity-70'}`} />
                <div className="flex-1 min-w-0 pr-6">
                  {editingTitleId === session.id ? (
                     <input 
                       type="text" 
                       value={editingTitleText}
                       onChange={(e) => setEditingTitleText(e.target.value)}
                       onBlur={() => saveTitle(session.id)}
                       onKeyDown={(e) => e.key === 'Enter' && saveTitle(session.id)}
                       autoFocus
                       className="w-full bg-slate-900 border border-purple-500 rounded px-1 text-white outline-none"
                     />
                  ) : (
                    <>
                      <div className="truncate font-medium">{session.title}</div>
                      <div className="text-[10px] opacity-60 truncate">
                        {new Date(session.updatedAt).toLocaleDateString()}
                      </div>
                    </>
                  )}
                </div>
                
                <div className="absolute right-2 flex opacity-0 group-hover:opacity-100 transition-opacity gap-1 bg-slate-800/90 rounded">
                  <button
                    onClick={(e) => startEditingTitle(e, session)}
                    className="text-slate-400 hover:text-blue-400 p-1.5 hover:bg-slate-700 rounded"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="text-slate-400 hover:text-red-400 p-1.5 hover:bg-slate-700 rounded"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer / Settings */}
        <div className="p-4 border-t border-slate-800 space-y-1">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${missingKeyError ? 'bg-red-900/50 text-red-200 hover:bg-red-900' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
          >
            {missingKeyError ? <AlertCircle size={16} /> : <Settings size={16} />}
            Configurações
          </button>

          <button 
            onClick={toggleTheme}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isDarkMode ? <Moon size={16} /> : <Sun size={16} />}
            {isDarkMode ? 'Modo Escuro' : 'Modo Claro'}
          </button>

          <button 
            onClick={handleClearAllHistory}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <ArchiveX size={16} />
            Limpar Histórico
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full w-full relative">
        
        {viewMode === 'studio' ? (
           <AIStudio />
        ) : (
          <>
            {/* Header */}
            <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center px-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10 transition-colors duration-300 gap-2 justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <Menu size={24} />
                </button>
                <h1 className="font-semibold text-slate-800 dark:text-slate-100 truncate max-w-[200px] md:max-w-md">
                  {activeSessionId 
                    ? sessions.find(s => s.id === activeSessionId)?.title 
                    : 'Nova Conversa'}
                </h1>
              </div>
              
              <div className="flex items-center gap-2">
                 {activeSessionId && (
                   <button
                    onClick={handleExportChat}
                    className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hidden md:block"
                    title="Exportar Chat (Markdown)"
                   >
                     <Download size={20} />
                   </button>
                 )}
                <button
                  onClick={() => setIsCallMode(true)}
                  className="p-2 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500 hover:text-white transition-all border border-green-500/20"
                  title="Modo Ligação"
                >
                  <Phone size={20} />
                </button>
              </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth bg-white dark:bg-slate-950 transition-colors duration-300">
              <div className="max-w-4xl mx-auto min-h-full">
                
                {hasMoreMessages && (
                  <div className="flex justify-center mb-6">
                    <button 
                      onClick={handleLoadMore}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-sm font-medium rounded-full transition-colors shadow-sm"
                    >
                      <ArrowUp size={14} />
                      Carregar mensagens anteriores
                    </button>
                  </div>
                )}

                {!activeSessionId && currentMessages.length === 0 ? (
                  <WelcomeScreen onQuickAction={handleSendMessage} />
                ) : (
                  currentMessages.map((msg) => (
                    <MessageBubble 
                      key={msg.id} 
                      message={msg} 
                      onEdit={msg.role === 'user' ? handleEditMessage : undefined} 
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <InputArea onSendMessage={handleSendMessage} isLoading={isLoading} />
          </>
        )}
      </main>
    </div>
  );
};

export default App;