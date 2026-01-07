
import React, { useState, useEffect } from 'react';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { db, firebase, storage } from '../services/firebase';
import { SchoolSettings } from '../types';
import { useToast } from './common/Toast';

const AdminSettings: React.FC = () => {
    const { showToast } = useToast();
    const [settings, setSettings] = useState<SchoolSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [logoFile, setLogoFile] = useState<File | null>(null);

    useEffect(() => {
        const unsubscribe = db.collection('schoolConfig').doc('settings').onSnapshot(doc => {
            if (doc.exists) {
                setSettings(doc.data() as SchoolSettings);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!settings) return;
        setIsSaving(true);
        try {
            let logoUrl = settings.schoolLogoUrl;
            if (logoFile) {
                const storageRef = storage.ref(`schoolConfig/logo_${Date.now()}`);
                await storageRef.put(logoFile);
                logoUrl = await storageRef.getDownloadURL();
            }

            await db.collection('schoolConfig').doc('settings').set({
                ...settings,
                schoolLogoUrl: logoUrl,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            showToast("Settings updated successfully", "success");
        } catch (err) {
            showToast("Failed to save settings", "error");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return <div className="flex justify-center p-20"><Spinner /></div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in-up pb-20">
            <h2 className="text-3xl font-black text-white uppercase tracking-tight">System Configuration</h2>
            
            <form onSubmit={handleSave} className="space-y-6">
                <Card>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Branding & Identity</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="col-span-1 md:col-span-2 flex items-center gap-6 p-4 bg-slate-900 rounded-2xl border border-white/5">
                             <div className="w-24 h-24 rounded-2xl bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center overflow-hidden">
                                {logoFile ? (
                                    <img src={URL.createObjectURL(logoFile)} className="w-full h-full object-contain" />
                                ) : settings?.schoolLogoUrl ? (
                                    <img src={settings.schoolLogoUrl} className="w-full h-full object-contain" />
                                ) : <span className="text-2xl opacity-20">LOGO</span>}
                             </div>
                             <div>
                                <input type="file" id="logo-upload" className="hidden" accept="image/*" onChange={e => setLogoFile(e.target.files?.[0] || null)} />
                                <label htmlFor="logo-upload" className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold uppercase tracking-widest cursor-pointer transition-colors">Change Logo</label>
                                <p className="text-[10px] text-slate-500 mt-3 font-mono">SVG or PNG recommended (max 5MB)</p>
                             </div>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">School Name</label>
                            <input 
                                type="text" 
                                value={settings?.schoolName || ''} 
                                onChange={e => setSettings(prev => ({...prev!, schoolName: e.target.value}))}
                                className="w-full p-3 bg-slate-900 border border-white/5 rounded-xl outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Motto</label>
                            <input 
                                type="text" 
                                value={settings?.schoolMotto || ''} 
                                onChange={e => setSettings(prev => ({...prev!, schoolMotto: e.target.value}))}
                                className="w-full p-3 bg-slate-900 border border-white/5 rounded-xl outline-none" 
                            />
                        </div>
                    </div>
                </Card>

                <Card>
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Academic Session</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Academic Year</label>
                            <input 
                                type="text" 
                                value={settings?.academicYear || ''} 
                                onChange={e => setSettings(prev => ({...prev!, academicYear: e.target.value}))}
                                placeholder="2025/2026"
                                className="w-full p-3 bg-slate-900 border border-white/5 rounded-xl outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Current Term</label>
                            <select 
                                value={settings?.currentTerm || 1} 
                                onChange={e => setSettings(prev => ({...prev!, currentTerm: parseInt(e.target.value)}))}
                                className="w-full p-3 bg-slate-900 border border-white/5 rounded-xl outline-none"
                            >
                                <option value={1}>Term 1</option>
                                <option value={2}>Term 2</option>
                                <option value={3}>Term 3</option>
                            </select>
                        </div>
                    </div>
                </Card>

                <Card>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Sleep Mode (Student Curfew)</h3>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={settings?.sleepModeConfig?.enabled} onChange={e => setSettings(prev => ({...prev!, sleepModeConfig: { ...prev!.sleepModeConfig!, enabled: e.target.checked }}))} className="sr-only peer" />
                            <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        </label>
                    </div>
                    <p className="text-xs text-slate-500 mb-6 italic">When enabled, students cannot access the portal between these hours to ensure healthy rest.</p>
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Sleep Time (Lock)</label>
                            <input 
                                type="time" 
                                value={settings?.sleepModeConfig?.sleepTime || '21:00'} 
                                onChange={e => setSettings(prev => ({...prev!, sleepModeConfig: { ...prev!.sleepModeConfig!, sleepTime: e.target.value }}))}
                                className="w-full p-3 bg-slate-900 border border-white/5 rounded-xl outline-none" 
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Wake Time (Unlock)</label>
                            <input 
                                type="time" 
                                value={settings?.sleepModeConfig?.wakeTime || '05:00'} 
                                onChange={e => setSettings(prev => ({...prev!, sleepModeConfig: { ...prev!.sleepModeConfig!, wakeTime: e.target.value }}))}
                                className="w-full p-3 bg-slate-900 border border-white/5 rounded-xl outline-none" 
                            />
                        </div>
                    </div>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button type="submit" disabled={isSaving} className="px-10 py-4 font-black uppercase tracking-widest shadow-2xl shadow-blue-900/30">
                        {isSaving ? <Spinner /> : 'Save Configuration'}
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default AdminSettings;
