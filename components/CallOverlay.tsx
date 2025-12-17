import React, { useState, useEffect, useRef } from 'react';
import { Mic, PhoneOff, Loader2, Bot, VolumeX } from 'lucide-react';

interface CallOverlayProps {
  onClose: () => void;
  onSendMessage: (text: string) => Promise<string>;
}

const CallOverlay: React.FC<CallOverlayProps> = ({ onClose, onSendMessage }) => {
  const [status, setStatus] = useState<'listening' | 'processing' | 'speaking' | 'error'>('listening');
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  const recognitionRef = useRef<any>(null);
  const silenceTimerRef = useRef<any>(null);
  const isComponentMounted = useRef(true);

  // Initialize Speech Recognition and TTS
  useEffect(() => {
    isComponentMounted.current = true;

    // Check support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setErrorMessage("Seu navegador não suporta reconhecimento de voz.");
      setStatus('error');
      return;
    }

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true; 
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';

    recognition.onstart = () => {
      if (isComponentMounted.current && status === 'listening') {
        // Recognition started
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech Recognition Error", event.error);
      if (event.error === 'not-allowed') {
        setErrorMessage("Acesso ao microfone negado.");
        setStatus('error');
      } else {
        // Try to restart if it's just a glitch, unless we are processing/speaking
        if (status === 'listening' && isComponentMounted.current) {
             try { recognition.stop(); } catch(e) {}
        }
      }
    };

    recognition.onend = () => {
      // If we are still in listening mode and shouldn't have stopped, restart
      if (status === 'listening' && isComponentMounted.current) {
        try { recognition.start(); } catch (e) {
             console.log("Restart failed", e);
        }
      }
    };

    recognition.onresult = (event: any) => {
      if (status !== 'listening') return;

      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentText = finalTranscript || interimTranscript;
      setTranscript(currentText);

      // Silence Detection Logic
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      
      if (currentText.trim()) {
        silenceTimerRef.current = setTimeout(() => {
          recognition.stop(); // Stop listening explicitly
          handleSend(currentText);
        }, 1500); // 1.5s silence to trigger send
      }
    };

    recognitionRef.current = recognition;

    // Start listening immediately
    try {
      recognition.start();
    } catch (e) {
      console.error("Initial start error", e);
    }

    // Cleanup
    return () => {
      isComponentMounted.current = false;
      if (recognitionRef.current) recognitionRef.current.stop();
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      window.speechSynthesis.cancel(); // Stop speaking on unmount
    };
  }, []);

  // Effect to manage Recognition state based on App Status
  useEffect(() => {
    if (!recognitionRef.current) return;

    if (status === 'listening') {
      try { recognitionRef.current.start(); } catch (e) {}
    } else {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
  }, [status]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    setStatus('processing');
    setTranscript('');
    
    try {
      const responseText = await onSendMessage(text);
      speakResponse(responseText);
    } catch (error) {
      console.error("Error sending message", error);
      setStatus('listening');
    }
  };

  const speakResponse = (text: string) => {
    if (!isComponentMounted.current) return;

    setStatus('speaking');
    
    // Clean text for better TTS (remove markdown symbols roughly)
    const cleanText = text.replace(/[*#`]/g, '');

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.1; // Slightly faster for natural feel
    
    // Try to select a "Google" voice if available
    const voices = window.speechSynthesis.getVoices();
    const googleVoice = voices.find(v => v.name.includes('Google') && v.lang.includes('pt-BR'));
    if (googleVoice) utterance.voice = googleVoice;

    utterance.onend = () => {
      if (isComponentMounted.current) {
        setStatus('listening');
        setTranscript('');
      }
    };

    utterance.onerror = (e) => {
      console.error("TTS Error", e);
      if (isComponentMounted.current) {
        setStatus('listening');
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center animate-in fade-in duration-300">
      
      {/* Visualizer / Avatar */}
      <div className="relative mb-12">
        {/* Ripples */}
        <div className={`absolute inset-0 rounded-full bg-purple-500/20 blur-xl transition-all duration-500 
          ${status === 'listening' ? 'scale-150 animate-pulse' : 'scale-100'}
          ${status === 'speaking' ? 'scale-125 animate-pulse duration-300' : ''}
          ${status === 'error' ? 'bg-red-500/20' : ''}
        `} />
        
        <div className={`
          relative w-32 h-32 rounded-full flex items-center justify-center shadow-2xl transition-all duration-500
          ${status === 'listening' ? 'bg-slate-800 border-4 border-slate-700' : ''}
          ${status === 'processing' ? 'bg-purple-900 border-4 border-purple-500 animate-spin-slow' : ''}
          ${status === 'speaking' ? 'bg-purple-600 border-4 border-purple-400' : ''}
          ${status === 'error' ? 'bg-red-900 border-red-500' : ''}
        `}>
          {status === 'listening' && <Mic size={40} className="text-slate-400" />}
          {status === 'processing' && <Loader2 size={40} className="text-purple-200 animate-spin" />}
          {status === 'speaking' && <Bot size={40} className="text-white animate-bounce" />}
          {status === 'error' && <VolumeX size={40} className="text-red-300" />}
        </div>
      </div>

      {/* Status Text */}
      <div className="text-center space-y-4 px-6 max-w-lg">
        <h2 className="text-2xl font-bold text-slate-100 tracking-tight">
          {status === 'listening' && "Estou ouvindo..."}
          {status === 'processing' && "Pensando..."}
          {status === 'speaking' && "Ditto falando..."}
          {status === 'error' && "Erro"}
        </h2>
        
        <p className="text-slate-400 text-lg min-h-[3rem] transition-all">
          {errorMessage || transcript || (status === 'speaking' ? "🔊" : "Fale agora...")}
        </p>
      </div>

      {/* Controls */}
      <div className="mt-16 flex items-center gap-6">
        <button 
          onClick={onClose}
          className="p-4 rounded-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/50"
        >
          <PhoneOff size={32} />
        </button>
      </div>
    </div>
  );
};

export default CallOverlay;