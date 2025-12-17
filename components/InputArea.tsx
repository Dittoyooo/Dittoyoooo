import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Plus, Globe, Image as ImageIcon, Calculator, Brain, Paperclip, X, Feather, Terminal, Video, Mic, Music, StopCircle } from 'lucide-react';
import ToolsMenu from './ToolsMenu';
import { ToolType } from '../types';

interface InputAreaProps {
  onSendMessage: (message: string, tool: ToolType, media?: { data: string, mimeType: string, type: 'image' | 'video' | 'audio' }) => void;
  isLoading: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({ onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<ToolType>('none');
  const [selectedMedia, setSelectedMedia] = useState<{ data: string, mimeType: string, type: 'image' | 'video' | 'audio' } | null>(null);
  
  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((input.trim() || selectedMedia) && !isLoading) {
      onSendMessage(input.trim(), selectedTool, selectedMedia || undefined);
      setInput('');
      setSelectedMedia(null);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      let type: 'image' | 'video' | 'audio' = 'image';
      
      if (file.type.startsWith('video/')) type = 'video';
      else if (file.type.startsWith('audio/')) type = 'audio';
      
      setSelectedMedia({
        data: base64String,
        mimeType: file.type,
        type: type
      });
    };
    reader.readAsDataURL(file);
  };

  // --- Audio Recording Logic ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' }); // Chrome records webm
        // Convert Blob to File-like object to reuse processFile logic
        const file = new File([audioBlob], "recording.webm", { type: 'audio/webm' });
        processFile(file);
        
        // Stop all tracks to release microphone
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Erro ao acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const getToolIcon = () => {
    switch (selectedTool) {
      case 'googleSearch': return <Globe size={20} className="text-blue-500 dark:text-blue-400" />;
      case 'imageGeneration': return <ImageIcon size={20} className="text-purple-500 dark:text-purple-400" />;
      case 'math': return <Calculator size={20} className="text-emerald-500 dark:text-emerald-400" />;
      case 'reasoning': return <Brain size={20} className="text-orange-500 dark:text-orange-400" />;
      case 'shakespeare': return <Feather size={20} className="text-pink-500 dark:text-pink-400" />;
      case 'programmer': return <Terminal size={20} className="text-cyan-500 dark:text-cyan-400" />;
      case 'lyrics': return <Music size={20} className="text-rose-500 dark:text-rose-400" />;
      default: return <Plus size={20} />;
    }
  };

  const getPlaceholder = () => {
     switch (selectedTool) {
      case 'imageGeneration': return "Descreva a imagem que você quer criar...";
      case 'math': return "Digite o problema matemático...";
      case 'reasoning': return "Digite um problema lógico complexo...";
      case 'shakespeare': return "Sobre o que devemos escrever a próxima obra-prima?";
      case 'programmer': return "Descreva a aplicação ou funcionalidade...";
      case 'lyrics': return "Qual o tema e gênero da música?";
      case 'googleSearch': return "O que você quer pesquisar?";
      default: return isRecording ? "Gravando áudio..." : "Converse, programe ou crie...";
    }
  };

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="max-w-4xl mx-auto relative">
        
        {/* Media Preview */}
        {selectedMedia && (
          <div className="mb-3 relative inline-block animate-in fade-in slide-in-from-bottom-2 group">
            {selectedMedia.type === 'image' && (
              <img 
                src={selectedMedia.data} 
                alt="Selected" 
                className="h-20 w-auto rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm" 
              />
            )}
            {selectedMedia.type === 'video' && (
              <div className="h-20 w-32 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700">
                <Video className="text-slate-400" />
              </div>
            )}
            {selectedMedia.type === 'audio' && (
              <div className="h-12 w-32 bg-slate-900 rounded-lg flex items-center justify-center border border-slate-700 gap-2">
                <Mic className="text-slate-400" size={16} />
                <span className="text-xs text-slate-400">Audio</span>
              </div>
            )}
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute -top-2 -right-2 bg-slate-900 text-white rounded-full p-1 hover:bg-slate-700 transition-colors shadow-sm"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="relative flex items-end gap-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent transition-all shadow-sm">
          
          <div className="relative pb-0.5 flex gap-1">
             {/* Tools Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsToolsOpen(!isToolsOpen)}
                className={`
                  p-2 rounded-lg transition-colors
                  ${isToolsOpen || selectedTool !== 'none'
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                  }
                `}
                title="Selecionar Persona Ditto"
              >
                {getToolIcon()}
              </button>
              <ToolsMenu 
                isOpen={isToolsOpen} 
                onClose={() => setIsToolsOpen(false)}
                selectedTool={selectedTool}
                onSelectTool={setSelectedTool}
              />
            </div>

            {/* Media Upload Button */}
            {selectedTool !== 'imageGeneration' && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileSelect}
                  accept="image/*,video/*,audio/*"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    p-2 rounded-lg transition-colors
                    ${selectedMedia
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                    }
                  `}
                  title="Anexar Arquivo"
                >
                  <Paperclip size={20} />
                </button>
              </>
            )}

            {/* Microphone Button (Recording) */}
            {selectedTool !== 'imageGeneration' && (
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`
                  p-2 rounded-lg transition-all duration-300
                  ${isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                  }
                `}
                title={isRecording ? "Parar Gravação" : "Gravar Áudio"}
              >
                 {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
              </button>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={getPlaceholder()}
            className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[24px] py-2 px-2 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500"
            rows={1}
            disabled={isLoading || isRecording}
          />
          <button
            type="submit"
            disabled={(!input.trim() && !selectedMedia) || isLoading || isRecording}
            className={`
              flex-shrink-0 p-2 rounded-lg transition-colors mb-0.5
              ${(!input.trim() && !selectedMedia) || isLoading || isRecording
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed' 
                : 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800 shadow-md'
              }
            `}
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
          </button>
        </form>
        <div className="text-center mt-2 flex justify-center gap-2 flex-wrap h-6">
           {selectedTool !== 'none' && (
             <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex items-center animate-in fade-in slide-in-from-bottom-2
                ${selectedTool === 'imageGeneration' ? 'text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30' : ''}
                ${selectedTool === 'googleSearch' ? 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30' : ''}
                ${selectedTool === 'math' ? 'text-emerald-600 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30' : ''}
                ${selectedTool === 'reasoning' ? 'text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-900/30' : ''}
                ${selectedTool === 'shakespeare' ? 'text-pink-600 dark:text-pink-300 bg-pink-50 dark:bg-pink-900/30' : ''}
                ${selectedTool === 'programmer' ? 'text-cyan-600 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-900/30' : ''}
                ${selectedTool === 'lyrics' ? 'text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-900/30' : ''}
             `}>
               {selectedTool === 'imageGeneration' && "Modo DALL-E"}
               {selectedTool === 'googleSearch' && "Deep Research"}
               {selectedTool === 'math' && "Modo Matemático"}
               {selectedTool === 'reasoning' && "Modo Thinking"}
               {selectedTool === 'shakespeare' && "Modo Shakespeare"}
               {selectedTool === 'programmer' && "Modo Engenheiro"}
               {selectedTool === 'lyrics' && "Modo Compositor"}
             </span>
           )}
        </div>
      </div>
    </div>
  );
};

export default InputArea;