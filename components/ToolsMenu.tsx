import React from 'react';
import { Globe, Image as ImageIcon, Sparkles, Brain, Calculator, Feather, Terminal, Bot, Music } from 'lucide-react';
import { ToolType } from '../types';

interface ToolsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

const ToolsMenu: React.FC<ToolsMenuProps> = ({ isOpen, onClose, selectedTool, onSelectTool }) => {
  if (!isOpen) return null;

  const tools = [
    {
      id: 'none' as ToolType,
      label: 'Ditto (Unificado)',
      icon: <Sparkles size={18} />,
      description: 'Gemini + Copilot + GPT integrados'
    },
    {
      id: 'imageGeneration' as ToolType,
      label: 'DALL-E Style',
      icon: <ImageIcon size={18} />,
      description: 'Geração de imagens via Gemini'
    },
    {
      id: 'lyrics' as ToolType,
      label: 'Compositor Musical',
      icon: <Music size={18} />,
      description: 'Criação de letras, rimas e harmonias'
    },
    {
      id: 'programmer' as ToolType,
      label: 'Engenheiro Sênior',
      icon: <Terminal size={18} />,
      description: 'Foco exclusivo em Arquitetura e Código'
    },
    {
      id: 'shakespeare' as ToolType,
      label: 'Shakespeare',
      icon: <Feather size={18} />,
      description: 'Dramaturgia clássica e poética'
    },
    {
      id: 'reasoning' as ToolType,
      label: 'Thinking (Raciocínio)',
      icon: <Brain size={18} />,
      description: 'Lógica profunda para problemas complexos'
    },
    {
      id: 'math' as ToolType,
      label: 'Matemática (STEM)',
      icon: <Calculator size={18} />,
      description: 'Resolução de problemas exatos'
    },
    {
      id: 'googleSearch' as ToolType,
      label: 'Deep Research',
      icon: <Globe size={18} />,
      description: 'Pesquisa na web em tempo real'
    }
  ];

  return (
    <>
      <div 
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" 
        onClick={onClose}
      />
      <div className="absolute bottom-full left-0 mb-2 w-80 bg-slate-900 dark:bg-slate-950 border border-slate-700 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-3 border-b border-slate-800 dark:border-slate-800 bg-slate-900 dark:bg-slate-950">
          <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
            <Bot size={12} className="text-purple-400" />
            Transformar Ditto em...
          </h3>
        </div>
        <div className="p-2 space-y-1 bg-slate-900 dark:bg-slate-950 max-h-[60vh] overflow-y-auto">
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                onSelectTool(tool.id);
                onClose();
              }}
              className={`
                w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-200
                ${selectedTool === tool.id 
                  ? 'bg-purple-600/20 text-white border border-purple-500/30' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }
              `}
            >
              <div className={`mt-0.5 ${selectedTool === tool.id ? 'text-purple-400' : 'text-slate-500'}`}>
                {tool.icon}
              </div>
              <div>
                <div className={`font-medium text-sm ${selectedTool === tool.id ? 'text-purple-100' : 'text-slate-300'}`}>
                  {tool.label}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 leading-tight">{tool.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  );
};

export default ToolsMenu;