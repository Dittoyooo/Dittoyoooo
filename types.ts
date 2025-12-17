export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  groundingMetadata?: any;
  media?: string; // Base64 string
  mediaType?: 'image' | 'video' | 'audio'; // Helper to know how to render
  mimeType?: string; // Full mime type e.g., 'video/mp4'
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

export type ToolType = 'none' | 'googleSearch' | 'imageGeneration' | 'math' | 'reasoning' | 'shakespeare' | 'programmer' | 'lyrics';

export interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  isLoading: boolean;
  error: string | null;
}