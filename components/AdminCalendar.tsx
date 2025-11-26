
import React, { useState, useEffect } from 'react';
import { db, firebase } from '../services/firebase';
import { SchoolEvent, EVENT_TYPES, EVENT_AUDIENCE, SchoolEventType, SchoolEventAudience } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import Spinner from './common/Spinner';
import { useToast } from './common/Toast';
import ConfirmationModal from './common/ConfirmationModal';

const AdminCalendar: React.FC = () => {
    const { showToast } = useToast();
    const [events, setEvents] = useState<SchoolEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [eventToDelete, setEventToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState('');
    const [type, setType] = useState<SchoolEventType>('Event');
    const [audience, setAudience] = useState<SchoolEventAudience>('All');

    useEffect(() => {
        const unsubscribe = db.collection('calendarEvents')
            .orderBy('date', 'asc')
            .onSnapshot(snapshot => {
                const fetchedEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SchoolEvent));
                // Filter out past events (older than 30 days) to keep list clean, or keep all
                setEvents(fetchedEvents);
                setLoading(false);
            }, err => {
                console.error(err);
                setLoading(false);
            });
        return () => unsubscribe();
    }, []);

    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date) return;
        setIsSaving(true);
        try {
            const newEvent: Omit<SchoolEvent, 'id'> = {
                title,
                description,
                date,
                type,
                audience,
                createdAt: firebase.firestore.FieldValue.serverTimestamp() as firebase.firestore.Timestamp,
                createdBy: 'admin',
                createdByName: 'Administrator'
            };
            await db.collection('calendarEvents').add(newEvent);
            showToast('Event added successfully', 'success');
            setTitle('');
            setDescription('');
            setDate('');
        } catch (err: any) {
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!eventToDelete) return;
        setIsDeleting(true);
        try {
            await db.collection('calendarEvents').doc(eventToDelete).delete();
            showToast('Event deleted successfully', 'success');
        } catch (err: any) {
            showToast(`Error deleting event: ${err.message}`, 'error');
        } finally {
            setIsDeleting(false);
            setEventToDelete(null);
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold">School Calendar & Events</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                    <Card>
                        <h3 className="text-lg font-bold mb-4">Add New Event</h3>
                        <form onSubmit={handleAddEvent} className="space-y-4">
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Title</label>
                                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full p-2 bg-slate-800 rounded border border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Date</label>
                                <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full p-2 bg-slate-800 rounded border border-slate-700" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Type</label>
                                    <select value={type} onChange={e => setType(e.target.value as SchoolEventType)} className="w-full p-2 bg-slate-800 rounded border border-slate-700">
                                        {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Audience</label>
                                    <select value={audience} onChange={e => setAudience(e.target.value as SchoolEventAudience)} className="w-full p-2 bg-slate-800 rounded border border-slate-700">
                                        {EVENT_AUDIENCE.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full p-2 bg-slate-800 rounded border border-slate-700" />
                            </div>
                            <Button type="submit" disabled={isSaving} className="w-full">
                                {isSaving ? 'Saving...' : 'Add Event'}
                            </Button>
                        </form>
                    </Card>
                </div>

                <div className="lg:col-span-2">
                    <Card className="h-full">
                        <h3 className="text-lg font-bold mb-4">Upcoming Events</h3>
                        {loading ? <Spinner /> : (
                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {events.length === 0 ? <p className="text-gray-500">No events scheduled.</p> : 
                                events.map(event => (
                                    <div key={event.id} className="flex justify-between items-center p-4 bg-slate-800 rounded-lg border-l-4 border-blue-500 hover:bg-slate-700 transition-colors">
                                        <div>
                                            <h4 className="font-bold text-white">{event.title}</h4>
                                            <div className="flex gap-3 text-sm text-gray-400 mt-1">
                                                <span>📅 {new Date(event.date).toLocaleDateString()}</span>
                                                <span>🏷️ {event.type}</span>
                                                <span>👥 {event.audience}</span>
                                            </div>
                                            {event.description && <p className="text-sm text-slate-500 mt-2">{event.description}</p>}
                                        </div>
                                        <button onClick={() => setEventToDelete(event.id)} className="p-2 text-slate-500 hover:text-red-400 transition-colors" title="Delete Event">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            <ConfirmationModal 
                isOpen={!!eventToDelete}
                onClose={() => setEventToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Event"
                message="Are you sure you want to delete this event? This action cannot be undone."
                confirmButtonText="Yes, Delete"
                isLoading={isDeleting}
            />
        </div>
    );
};

export default AdminCalendar;
