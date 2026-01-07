import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import html2canvas from 'html2canvas';

import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import CameraModal from './common/CameraModal';
import { sanitizeHTML, checkRateLimit, validateString } from '../utils/security';

interface Message {
  role: 'user' | 'model';
  text: string;
  snapshot?: string | null;
  searchResults?: any[];
}

interface AIAssistantProps {
  systemInstruction: string;
  suggestedPrompts?: string[];
  isEmbedded?: boolean;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ systemInstruction, suggestedPrompts = [], isEmbedded = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello! I'm Edu. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (!process.env.API_KEY) throw new Error("Secure API environment missing.");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      chatRef.current = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: { systemInstruction, tools: [{googleSearch: {}}] },
      });
    } catch (e: any) {
      setError("AI Sub-net initialization failed.");
    }
  }, [systemInstruction]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);
  
  const sendMessage = async (messageText: string, messageSnapshot: string | null) => {
    // SECURITY: Input validation and rate limiting
    if (!messageText.trim() && !messageSnapshot) return;
    if (isLoading) return;
    
    if (!checkRateLimit('ai_chat', 5, 60000)) {
        setError("Rate limit: Too many messages. Please wait 60s.");
        return;
    }

    const validatedText = messageText.trim() ? validateString(messageText, 1, 2000) : '';

    const userMessage: Message = { role: 'user', text: validatedText, snapshot: messageSnapshot };
    setMessages(prev => [...prev, userMessage, { role: 'model', text: '▋' }]);
    
    setInput('');
    setSnapshot(null);
    setIsLoading(true);
    setError('');

    try {
      let promptParts: any[] = [validatedText];
      if (messageSnapshot) {
        promptParts.push({ inlineData: { mimeType: 'image/jpeg', data: messageSnapshot.split(',')[1] } });
      }

      const responseStream = await chatRef.current.sendMessageStream({ message: promptParts });
      let fullText = '';
      for await (const chunk of responseStream) {
        fullText += chunk.text;
        setMessages(prev => {
            const newMessages = [...prev];
            newMessages[newMessages.length - 1].text = fullText + '▋';
            return newMessages;
        });
      }
      
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1] = { role: 'model', text: fullText };
        return newMessages;
      });
    } catch (e: any) {
      setError("Secure transmission interrupted.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderChatInterface = () => (
    <>
      <header className="flex-shrink-0 flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800/50">
          <h3 className="text-sm font-black uppercase tracking-widest text-blue-400">Secure AI Copilot</h3>
          {!isEmbedded && <button onClick={() => setIsOpen(false)} className="text-slate-400">✕</button>}
      </header>

      <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-slate-900/20">
          {messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 border border-white/5 text-slate-200'}`}>
                      {msg.role === 'model' ? (
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHTML(msg.text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />')) }} />
                      ) : (
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                      )}
                      {msg.snapshot && <img src={msg.snapshot} className="mt-2 rounded-lg border border-white/10" />}
                  </div>
              </div>
          ))}
          <div ref={messagesEndRef} />
      </div>

      <footer className="p-4 border-t border-slate-700 bg-slate-800/30">
          {error && <p className="text-red-400 text-[10px] mb-2 font-mono uppercase">{error}</p>}
          <form onSubmit={e => { e.preventDefault(); sendMessage(input, snapshot); }} className="flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Encrypted prompt..." className="flex-grow p-3 bg-slate-950 border border-white/5 rounded-xl text-xs outline-none focus:ring-1 ring-blue-500/50" />
              <Button type="submit" disabled={isLoading} size="sm">Send</Button>
          </form>
      </footer>
    </>
  );

  if (isEmbedded) return <div className="h-full flex flex-col">{renderChatInterface()}</div>;

  return (
    <div className="fixed bottom-6 right-6 z-50 assistant-card-wrapper">
      {!isOpen ? (
        <button onClick={() => setIsOpen(true)} className="w-14 h-14 bg-blue-600 rounded-full shadow-2xl flex items-center justify-center text-white hover:scale-105 transition-transform">🤖</button>
      ) : (
        <Card className="w-80 sm:w-96 h-[500px] flex flex-col animate-fade-in-up border-white/10 shadow-3xl overflow-hidden !p-0">
          {renderChatInterface()}
        </Card>
      )}
    </div>
  );
};

export default AIAssistant;