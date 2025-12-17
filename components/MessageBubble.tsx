import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import { User, Bot, Globe, Copy, Check, Share2, Download, MonitorPlay, Volume2, Loader2, X, Edit2, Save } from 'lucide-react';
import { generateSpeech } from '../services/geminiService';

interface MessageBubbleProps {
  message: Message;
  onEdit?: (messageId: string, newContent: string) => void;
}

const CodeLab: React.FC<{ code: string, language: string }> = ({ code, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Only enable lab for web-related languages
  if (!['html', 'javascript', 'css', 'js', 'jsx'].includes(language.toLowerCase())) {
    return null;
  }

  return (
    <div className="border-t border-slate-700/50 bg-slate-900/30 p-2">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-mono rounded transition-colors border border-slate-700 w-full justify-center md:w-auto md:justify-start"
      >
        <MonitorPlay size={14} />
        {isOpen ? 'Fechar Preview' : 'Executar Preview'}
      </button>
      
      {isOpen && (
        <div className="mt-2 p-1 bg-white rounded border border-slate-700 overflow-hidden">
           <iframe 
             className="w-full h-64 border-none"
             srcDoc={code}
             title="Code Lab Preview"
             sandbox="allow-scripts"
           />
        </div>
      )}
    </div>
  );
};

const CodeBlock = ({ inline, className, children, ...props }: any) => {
  const [isCopied, setIsCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  const codeContent = String(children).replace(/\n$/, '');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code', err);
    }
  };

  if (inline) {
    return (
      <code className="bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded text-purple-600 dark:text-purple-400 font-mono text-sm" {...props}>
        {children}
      </code>
    );
  }

  return (
    <div className="my-4 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 shadow-sm group">
      <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border-b border-slate-800">
        <span className="text-xs font-medium text-slate-400 lowercase font-mono">
          {language || 'texto'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-800"
          title="Copiar código"
        >
          {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
          <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
        </button>
      </div>
      <div className="relative">
        <code className="block p-4 overflow-x-auto font-mono text-sm text-slate-50 leading-relaxed bg-slate-950" {...props}>
          {children}
        </code>
      </div>
      <CodeLab code={codeContent} language={language} />
    </div>
  );
};

// Helper for Audio Decoding
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number = 24000,
  numChannels: number = 1
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};


const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onEdit }) => {
  const isUser = message.role === 'user';
  const [isCopied, setIsCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoadingSpeech, setIsLoadingSpeech] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  
  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  // Sync edit content if prop updates externally
  useEffect(() => {
    setEditContent(message.content);
  }, [message.content]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Unified AI Chat',
      text: `${message.role === 'user' ? 'Eu' : 'Unified AI'}: ${message.content}`,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareData.text);
        alert('Mensagem copiada para a área de transferência!');
      } catch (err) {
        console.error('Failed to copy fallback:', err);
      }
    }
  };

  const handleSpeak = async () => {
    if (isSpeaking) return; // Prevent overlapping functionality for this demo
    
    setIsLoadingSpeech(true);
    try {
      const base64Audio = await generateSpeech(message.content.substring(0, 500)); // Limit length for demo
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
      const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioContext,
        24000,
        1
      );
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      
      setIsSpeaking(true);
      source.start();
      
      source.onended = () => {
        setIsSpeaking(false);
        audioContext.close();
      };
      
    } catch (error) {
      console.error("Speech playback error:", error);
      alert("Não foi possível reproduzir o áudio.");
    } finally {
      setIsLoadingSpeech(false);
    }
  };

  const handleDownloadImage = () => {
    if (message.media && message.mediaType === 'image') {
      const link = document.createElement('a');
      link.href = `data:image/jpeg;base64,${message.media}`;
      link.download = `generated-image-${message.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSaveEdit = () => {
    if (onEdit && editContent.trim() !== message.content) {
      onEdit(message.id, editContent);
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  // Helper to determine media source
  const mediaSrc = message.media && message.mimeType 
    ? `data:${message.mimeType};base64,${message.media}` 
    : undefined;

  return (
    <>
      <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6 group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
        <div className={`flex max-w-[90%] md:max-w-[80%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          
          {/* Avatar */}
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
            ${isUser 
              ? 'bg-purple-600 text-white' 
              : 'bg-slate-800 text-white border border-slate-700 shadow-sm'}
            shadow-sm
          `}>
            {isUser ? <User size={18} /> : <Bot size={18} className="text-purple-400" />}
          </div>

          {/* Content Bubble */}
          <div className={`
            flex flex-col 
            ${isUser ? 'items-end' : 'items-start'} 
            min-w-0 flex-1
          `}>
            <div className={`
              px-4 py-3 rounded-2xl shadow-sm text-sm md:text-base overflow-hidden w-full transition-colors duration-200
              ${isUser 
                ? 'bg-purple-600 text-white rounded-tr-none' 
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 rounded-tl-none markdown-content'
              }
            `}>
              
              {/* Render Media Input (User) or Output (Bot generated images) */}
              {mediaSrc && (
                <div className="mb-3 relative group/image">
                  {message.mediaType === 'image' && (
                    <div className="relative cursor-zoom-in" onClick={() => setIsImageModalOpen(true)}>
                      <img 
                        src={mediaSrc} 
                        alt="Content" 
                        className="rounded-lg max-w-full h-auto border border-slate-200 dark:border-slate-700 hover:opacity-95 transition-opacity"
                      />
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleDownloadImage(); }}
                         className="absolute bottom-2 right-2 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded-full opacity-0 group-hover/image:opacity-100 transition-opacity"
                         title="Download"
                       >
                         <Download size={16} />
                       </button>
                    </div>
                  )}
                  {message.mediaType === 'video' && (
                    <video 
                      controls 
                      className="rounded-lg max-w-full max-h-64 border border-slate-200 dark:border-slate-700"
                    >
                      <source src={mediaSrc} type={message.mimeType} />
                      Seu navegador não suporta vídeos.
                    </video>
                  )}
                  {message.mediaType === 'audio' && (
                    <audio 
                      controls 
                      className="w-full mt-1"
                    >
                      <source src={mediaSrc} type={message.mimeType} />
                      Seu navegador não suporta áudio.
                    </audio>
                  )}
                </div>
              )}

              {/* Text Content or Edit Mode */}
              {isEditing ? (
                <div className="w-full min-w-[250px]">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full p-2 text-slate-900 bg-white rounded-md text-sm min-h-[100px] outline-none border border-purple-300 focus:ring-2 focus:ring-purple-400"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button 
                      onClick={handleCancelEdit}
                      className="px-3 py-1 text-xs font-medium bg-white/20 hover:bg-white/30 rounded text-white border border-white/20"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1 px-3 py-1 text-xs font-medium bg-white text-purple-700 hover:bg-purple-50 rounded shadow-sm"
                    >
                      <Save size={14} /> Salvar & Enviar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {isUser ? (
                    <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  ) : (
                    <div className="dark:text-slate-200">
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          pre: ({children}) => <>{children}</>, // Unwrap pre to let CodeBlock handle layout
                          code: CodeBlock,
                          a: ({node, ...props}) => <a {...props} className="text-purple-500 dark:text-purple-400 hover:underline" target="_blank" rel="noopener noreferrer" />,
                          table: ({node, ...props}) => <div className="overflow-x-auto my-4"><table className="w-full border-collapse border border-slate-200 dark:border-slate-700" {...props} /></div>,
                          th: ({node, ...props}) => <th className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2 text-left font-semibold" {...props} />,
                          td: ({node, ...props}) => <td className="border border-slate-200 dark:border-slate-700 p-2" {...props} />,
                          blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-purple-300 dark:border-purple-700 pl-4 italic text-slate-600 dark:text-slate-400 my-2" {...props} />,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  )}
                </>
              )}
              
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 ml-1 bg-current opacity-70 animate-pulse align-middle"></span>
              )}

              {/* Grounding Sources */}
              {!isUser && message.groundingMetadata?.groundingChunks && (
                <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded-full">
                      <Globe size={12} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">Fontes Pesquisadas</p>
                  </div>
                  <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                    {message.groundingMetadata.groundingChunks.map((chunk: any, index: number) => {
                      if (chunk.web) {
                        return (
                          <a 
                            key={index} 
                            href={chunk.web.uri} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-all group"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="text-xs font-medium text-purple-600 dark:text-purple-400 truncate group-hover:underline">
                                {chunk.web.title || "Fonte da Web"}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {new URL(chunk.web.uri).hostname}
                              </div>
                            </div>
                          </a>
                        );
                      }
                      return null;
                    })}
                  </div>
                </div>
              )}
            </div>
            
            {/* Action Buttons - Moved Outside Bubble for Clarity */}
            {!message.isStreaming && !isEditing && (
                <div className={`flex items-center gap-2 mt-2 px-1 opacity-100 transition-opacity ${isUser ? 'justify-end' : 'justify-start'}`}>
                  
                  {isUser && onEdit && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-md transition-colors"
                      title="Editar mensagem"
                    >
                      <Edit2 size={14} />
                      <span>Editar</span>
                    </button>
                  )}

                  <button 
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-md transition-colors"
                    title="Copiar texto"
                  >
                    {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                    <span>{isCopied ? 'Copiado' : 'Copiar'}</span>
                  </button>
                  
                  {!isUser && (
                  <>
                    <button 
                      onClick={handleShare}
                      className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-md transition-colors"
                      title="Compartilhar"
                    >
                      <Share2 size={14} />
                      <span>Compartilhar</span>
                    </button>

                    <button 
                      onClick={handleSpeak}
                      disabled={isSpeaking || isLoadingSpeech}
                      className={`
                        flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-md transition-colors
                        ${isSpeaking 
                          ? 'text-purple-500 bg-purple-100 dark:bg-purple-900/30' 
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
                        }
                      `}
                      title="Ouvir resposta (TTS)"
                    >
                      {isLoadingSpeech ? <Loader2 size={14} className="animate-spin" /> : <Volume2 size={14} />}
                      <span>{isSpeaking ? 'Falando...' : 'Ouvir'}</span>
                    </button>
                  </>
                  )}
                </div>
              )}
            
            <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 px-1">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {isImageModalOpen && mediaSrc && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsImageModalOpen(false)}
        >
          <button 
            onClick={() => setIsImageModalOpen(false)}
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors z-[110]"
          >
            <X size={32} />
          </button>
          
          <img 
            src={mediaSrc} 
            alt="Full size view" 
            className="max-w-full max-h-full object-contain rounded-sm shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}
    </>
  );
};

export default MessageBubble;