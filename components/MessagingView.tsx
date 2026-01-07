
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, firebase, storage } from '../services/firebase';
import { UserProfile, Conversation, Message } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import CameraModal from './common/CameraModal';
import { GoogleGenAI } from '@google/genai';
import ChatInput from './common/ChatInput';

interface MessagingViewProps {
  userProfile: UserProfile;
  contacts: UserProfile[];
}

const MessagingView: React.FC<MessagingViewProps> = ({ userProfile, contacts }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New State for enhancements
  const [filterMode, setFilterMode] = useState<'all' | 'unread'>('all');
  const [conversationSummary, setConversationSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

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
        console.warn("Conversations listener error:", err.message);
        setLoadingConversations(false);
    });

    return () => unsubscribe();
  }, [userProfile.uid]);

  // Fetch messages for active conversation and mark as read
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      setConversationSummary(null); // Reset summary when switching chats
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

        // Mark as read logic
        const convRef = db.collection('conversations').doc(activeConversationId);
        const convDoc = await convRef.get();
        if (convDoc.exists && (convDoc.data() as Conversation).unreadCount?.[userProfile.uid] > 0) {
            await convRef.update({ [`unreadCount.${userProfile.uid}`]: 0 });
        }
      }, err => {
          console.warn("Messages listener error:", err.message);
          setLoadingMessages(false);
      });

    return () => unsubscribe();
  }, [activeConversationId, userProfile.uid]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending, conversationSummary]); 

  const handleSendChatInput = async (messageContent: { text: string; image: File | null; audio: Blob | null }) => {
    if ((!messageContent.text && !messageContent.image && !messageContent.audio) || !activeConversationId || isSending) return;
    
    setIsSending(true);
    const conversationRef = db.collection('conversations').doc(activeConversationId);
    const messageRef = conversationRef.collection('messages').doc();

    const conversationDoc = await conversationRef.get();
    if (!conversationDoc.exists) {
        setIsSending(false);
        return;
    };
    const conversationData = conversationDoc.data() as Conversation;

    const messageData: Partial<Message> = {
      senderId: userProfile.uid,
      senderName: userProfile.name,
      createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
      readBy: [],
    };
    
    if (messageContent.text.trim()) {
        messageData.text = messageContent.text;
    }

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
                lastMessage: {
                    text: previewText,
                    senderId: userProfile.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                [`unreadCount.${otherParticipantUid}`]: firebase.firestore.FieldValue.increment(1)
            });
        }
        
        await batch.commit();
    } catch (err) {
        console.error("Failed to send message:", err);
    } finally {
        setIsSending(false);
    }
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
          // Get the last 20 messages for context
          const recentMessages = messages.slice(-20);
          const conversationText = recentMessages.map(m => `${m.senderName}: ${m.text || '[Image/Audio]'}`).join('\n');
          
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Summarize the following conversation history between ${userProfile.name} and the other participant. Highlight key points, questions asked, or pending tasks. Keep it concise and bulleted.\n\nConversation:\n${conversationText}`;
          
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: prompt
          });
          
          setConversationSummary(response.text);
      } catch (err) {
          console.error("Summarization failed:", err);
          setConversationSummary("Could not generate summary at this time.");
      } finally {
          setIsSummarizing(false);
      }
  };
  
  const activeConversation = conversations.find(c => c.id === activeConversationId);
  
  const otherParticipantInfo = useMemo(() => {
    if (!activeConversation) return null;
    const otherUid = activeConversation.participantUids.find(uid => uid !== userProfile.uid);
    if (!otherUid) return null;
    return activeConversation.participantInfo[otherUid];
  }, [activeConversation, userProfile.uid]);

  const filteredContacts = useMemo(() => {
    if (!Array.isArray(contacts)) return [];
    return contacts
        .filter(c => c && c.uid && c.name) 
        .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        .filter(c => (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()));
  }, [contacts, searchTerm]);

  // Filter conversations based on tab
  const displayedConversations = useMemo(() => {
      if (filterMode === 'all') return conversations;
      return conversations.filter(c => {
          const unread = c.unreadCount?.[userProfile.uid] || 0;
          // Show if unread messages > 0 OR last message was within 24 hours
          const isRecent = c.updatedAt && (Date.now() - c.updatedAt.toMillis() < 24 * 60 * 60 * 1000);
          return unread > 0 || isRecent;
      });
  }, [conversations, filterMode, userProfile.uid]);

  return (
    <>
    <Card className="h-[calc(100vh-100px)]">
        <div className="grid grid-cols-1 md:grid-cols-3 h-full gap-4">
            {/* Sidebar */}
            <div className={`md:col-span-1 flex flex-col h-full border-r border-slate-700 pr-4 ${activeConversationId ? 'hidden md:flex' : 'flex'}`}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xl font-bold">Conversations</h3>
                    <Button size="sm" onClick={() => setShowNewMessageModal(true)} className="text-xs px-2">+ New</Button>
                </div>
                
                {/* Filter Tabs */}
                <div className="flex p-1 bg-slate-800 rounded-lg mb-4 flex-shrink-0">
                    <button 
                        onClick={() => setFilterMode('all')}
                        className={`flex-1 py-1.5 text-sm rounded-md transition-all ${filterMode === 'all' ? 'bg-slate-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        All
                    </button>
                    <button 
                        onClick={() => setFilterMode('unread')}
                        className={`flex-1 py-1.5 text-sm rounded-md transition-all ${filterMode === 'unread' ? 'bg-slate-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
                    >
                        Unread
                    </button>
                </div>

                {loadingConversations ? <div className="flex justify-center items-center h-full"><Spinner /></div> : (
                    <div className="flex-grow overflow-y-auto space-y-2">
                        {displayedConversations.length === 0 ? (
                            <p className="text-center text-gray-500 text-sm py-4">No conversations found.</p>
                        ) : (
                            displayedConversations.map(conv => {
                                const otherUserUid = conv.participantUids.find(uid => uid !== userProfile.uid);
                                const otherUser = otherUserUid ? conv.participantInfo[otherUserUid] : null;
                                const unread = conv.unreadCount?.[userProfile.uid] || 0;
                                return (
                                    <button key={conv.id} onClick={() => setActiveConversationId(conv.id)}
                                        className={`w-full text-left p-3 rounded-md transition-colors ${activeConversationId === conv.id ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                        <div className="flex justify-between items-start">
                                            <div className="min-w-0">
                                                <p className="font-bold truncate">{otherUser?.name || 'Unknown User'}</p>
                                                <p className="text-xs text-gray-400 truncate max-w-[150px]">{conv.lastMessage?.text}</p>
                                            </div>
                                            {unread > 0 && <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0 ml-2">{unread}</span>}
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Chat Area */}
            <div className={`md:col-span-2 flex flex-col h-full bg-slate-900/30 rounded-xl overflow-hidden ${!activeConversationId ? 'hidden md:flex' : 'flex'}`}>
                {activeConversationId && otherParticipantInfo ? (
                    <>
                        <div className="p-3 border-b border-slate-700 flex-shrink-0 bg-slate-800/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <button onClick={() => setActiveConversationId(null)} className="md:hidden text-slate-400 mr-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                                </button>
                                <div>
                                    <h4 className="font-bold text-white">{otherParticipantInfo.name}</h4>
                                    <p className="text-xs text-gray-400 capitalize">{otherParticipantInfo.role}</p>
                                </div>
                            </div>
                            <button 
                                onClick={handleSummarizeContext} 
                                disabled={isSummarizing || messages.length < 5}
                                className="text-xs flex items-center gap-1 bg-purple-600/20 text-purple-300 px-3 py-1.5 rounded-full hover:bg-purple-600/30 transition-colors disabled:opacity-50"
                                title="Summarize the last 20 messages using AI"
                            >
                                {isSummarizing ? <span className="animate-spin">✨</span> : '✨'} Catch me up
                            </button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-4 space-y-4 relative">
                            {/* AI Summary Panel */}
                            {conversationSummary && (
                                <div className="sticky top-0 z-10 mb-4 p-4 bg-purple-900/80 backdrop-blur-md border border-purple-500/50 rounded-xl shadow-lg animate-fade-in-down">
                                    <div className="flex justify-between items-start mb-2">
                                        <h5 className="text-sm font-bold text-purple-200 flex items-center gap-2">✨ Conversation Summary</h5>
                                        <button onClick={() => setConversationSummary(null)} className="text-purple-300 hover:text-white">&times;</button>
                                    </div>
                                    <div className="text-xs text-slate-200 prose-styles" dangerouslySetInnerHTML={{ __html: conversationSummary.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                                </div>
                            )}

                            {loadingMessages ? <div className="flex justify-center items-center h-full"><Spinner /></div> : messages.map(msg => (
                                <div key={msg.id} className={`flex flex-col ${msg.senderId === userProfile.uid ? 'items-end' : 'items-start'}`}>
                                    <span className="text-[10px] text-gray-500 font-bold mx-1 mb-0.5">{msg.senderId === userProfile.uid ? 'You' : msg.senderName}</span>
                                    <div className={`p-2.5 rounded-2xl max-w-[80%] break-words shadow-sm ${msg.senderId === userProfile.uid ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                                        {msg.imageUrl && <img src={msg.imageUrl} alt="Sent attachment" className="rounded-lg max-w-full mb-2 border border-white/10" />}
                                        {msg.audioUrl && <audio controls src={msg.audioUrl} className="max-w-full h-8 mb-1" />}
                                        {msg.text && <p className="text-sm leading-relaxed">{msg.text}</p>}
                                    </div>
                                    <span className="text-[10px] text-gray-600 mt-1 px-1">
                                        {msg.createdAt?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </span>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        
                        <ChatInput onSendMessage={handleSendChatInput} isSending={isSending} />
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 hidden md:flex">
                        <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        </div>
                        <p>Select a conversation to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
        
        {/* New Message Modal */}
        {showNewMessageModal && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                <Card className="w-full max-w-md h-[70vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Start a New Conversation</h3>
                        <Button variant="secondary" size="sm" onClick={() => setShowNewMessageModal(false)}>Close</Button>
                    </div>
                    <div className="relative mb-4">
                        <input 
                            type="search" 
                            placeholder="Search contacts..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full p-2.5 pl-9 bg-slate-700 rounded-lg border border-slate-600 focus:border-blue-500 outline-none"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 absolute left-2.5 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <div className="flex-grow overflow-y-auto space-y-2 custom-scrollbar">
                        {filteredContacts.map(contact => (
                            <button key={contact.uid} onClick={() => handleStartNewConversation(contact)} className="w-full text-left p-3 bg-slate-700/50 rounded-lg hover:bg-slate-600 transition-colors flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                                    {(contact.name || '?').charAt(0)}
                                </div>
                                <div>
                                    <p className="font-semibold text-sm">{contact.name}</p>
                                    <p className="text-xs text-gray-400 capitalize">{contact.role}</p>
                                </div>
                            </button>
                        ))}
                         {filteredContacts.length === 0 && <p className="text-center text-gray-500 text-sm p-4">No contacts found.</p>}
                    </div>
                </Card>
            </div>
        )}
    </Card>
    </>
  );
};

export default MessagingView;
