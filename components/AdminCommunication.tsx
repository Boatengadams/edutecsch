
import React, { useState } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { db, firebase, functions } from '../services/firebase';
import { useToast } from './common/Toast';

const AdminCommunication: React.FC = () => {
    const { showToast } = useToast();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [targetAudience, setTargetAudience] = useState<'everyone' | 'role'>('everyone');
    const [targetRole, setTargetRole] = useState<'student' | 'teacher' | 'parent'>('student');
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const handleBroadcast = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !message) return;

        setIsBroadcasting(true);
        try {
            const broadcastFn = functions.httpsCallable('sendBroadcastNotification');
            const result = await broadcastFn({
                title,
                message,
                targetAudience,
                targetRoles: targetAudience === 'role' ? [targetRole] : []
            });
            
            showToast(`Success! Broadcast sent to ${result.data.count} users.`, 'success');
            setTitle('');
            setMessage('');
        } catch (err: any) {
            showToast(`Broadcast failed: ${err.message}`, 'error');
        } finally {
            setIsBroadcasting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up">
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">Communication Center</h2>
            <Card className="bg-slate-900/80">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Create Global Announcement</h3>
                <form onSubmit={handleBroadcast} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Headline / Title</label>
                        <input 
                            type="text" 
                            value={title} 
                            onChange={e => setTitle(e.target.value)} 
                            placeholder="e.g. End of Term Examination Notice" 
                            className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl outline-none focus:ring-2 ring-blue-500/30"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Announcement Content</label>
                        <textarea 
                            value={message} 
                            onChange={e => setMessage(e.target.value)} 
                            rows={5} 
                            className="w-full p-4 bg-slate-950 border border-white/5 rounded-2xl outline-none focus:ring-2 ring-blue-500/30 resize-none"
                            placeholder="Write your announcement content here..."
                            required
                        />
                    </div>
                    <div className="flex flex-col md:flex-row gap-6 items-center">
                        <div className="flex-1 w-full">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-3 tracking-widest">Target Audience</label>
                            <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={targetAudience === 'everyone'} onChange={() => setTargetAudience('everyone')} className="text-blue-600 bg-slate-800" />
                                    <span className="text-sm text-slate-300">Everyone</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="radio" checked={targetAudience === 'role'} onChange={() => setTargetAudience('role')} className="text-blue-600 bg-slate-800" />
                                    <span className="text-sm text-slate-300">Specific Roles</span>
                                </label>
                            </div>
                        </div>
                        {targetAudience === 'role' && (
                            <div className="flex-1 w-full">
                                <select value={targetRole} onChange={e => setTargetRole(e.target.value as any)} className="w-full p-3 bg-slate-950 border border-white/5 rounded-xl text-sm">
                                    <option value="student">Students Only</option>
                                    <option value="teacher">Teachers Only</option>
                                    <option value="parent">Parents Only</option>
                                </select>
                            </div>
                        )}
                    </div>
                    <Button type="submit" disabled={isBroadcasting} className="w-full py-4 font-black uppercase tracking-widest shadow-xl shadow-blue-900/30">
                        {isBroadcasting ? <Spinner /> : '🚀 Publish to Notice Board'}
                    </Button>
                </form>
            </Card>
        </div>
    );
};

export default AdminCommunication;
