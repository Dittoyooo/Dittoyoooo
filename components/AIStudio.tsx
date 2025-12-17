import React, { useState } from 'react';
import { Play, Settings2, Trash2, Save, Terminal, Copy, Check } from 'lucide-react';
import { runStudioPrompt } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AIStudio: React.FC = () => {
  const [model, setModel] = useState('gemini-3-flash-preview');
  const [systemInstruction, setSystemInstruction] = useState('Você é um assistente útil e preciso.');
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2000);
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const availableModels = [
    { value: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash (Fastest)' },
    { value: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro (Reasoning)' },
    { value: 'gemini-2.5-flash-preview-tts', label: 'Gemini 2.5 Flash TTS' },
    { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image' },
  ];

  const handleRun = async () => {
    if (!prompt.trim() || isLoading) return;
    
    setIsLoading(true);
    setResponse('');
    
    try {
      const stream = runStudioPrompt(model, systemInstruction, prompt, temperature, maxTokens);
      for await (const chunk of stream) {
        setResponse(prev => prev + chunk);
      }
    } catch (error) {
      setResponse(`Erro: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(response);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="flex h-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
      
      {/* Settings Sidebar */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col h-full overflow-y-auto">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
          <Settings2 className="text-purple-500" size={20} />
          <h2 className="font-bold text-slate-800 dark:text-slate-100">Configuração</h2>
        </div>

        <div className="p-4 space-y-6">
          {/* Model Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Modelo</label>
            <select 
              value={model} 
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none"
            >
              {availableModels.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="font-semibold uppercase text-slate-500 tracking-wider">Temperatura</label>
              <span className="text-slate-700 dark:text-slate-300 font-mono">{temperature}</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="2" 
              step="0.1" 
              value={temperature} 
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <label className="font-semibold uppercase text-slate-500 tracking-wider">Max Tokens</label>
              <span className="text-slate-700 dark:text-slate-300 font-mono">{maxTokens}</span>
            </div>
            <input 
              type="range" 
              min="100" 
              max="8192" 
              step="100" 
              value={maxTokens} 
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>

          {/* System Instruction */}
          <div className="space-y-2 flex-1 flex flex-col">
            <label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Instrução de Sistema</label>
            <textarea 
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              className="w-full h-40 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-purple-500 outline-none resize-none font-mono"
              placeholder="Defina a persona ou regras do modelo..."
            />
          </div>
        </div>
      </div>

      {/* Main Playground */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-slate-50 dark:bg-slate-900/50">
        
        {/* Header / Actions */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between px-4">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Terminal size={18} />
            <span className="font-medium text-sm">Playground</span>
          </div>
          <button 
            onClick={handleRun}
            disabled={isLoading || !prompt.trim()}
            className={`
              flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium text-sm transition-all
              ${isLoading || !prompt.trim()
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg active:scale-95'
              }
            `}
          >
            {isLoading ? (
              <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
            ) : (
              <Play size={16} fill="currentColor" />
            )}
            Executar
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          
          {/* Prompt Input */}
          <div className="flex-1 flex flex-col border-r border-slate-200 dark:border-slate-800 min-h-[50%] md:min-h-0">
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900/50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              Input (Prompt)
            </div>
            <textarea 
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="flex-1 w-full bg-white dark:bg-slate-950 p-4 text-slate-800 dark:text-slate-200 outline-none resize-none font-mono text-sm leading-relaxed"
              placeholder="Digite seu prompt aqui..."
            />
            <div className="p-2 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end">
               <button 
                onClick={() => setPrompt('')} 
                className="text-slate-400 hover:text-red-500 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                title="Limpar Prompt"
               >
                 <Trash2 size={16} />
               </button>
            </div>
          </div>

          {/* Response Output */}
          <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900">
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-900/50 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Output</span>
              {response && (
                <button 
                  onClick={copyToClipboard}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-purple-500 transition-colors"
                >
                  {isCopied ? <Check size={14} /> : <Copy size={14} />}
                  {isCopied ? 'Copiado' : 'Copiar'}
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-6 text-slate-800 dark:text-slate-200">
              {response ? (
                <div className="prose dark:prose-invert prose-sm max-w-none">
                   <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      pre: ({children}) => <pre className="bg-slate-200 dark:bg-slate-800 p-4 rounded-lg overflow-x-auto border border-slate-300 dark:border-slate-700">{children}</pre>,
                      code: ({node, className, children, ...props}) => {
                        const match = /language-(\w+)/.exec(className || '')
                        return !className?.includes('language-') ? (
                          <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-purple-600 dark:text-purple-400 font-mono text-sm" {...props}>
                            {children}
                          </code>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                   >
                     {response}
                   </ReactMarkdown>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-600">
                  <Terminal size={48} className="mb-4 opacity-20" />
                  <p className="text-sm">Aguardando execução...</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AIStudio;