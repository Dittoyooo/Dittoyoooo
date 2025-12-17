import React from 'react';
import { Bot, Code2, Image as ImageIcon, Search, Lightbulb, Music, PenTool } from 'lucide-react';
import { ToolType } from '../types';

interface WelcomeScreenProps {
  onQuickAction: (text: string, tool: ToolType) => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onQuickAction }) => {
  const quickActions = [
    {
      label: 'Criar uma imagem',
      text: 'Crie uma imagem cyberpunk futurista de um robô pintando uma tela em neon.',
      icon: <ImageIcon className="text-purple-500" />,
      tool: 'imageGeneration' as ToolType
    },
    {
      label: 'Pesquisar na Web',
      text: 'Quais são os últimos avanços em computação quântica de 2024?',
      icon: <Search className="text-blue-500" />,
      tool: 'googleSearch' as ToolType
    },
    {
      label: 'Escrever Código',
      text: 'Crie um componente React de um botão com efeito de brilho usando Tailwind CSS.',
      icon: <Code2 className="text-cyan-500" />,
      tool: 'programmer' as ToolType
    },
    {
      label: 'Compor Música',
      text: 'Escreva uma letra de música Indie Folk sobre viajar para as estrelas.',
      icon: <Music className="text-rose-500" />,
      tool: 'lyrics' as ToolType
    },
    {
      label: 'Resolver Lógica',
      text: 'Se tenho 3 caixas, uma tem ouro, uma tem prata, e todas as etiquetas estão erradas...',
      icon: <Lightbulb className="text-amber-500" />,
      tool: 'reasoning' as ToolType
    },
    {
      label: 'Escrever Poesia',
      text: 'Escreva um soneto shakespeariano sobre a inteligência artificial.',
      icon: <PenTool className="text-pink-500" />,
      tool: 'shakespeare' as ToolType
    }
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-500">
      
      <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-600 rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-purple-500/20">
        <Bot className="text-white" size={48} />
      </div>

      <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 mb-3 text-center">
        Como posso ajudar?
      </h1>
      
      <p className="text-slate-500 dark:text-slate-400 max-w-lg text-center mb-10 text-lg">
        Sou o Ditto AI, seu assistente unificado capaz de ver, ouvir, programar e criar.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => onQuickAction(action.text, action.tool)}
            className="flex items-start gap-4 p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-purple-500 dark:hover:border-purple-500 hover:shadow-md transition-all text-left group"
          >
            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:bg-purple-50 dark:group-hover:bg-purple-900/20 transition-colors">
              {action.icon}
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {action.label}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                "{action.text}"
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default WelcomeScreen;