import React, { useState, useEffect } from 'react';
import { X, Key, Save, AlertTriangle, ExternalLink } from 'lucide-react';
import { resetClient } from '../services/geminiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const stored = localStorage.getItem('gemini_api_key');
      if (stored) setApiKey(stored);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      resetClient(); // Force service to re-initialize with new key
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        onClose();
      }, 1000);
    } else {
      localStorage.removeItem('gemini_api_key');
      resetClient();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Key size={18} className="text-purple-500" />
            Configurações da API
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 flex gap-3">
            <AlertTriangle className="text-amber-600 dark:text-amber-500 flex-shrink-0" size={20} />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <p className="font-semibold mb-1">Chave da API Necessária</p>
              <p>O Ditto AI conecta-se diretamente ao Google Gemini. Sua chave é armazenada apenas no seu navegador (LocalStorage).</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Google Gemini API Key
            </label>
            <input 
              type="password" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ex: AIzaSy..."
              className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all"
            />
            <div className="flex justify-end">
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noreferrer"
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                Obter chave no Google AI Studio <ExternalLink size={10} />
              </a>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            className={`
              flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-medium text-white transition-all
              ${showSuccess ? 'bg-green-600' : 'bg-purple-600 hover:bg-purple-700'}
            `}
          >
            {showSuccess ? <span className="flex items-center gap-2">Salvo!</span> : <><Save size={16} /> Salvar</>}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;