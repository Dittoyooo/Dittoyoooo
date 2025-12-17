import { GoogleGenAI, Chat, GenerateContentResponse, Modality } from "@google/genai";
import { MODEL_NAME, SYSTEM_INSTRUCTION } from '../constants';
import { Message, ToolType } from '../types';

// ==================================================================================
//  ÁREA DE CONFIGURAÇÃO DO USUÁRIO (CHAVE FIXA)
// ==================================================================================
// Cole sua chave API aqui dentro das aspas para torná-la fixa.
// Exemplo: const FIXED_API_KEY = "AIzaSyD-xxxxxxxxxxxxxxxx";
const FIXED_API_KEY: string = "AIzaSyBH0XTRD-hgFAuQ28a7S2KKSqfgLLDtRyw"; 
// ==================================================================================

let ai: GoogleGenAI | null = null;
const sessions = new Map<string, Chat>();

// Helper para verificar se existe alguma chave configurada (Fixa, LocalStorage ou Env)
export const hasApiKey = (): boolean => {
  if (FIXED_API_KEY && FIXED_API_KEY.length > 5) return true;
  if (typeof window !== 'undefined' && localStorage.getItem('gemini_api_key')) return true;
  if (process.env.API_KEY) return true;
  return false;
};

// Allow resetting the client if key changes
export const resetClient = () => {
  ai = null;
  sessions.clear();
};

const getAI = () => {
  if (!ai) {
    // Priority: Fixed Code -> LocalStorage -> Environment Variable
    let apiKey = FIXED_API_KEY;

    if (!apiKey || apiKey.length < 5) {
        const storedKey = typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : null;
        const envKey = process.env.API_KEY;
        apiKey = storedKey || envKey || "";
    }

    if (!apiKey) {
      throw new Error("API_KEY_MISSING");
    }
    ai = new GoogleGenAI({ apiKey: apiKey });
  }
  return ai;
};

// Function to strip the Data URL prefix to get raw base64
const cleanBase64 = (dataUrl: string) => {
  return dataUrl.split(',')[1] || dataUrl;
};

// Feature: Generate Smart Chat Title
export const generateChatTitle = async (messageContent: string): Promise<string> => {
  try {
    const client = getAI();
    const response = await client.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise a seguinte mensagem do usuário e crie um título extremamente curto e resumido (máximo 4 palavras) em Português que capture a essência da intenção ou tópico. Não use aspas. Mensagem: "${messageContent.substring(0, 500)}"`,
      config: { temperature: 0.5, maxOutputTokens: 20 }
    });
    return response.text?.trim() || messageContent.substring(0, 30);
  } catch (e) {
    // Fail silently to standard text if API issue or Key missing
    return messageContent.substring(0, 30);
  }
};

export const sendMessageStream = async function* (
  text: string, 
  media: { data: string, mimeType: string } | null | undefined, 
  sessionId: string, 
  history: Message[], 
  tool: ToolType = 'none'
) {
  const client = getAI();
  
  let chatSession = sessions.get(sessionId);
  
  // Default Model
  let selectedModel = 'gemini-3-flash-preview'; 
  
  let config: any = {
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.7,
    maxOutputTokens: 4000,
  };

  // --- Model Selection Logic based on Input Type (Feature Requests) ---
  if (media) {
    if (media.mimeType.startsWith('image/')) {
      // Feature: Analyze Images -> Must use gemini-3-pro-preview
      selectedModel = 'gemini-3-pro-preview';
    } else if (media.mimeType.startsWith('audio/')) {
      // Feature: Transcribe Audio -> Must use gemini-3-flash-preview
      selectedModel = 'gemini-3-flash-preview';
    }
  }

  // --- Tool overrides ---
  if (tool === 'reasoning') {
    selectedModel = 'gemini-3-pro-preview';
    config.thinkingConfig = { thinkingBudget: 1024 }; 
    config.maxOutputTokens = 8192;
  } else if (tool === 'math') {
    selectedModel = 'gemini-3-pro-preview'; 
    config.temperature = 0.2; 
  } else if (tool === 'googleSearch') {
    config.tools = [{ googleSearch: {} }];
  } else if (tool === 'lyrics') {
    selectedModel = 'gemini-3-pro-preview'; 
    config.temperature = 0.9;
    config.systemInstruction = `
      Você é um Compositor Musical de classe mundial.
      Sua especialidade é criar letras de música com métrica, rima e profundidade emocional.
      1. Pergunte o gênero musical se não for especificado.
      2. Estruture a música claramente com [Verso], [Pré-Refrão], [Refrão], [Ponte].
      3. Sugira acordes ou humor da melodia se apropriado.
      4. Seja criativo e evite clichês óbvios.
    `;
  } else if (tool === 'shakespeare') {
    selectedModel = 'gemini-3-pro-preview';
    config.temperature = 0.9; 
    config.systemInstruction = `
      Você é William Shakespeare trazido à era digital. 
      Sua tarefa é escrever roteiros complexos, dramaturgia profunda e conteúdo poético.
      Use linguagem rica, arcaísmos elegantes (quando apropriado) e estrutura dramática (Atos, Cenas).
      Mantenha a formatação Markdown perfeita para roteiros.
    `;
  } else if (tool === 'programmer') {
    selectedModel = 'gemini-3-pro-preview';
    config.temperature = 0.2; 
    config.systemInstruction = `
      Você é um Engenheiro de Software Sênior Full-Stack focado exclusivamente em arquitetura e código.
      Priorize a implementação técnica, testes e design patterns.
      Quando solicitado código Web (HTML/JS/CSS), forneça-o em um único bloco HTML sempre que possível.
    `;
  }

  // Standard Chat Logic
  const geminiHistory = history.map(msg => {
    const parts: any[] = [{ text: msg.content }];
    
    if (msg.role === 'user' && msg.media) {
      parts.push({
        inlineData: {
          mimeType: msg.mimeType || 'image/jpeg', 
          data: msg.media
        }
      });
    }
    
    return {
      role: msg.role,
      parts: parts,
    };
  });

  chatSession = client.chats.create({
    model: selectedModel,
    config: config,
    history: geminiHistory,
  });
  
  sessions.set(sessionId, chatSession);

  try {
    let messagePayload: any = text;

    if (media) {
       messagePayload = {
         parts: [
           { text: text || "Analyze this media" }, 
           { 
             inlineData: {
               mimeType: media.mimeType,
               data: cleanBase64(media.data)
             }
           }
         ]
       };
    }

    const streamResult = await chatSession.sendMessageStream({ message: messagePayload });
    
    for await (const chunk of streamResult) {
      const c = chunk as GenerateContentResponse;
      const responseText = c.text || '';
      const groundingMetadata = c.candidates?.[0]?.groundingMetadata;
      
      yield { text: responseText, groundingMetadata };
    }
  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};

export const generateImage = async (prompt: string, inputImage?: { data: string, mimeType: string }): Promise<string> => {
  const client = getAI();
  try {
    const parts: any[] = [{ text: prompt }];
    
    if (inputImage) {
      parts.push({
        inlineData: {
          data: cleanBase64(inputImage.data),
          mimeType: inputImage.mimeType
        }
      });
    }

    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: { parts: parts },
      config: { imageConfig: { aspectRatio: '1:1' } },
    });
    const contentParts = response.candidates?.[0]?.content?.parts;
    if (contentParts) {
      for (const part of contentParts) {
        if (part.inlineData && part.inlineData.data) {
          return part.inlineData.data;
        }
      }
    }
    throw new Error("No image generated");
  } catch (error) {
    console.error("Image Generation Error:", error);
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  const client = getAI();
  try {
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash-preview-tts',
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioData) {
      throw new Error("No audio data generated");
    }
    return audioData;
  } catch (error) {
    console.error("TTS Error:", error);
    throw error;
  }
};

export const runStudioPrompt = async function* (
  model: string,
  systemInstruction: string,
  prompt: string,
  temperature: number,
  maxOutputTokens: number
) {
  const client = getAI();
  try {
    const response = await client.models.generateContentStream({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: temperature,
        maxOutputTokens: maxOutputTokens,
      }
    });

    for await (const chunk of response) {
      yield chunk.text || '';
    }
  } catch (error) {
    console.error("Studio API Error:", error);
    throw error;
  }
};