import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, firebase, storage } from '../services/firebase';
import { UserProfile, Conversation, Message } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { GoogleGenAI } from '@google/genai';
import ChatInput from './common/ChatInput';

interface MessagingViewProps {
  userProfile: UserProfile;
  contacts: UserProfile[];
}

const MessagingView: React.FC<MessagingViewProps> = ({ userProfile, contacts: initialContacts }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const [conversationSummary, setConversationSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // AUTH SCOPING: Fetch teachers who teach the student's class
  const [classTeachers, setClassTeachers] = useState<UserProfile[]>([]);
  useEffect(() => {
    if (userProfile.role !== 'student' || !userProfile.class) return;
    
    const unsub = db.collection('users')
        .where('role', '==', 'teacher')
        .onSnapshot(snap => {
            const teachers = snap.docs.map(doc => doc.data() as UserProfile);
            // Client-side filter for assigned classes
            const relevant = teachers.filter(t => 
                t.classTeacherOf === userProfile.class || 
                (t.classesTaught && t.classesTaught.includes(userProfile.class!))
            );
            setClassTeachers(relevant);
        });
    return () => unsub();
  }, [userProfile.role, userProfile.class]);

  // Use classTeachers for students, or initialContacts for staff/admins
  const scopedContacts = useMemo(() => {
      if (userProfile.role === 'admin') return initialContacts;
      if (userProfile.role === 'teacher') return initialContacts; // Teachers see everyone in their scoped list
      return classTeachers;
  }, [userProfile.role, initialContacts, classTeachers]);

  // Fetch conversations
  useEffect(() => {
    const q = db.collection('conversations')
        .where('participantUids', 'array-contains', userProfile.uid)
        .orderBy('updatedAt', 'desc');
        
    const unsubscribe = q.onSnapshot(snapshot => {
        const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
        setConversations(convos);
        setLoadingConversations(false);
    }, err => {
        console.warn("Conversations status:", err.message);
        setLoadingConversations(false);
    });

    return () => unsubscribe();
  }, [userProfile.uid]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setConversationSummary(null);
      return;
    }

    setLoadingMessages(true);
    setConversationSummary(null);
    
    const messagesQuery = db.collection('conversations').doc(activeConversationId).collection('messages')
        .orderBy('createdAt', 'asc');
        
    const unsubscribe = messagesQuery.onSnapshot(async (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
        setMessages(msgs);
        setLoadingMessages(false);

        const convRef = db.collection('conversations').doc(activeConversationId);
        const convDoc = await convRef.get();
        if (convDoc.exists && (convDoc.data() as Conversation).unreadCount?.[userProfile.uid] > 0) {
            await convRef.update({ [`unreadCount.${userProfile.uid}`]: 0 });
        }
      }, err => {
          console.warn("Messages status:", err.message);
          setLoadingMessages(false);
      });

    return () => unsubscribe();
  }, [activeConversationId, userProfile.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, conversationSummary]); 

  const handleSendChatInput = async (messageContent: { text: string; image: File | null; audio: Blob | null }) => {
    if ((!messageContent.text && !messageContent.image && !messageContent.audio) || !activeConversationId || isSending) return;
    
    setIsSending(true);
    const conversationRef = db.collection('conversations').doc(activeConversationId);
    const messageRef = conversationRef.collection('messages').doc();

    const conversationDoc = await conversationRef.get();
    if (!conversationDoc.exists) { setIsSending(false); return; };
    const conversationData = conversationDoc.data() as Conversation;

    const messageData: Partial<Message> = {
      senderId: userProfile.uid,
      senderName: userProfile.name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
      readBy: [],
    };
    
    if (messageContent.text.trim()) messageData.text = messageContent.text;

    try {
        if (messageContent.image) {
            const storagePath = `direct_messages/${activeConversationId}/${messageRef.id}-${messageContent.image.name}`;
            const storageRef = storage.ref(storagePath);
            await storageRef.put(messageContent.image);
            messageData.imageUrl = await storageRef.getDownloadURL();
            messageData.storagePath = storagePath;
        }

        if (messageContent.audio) {
            const storagePath = `direct_messages/${activeConversationId}/${messageRef.id}-audio.webm`;
            const storageRef = storage.ref(storagePath);
            await storageRef.put(messageContent.audio);
            messageData.audioUrl = await storageRef.getDownloadURL();
            messageData.audioStoragePath = storagePath;
        }
        
        const batch = db.batch();
        batch.set(messageRef, messageData);
        
        const otherParticipantUid = conversationData.participantUids.find(uid => uid !== userProfile.uid);
        if (otherParticipantUid) {
            let previewText = messageData.text || '';
            if (messageData.imageUrl) previewText = '[Photo] ' + previewText;
            if (messageData.audioUrl) previewText = '[Audio] ' + previewText;

            batch.update(conversationRef, {
                lastMessage: { text: previewText, senderId: userProfile.uid, timestamp: firebase.firestore.FieldValue.serverTimestamp() },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                [`unreadCount.${otherParticipantUid}`]: firebase.firestore.FieldValue.increment(1)
            });
        }
        await batch.commit();
    } catch (err) { console.error("Send failed:", err); } finally { setIsSending(false); }
  };
  
  const handleStartNewConversation = async (contact: UserProfile) => {
    setShowNewMessageModal(false);
    const combinedUids = [userProfile.uid, contact.uid].sort();
    
    const q = db.collection('conversations')
        .where('participantUids', '==', combinedUids)
        .limit(1);
    const existingConvoQuery = await q.get();

    if (!existingConvoQuery.empty) {
        setActiveConversationId(existingConvoQuery.docs[0].id);
    } else {
        const newConversationData: Omit<Conversation, 'id'> = {
            participantUids: combinedUids,
            participantInfo: {
                [userProfile.uid]: { name: userProfile.name, role: userProfile.role },
                [contact.uid]: { name: contact.name, role: contact.role },
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
            unreadCount: { [userProfile.uid]: 0, [contact.uid]: 0 },
        };
        const newDocRef = await db.collection('conversations').add(newConversationData);
        setActiveConversationId(newDocRef.id);
    }
  };
  
  const handleSummarizeContext = async () => {
      if (!messages.length || isSummarizing) return;
      setIsSummarizing(true);
      try {
          const recentMessages = messages.slice(-20);
          const conversationText = recentMessages.map(m => `${m.senderName}: ${m.text || '[Asset Transmission]'}`).join('\n');
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Summarize this briefing between ${userProfile.name} and staff. Focus on tasks and key insights. Bullet points only.\n\nContext:\n${conversationText}`;
          const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
          setConversationSummary(response.text);
      } catch (err) { setConversationSummary("Briefing synthesis failed."); } finally { setIsSummarizing(false); }
  };
  
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  
  const otherParticipantInfo = useMemo(() => {
    if (!activeConversation) return null;
    const otherUid = activeConversation.participantUids.find(uid => uid !== userProfile.uid);
    if (!otherUid) return null;
    return activeConversation.participantInfo[otherUid];
  }, [activeConversation, userProfile.uid]);

  const filteredContacts = useMemo(() => {
    return scopedContacts
        .filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [scopedContacts, searchTerm]);

  const displayedConversations = useMemo(() => {
      if (filterMode === 'all') return conversations;
      return conversations.filter(c => (c.unreadCount?.[userProfile.uid] || 0) > 0);
  }, [conversations, filterMode, userProfile.uid]);

  return (
    <div className="h-[calc(100vh-140px)] animate-fade-in-up">
        <div className="grid grid-cols-1 md:grid-cols-3 h-full gap-6">
            {/* Sidebar */}
            <div className={`md:col-span-1 flex flex-col h-full bg-slate-900/40 rounded-[2rem] border border-white/5 p-6 shadow-2xl ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex justify-between items-center mb-8 flex-shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tighter">Communications</h3>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Authorized Channels Only</p>
                    </div>
                    <button onClick={() => setShowNewMessageModal(true)} className="p-3 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/40 text-white transition-transform active:scale-95">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    </button>
                </div>
                
                <div className="flex p-1 bg-slate-950 rounded-xl mb-6 flex-shrink-0 border border-white/5">
                    <button onClick={() => setFilterMode('all')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterMode === 'all' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>Active</button>
                    <button onClick={() => setFilterMode('unread')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${filterMode === 'unread' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}>Unread</button>
                </div>

                <div className="flex-grow overflow-y-auto space-y-3 custom-scrollbar pr-1">
                    {displayedConversations.length === 0 ? (
                        <div className="py-12 text-center opacity-20 italic text-xs">NO ACTIVE TRANSMISSIONS</div>
                    ) : (
                        displayedConversations.map(conv => {
                            const otherUid = conv.participantUids.find(uid => uid !== userProfile.uid);
                            const other = otherUid ? conv.participantInfo[otherUid] : null;
                            const unread = conv.unreadCount?.[userProfile.uid] || 0;
                            return (
                                <button key={conv.id} onClick={() => setActiveConversationId(conv.id)}
                                    className={`group w-full text-left p-4 rounded-2xl transition-all border ${activeConversationId === conv.id ? 'bg-blue-600/10 border-blue-500/30' : 'bg-slate-800/40 border-transparent hover:bg-slate-800'}`}>
                                    <div className="flex justify-between items-start">
                                        <div className="min-w-0">
                                            <p className={`font-black uppercase text-sm tracking-tight ${activeConversationId === conv.id ? 'text-blue-400' : 'text-slate-200'}`}>{other?.name || 'TERMINAL'}</p>
                                            <p className="text-[10px] text-slate-500 truncate font-medium mt-0.5">{conv.lastMessage?.text || 'Establishing Link...'}</p>
                                        </div>
                                        {unread > 0 && <span className="bg-blue-500 text-white text-[9px] font-black rounded-lg h-5 w-5 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)]">{unread}</span>}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className={`md:col-span-2 flex flex-col h-full bg-slate-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
                {activeConversationId && otherParticipantInfo ? (
                    <>
                        <div className="p-6 border-b border-white/5 flex-shrink-0 bg-slate-800/20 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <button onClick={() => setActiveConversationId(null)} className="md:hidden text-slate-400 p-2 bg-white/5 rounded-lg">←</button>
                                <div>
                                    <h4 className="font-black text-white uppercase tracking-tighter text-lg">{otherParticipantInfo.name}</h4>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{otherParticipantInfo.role}</p>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleSummarizeContext} disabled={isSummarizing || messages.length < 5} className="px-5 py-2.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 hover:text-white transition-all">✨ Catch Up</button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-6 space-y-6 relative custom-scrollbar">
                            {conversationSummary && (
                                <div className="sticky top-0 z-20 mb-8 p-6 bg-blue-600/10 backdrop-blur-xl border border-blue-500/30 rounded-3xl shadow-2xl animate-fade-in-down">
                                    <div className="flex justify-between items-center mb-4">
                                        <h5 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">AI Summary Protocol</h5>
                                        <button onClick={() => setConversationSummary(null)} className="text-slate-500 hover:text-white">✕</button>
                                    </div>
                                    <div className="text-sm text-slate-200 leading-relaxed italic prose-styles" dangerouslySetInnerHTML={{ __html: conversationSummary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                                </div>
                            )}

                            {loadingMessages ? <div className="flex justify-center items-center h-full"><Spinner /></div> : messages.map(msg => (
                                <div key={msg.id} className={`flex flex-col ${msg.senderId === userProfile.uid ? 'items-end' : 'items-start'}`}>
                                    <div className={`p-4 rounded-2xl max-w-[85%] break-words shadow-lg transition-transform hover:scale-[1.01] ${msg.senderId === userProfile.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>
                                        {msg.imageUrl && <img src={msg.imageUrl} alt="Dispatch" className="rounded-xl max-w-full mb-3 border border-white/10 shadow-2xl" />}
                                        {msg.audioUrl && <audio controls src={msg.audioUrl} className="max-w-full h-8 mb-2 opacity-80" />}
                                        {msg.text && <p className="text-sm leading-relaxed font-medium">{msg.text}</p>}
                                    </div>
                                    <span className="text-[8px] font-black text-slate-600 mt-2 uppercase tracking-widest px-1">
                                        {msg.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        <div className="p-4 bg-slate-800/40 border-t border-white/5">
                            <ChatInput onSendMessage={handleSendChatInput} isSending={isSending} />
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600 italic select-none">
                        <span className="text-8xl mb-6 opacity-5">🛰️</span>
                        <p className="font-black uppercase tracking-[0.6em] text-xs">Waiting for uplink...</p>
                    </div>
                )}
            </div>
        </div>
        
        {/* New Message Modal */}
        {showNewMessageModal && (
            <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex justify-center items-center p-4 z-[200] animate-fade-in">
                <Card className="w-full max-w-md h-[70vh] flex flex-col !p-0 overflow-hidden bg-slate-900 border-white/10 shadow-3xl rounded-[3rem]">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
                        <h3 className="text-lg font-black text-white uppercase tracking-tighter">Authorized Contacts</h3>
                        <button onClick={() => setShowNewMessageModal(false)} className="text-slate-500 hover:text-white p-2">✕</button>
                    </div>
                    <div className="p-6 border-b border-white/5">
                        <input 
                            type="search" 
                            placeholder="Find Authorized Staff..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full p-4 bg-slate-950 rounded-2xl border border-white/10 text-white outline-none focus:border-blue-500 transition-all font-bold text-sm"
                        />
                    </div>
                    <div className="flex-grow overflow-y-auto p-4 space-y-2 custom-scrollbar">
                        {filteredContacts.map(contact => (
                            <button key={contact.uid} onClick={() => handleStartNewConversation(contact)} className="w-full text-left p-4 bg-slate-800/40 rounded-2xl hover:bg-blue-600/10 border border-transparent hover:border-blue-500/20 transition-all flex items-center gap-4 group">
                                <div className="w-12 h-12 rounded-xl bg-slate-700 flex items-center justify-center font-black text-blue-400 shadow-inner group-hover:bg-blue-600 group-hover:text-white transition-all uppercase">
                                    {(contact.name || '?').charAt(0)}
                                </div>
                                <div>
                                    <p className="font-black text-white uppercase tracking-tight text-sm">{contact.name}</p>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">{contact.role}</p>
                                </div>
                            </button>
                        ))}
                         {filteredContacts.length === 0 && <p className="text-center text-slate-700 font-bold uppercase text-[10px] tracking-widest py-10">NO MATCHING AUTHORITIES</p>}
                    </div>
                </Card>
            </div>
        )}
    </div>
  );
};

export default MessagingView;