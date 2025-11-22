
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, firebase, storage } from '../services/firebase';
import { UserProfile, Conversation, Message } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
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

  // Fetch conversations
  useEffect(() => {
    const q = db.collection('conversations')
        .where('participantUids', 'array-contains', userProfile.uid)
        .orderBy('updatedAt', 'desc');
        
    const unsubscribe = q.onSnapshot(snapshot => {
        const convos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Conversation));
        setConversations(convos);
        setLoadingConversations(false);
    }, () => setLoadingConversations(false));

    return () => unsubscribe();
  }, [userProfile.uid]);

  // Fetch messages for active conversation and mark as read
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
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
      }, () => setLoadingMessages(false));

    return () => unsubscribe();
  }, [activeConversationId, userProfile.uid]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (messageContent: { text: string; image: File | null; audio: Blob | null }) => {
    if (!activeConversationId || isSending) return;
    
    setIsSending(true);
    try {
        const conversationRef = db.collection('conversations').doc(activeConversationId);
        const messageRef = conversationRef.collection('messages').doc();

        const conversationDoc = await conversationRef.get();
        if (!conversationDoc.exists) return;
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
            let lastMsgText = messageData.text || '';
            if (messageData.imageUrl) lastMsgText = '[Photo] ' + lastMsgText;
            if (messageData.audioUrl) lastMsgText = '[Audio] ' + lastMsgText;

            batch.update(conversationRef, {
                lastMessage: {
                    text: lastMsgText,
                    senderId: userProfile.uid,
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                },
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                [`unreadCount.${otherParticipantUid}`]: firebase.firestore.FieldValue.increment(1)
            });
        }
        
        await batch.commit();
    } catch (err) {
        console.error("Error sending message:", err);
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

  return (
    <>
    <Card className="h-[calc(100vh-100px)]">
        <div className="grid grid-cols-1 md:grid-cols-3 h-full gap-4">
            <div className="md:col-span-1 flex flex-col h-full border-r border-slate-700 pr-4">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h3 className="text-xl font-bold">Conversations</h3>
                    <Button size="sm" onClick={() => setShowNewMessageModal(true)}>New Message</Button>
                </div>
                {loadingConversations ? <div className="flex justify-center items-center h-full"><Spinner /></div> : (
                    <div className="flex-grow overflow-y-auto space-y-2">
                        {conversations.map(conv => {
                            const otherUserUid = conv.participantUids.find(uid => uid !== userProfile.uid);
                            const otherUser = otherUserUid ? conv.participantInfo[otherUserUid] : null;
                            const unread = conv.unreadCount?.[userProfile.uid] || 0;
                            return (
                                <button key={conv.id} onClick={() => setActiveConversationId(conv.id)}
                                    className={`w-full text-left p-3 rounded-md transition-colors ${activeConversationId === conv.id ? 'bg-blue-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold">{otherUser?.name || 'Unknown User'}</p>
                                            <p className="text-xs text-gray-400 truncate max-w-[150px]">{conv.lastMessage?.text}</p>
                                        </div>
                                        {unread > 0 && <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center flex-shrink-0">{unread}</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
            <div className="md:col-span-2 flex flex-col h-full">
                {activeConversationId && otherParticipantInfo ? (
                    <>
                        <div className="p-3 border-b border-slate-700 flex-shrink-0">
                            <h4 className="font-bold">{otherParticipantInfo.name}</h4>
                            <p className="text-xs text-gray-400 capitalize">{otherParticipantInfo.role}</p>
                        </div>
                        <div className="flex-grow overflow-y-auto p-4 space-y-4">
                            {loadingMessages ? <div className="flex justify-center items-center h-full"><Spinner /></div> : messages.map(msg => (
                                <div key={msg.id} className={`flex flex-col ${msg.senderId === userProfile.uid ? 'items-end' : 'items-start'}`}>
                                    <span className="text-xs text-gray-400 font-bold mx-1">{msg.senderId === userProfile.uid ? 'You' : msg.senderName}</span>
                                    <div className={`p-2 rounded-lg max-w-sm break-words ${msg.senderId === userProfile.uid ? 'bg-blue-600 text-white' : 'bg-slate-700'}`}>
                                        {msg.imageUrl && <img src={msg.imageUrl} alt="Sent attachment" className="rounded-md max-w-xs mb-1" />}
                                        {msg.audioUrl && <audio src={msg.audioUrl} controls className="mb-1 max-w-full" />}
                                        {msg.text && <p className="text-sm px-1">{msg.text}</p>}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <ChatInput onSendMessage={handleSendMessage} isSending={isSending} />
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        <p>Select a conversation to start chatting.</p>
                    </div>
                )}
            </div>
        </div>
        {showNewMessageModal && (
            <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
                <Card className="w-full max-w-md h-[70vh] flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Start a New Conversation</h3>
                        <Button variant="secondary" size="sm" onClick={() => setShowNewMessageModal(false)}>Close</Button>
                    </div>
                    <input type="search" placeholder="Search contacts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full p-2 bg-slate-700 rounded-md border border-slate-600 mb-4"/>
                    <div className="flex-grow overflow-y-auto space-y-2">
                        {filteredContacts.map(contact => (
                            <button key={contact.uid} onClick={() => handleStartNewConversation(contact)} className="w-full text-left p-3 bg-slate-700 rounded-md hover:bg-slate-600">
                                <p className="font-semibold">{contact.name}</p>
                                <p className="text-xs text-gray-400 capitalize">{contact.role}</p>
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
