import React, { useState, useEffect, useRef, useMemo } from 'react';
import { db, firebase, storage } from './services/firebase';
// FIX: Changed import path to './types' as this file is in the root directory next to types.ts.
import { UserProfile, Conversation, Message } from './types';
import Card from './components/common/Card';
import Button from './components/common/Button';
import Spinner from './components/common/Spinner';
import CameraModal from './components/common/CameraModal';

// Helper to convert dataURL to File object
const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid data URL');
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

// Helper to get a preview URL from a File object
const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


interface MessagingViewProps {
  userProfile: UserProfile;
  contacts: UserProfile[];
}

const MessagingView: React.FC<MessagingViewProps> = ({ userProfile, contacts }) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [imageToSend, setImageToSend] = useState<{ file: File | null; preview: string | null }>({ file: null, preview: null });
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !imageToSend.file) || !activeConversationId || isSending) return;
    
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
    
    if (newMessage.trim()) {
        messageData.text = newMessage;
    }

    if (imageToSend.file) {
        const storagePath = `direct_messages/${activeConversationId}/${messageRef.id}-${imageToSend.file.name}`;
        const storageRef = storage.ref(storagePath);
        await storageRef.put(imageToSend.file);
        messageData.imageUrl = await storageRef.getDownloadURL();
        messageData.storagePath = storagePath;
    }
    
    const batch = db.batch();
    batch.set(messageRef, messageData);
    
    const otherParticipantUid = conversationData.participantUids.find(uid => uid !== userProfile.uid);
    if (otherParticipantUid) {
        batch.update(conversationRef, {
            lastMessage: {
                text: messageData.imageUrl ? '[Photo]' : messageData.text,
                senderId: userProfile.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            },
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            [`unreadCount.${otherParticipantUid}`]: firebase.firestore.FieldValue.increment(1)
        });
    }
    
    await batch.commit();
    setNewMessage('');
    setImageToSend({ file: null, preview: null });
    setIsSending(false);
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
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const preview = await fileToDataUrl(file);
      setImageToSend({ file, preview });
    }
  };

  const handleCameraCapture = (dataUrl: string) => {
    const file = dataURLtoFile(dataUrl, `capture-${Date.now()}.jpg`);
    setImageToSend({ file, preview: dataUrl });
    setShowCamera(false);
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
                                        {msg.text && <p className="text-sm px-1">{msg.text}</p>}
                                    </div>
                                </div>
                            ))}
                            <div ref={messagesEndRef} />
                        </div>
                        <form onSubmit={handleSendMessage} className="p-2 flex flex-col gap-2 flex-shrink-0">
                           {imageToSend.preview && (
                                <div className="relative w-24 h-24 p-1">
                                    <img src={imageToSend.preview} alt="Preview" className="w-full h-full object-cover rounded-md" />
                                    <button type="button" onClick={() => setImageToSend({ file: null, preview: null })} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center">&times;</button>
                                </div>
                            )}
                            <div className="flex gap-2 items-center">
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                                <Button type="button" variant="secondary" size="sm" onClick={() => setShowCamera(true)}>📷</Button>
                                <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>📎</Button>
                                <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-grow p-2 bg-slate-800 rounded-md border border-slate-600"/>
                                <Button type="submit" disabled={isSending || (!newMessage.trim() && !imageToSend.file)}>{isSending ? '...' : 'Send'}</Button>
                            </div>
                        </form>
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
    {showCamera && <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
    </>
  );
};

export default MessagingView;