import React, { useState } from 'react';
import { useAuthentication } from '../../hooks/useAuth';
// FIX: Import firebase to access compat auth providers.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import Card from './Card';
import Button from './Button';

const ChangePasswordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { user } = useAuthentication();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }
        if (!user || !user.email) {
            setError("Could not find user information.");
            return;
        }

        setLoading(true);
        try {
            // FIX: Use v8 compat syntax for auth operations.
            const credential = firebase.auth.EmailAuthProvider.credential(user.email, currentPassword);
            await user.reauthenticateWithCredential(credential);
            await user.updatePassword(newPassword);
            setSuccess("Password updated successfully!");
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (err: any) {
            let friendlyMessage = 'An unexpected error occurred. Please try again.';
            switch(err.code) {
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                     friendlyMessage = 'The current password you entered is incorrect.';
                     break;
                case 'auth/weak-password':
                    friendlyMessage = 'The new password is too weak. It must be at least 6 characters long.';
                    break;
                case 'auth/requires-recent-login':
                    friendlyMessage = 'This operation is sensitive and requires recent authentication. Please sign out and sign in again before changing your password.';
                    break;
            }
            setError(friendlyMessage);
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50">
            <Card className="w-full max-w-md">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-lg font-bold">Change Password</h3>
                     <div>
                        <label htmlFor="currentPassword">Current Password</label>
                        <input
                            id="currentPassword"
                            type="password"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            required
                             className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                        />
                    </div>
                     <div>
                        <label htmlFor="newPassword">New Password</label>
                        <input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                             className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                        />
                    </div>
                     <div>
                        <label htmlFor="confirmPassword">Confirm New Password</label>
                        <input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                             className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md"
                        />
                    </div>
                    {error && <p className="text-red-400">{error}</p>}
                    {success && <p className="text-green-400">{success}</p>}
                    <div className="flex gap-2">
                        <Button type="submit" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</Button>
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default ChangePasswordModal;