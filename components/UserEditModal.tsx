
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { UserProfile, UserRole, GES_CLASSES, SubjectsByClass } from '../types';
import Card from './common/Card';
import Button from './common/Button';
import { firebase, storage } from '../services/firebase';
import CameraModal from './common/CameraModal';
import Spinner from './common/Spinner';

const ROLES: UserRole[] = ['student', 'teacher', 'parent', 'admin'];

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

// Image Compression Helper
const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 500; // Resize to max 500px width for avatars
                const scaleSize = MAX_WIDTH / img.width;
                const width = scaleSize < 1 ? MAX_WIDTH : img.width;
                const height = scaleSize < 1 ? img.height * scaleSize : img.height;

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error("Canvas context unavailable"));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        reject(new Error("Canvas to Blob failed"));
                    }
                }, 'image/jpeg', 0.8); // 80% quality
            };
            img.onerror = (error) => reject(error);
        };
        reader.onerror = (error) => reject(error);
    });
};

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (uid: string, data: Partial<UserProfile>) => Promise<void>;
  user: UserProfile | null;
  allUsers: UserProfile[];
  subjectsByClass: SubjectsByClass | null;
}

const UserEditModal: React.FC<UserEditModalProps> = ({ isOpen, onClose, onSave, user, allUsers, subjectsByClass: masterSubjectsByClass }) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Role-specific state
  const [studentClass, setStudentClass] = useState('');
  const [parentChildren, setParentChildren] = useState<string[]>([]);
  const [classTeacherOf, setClassTeacherOf] = useState<string>('');
  const [classesTaught, setClassesTaught] = useState<string[]>([]);
  const [subjectsByClass, setSubjectsByClass] = useState<Record<string, string[]>>({});
  const [isAlsoAdmin, setIsAlsoAdmin] = useState(false);
  
  // Profile Picture State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setRole(user.role);
      setStudentClass(user.class || '');
      setParentChildren(user.childUids || []);
      setClassTeacherOf(user.classTeacherOf || '');
      setClassesTaught(user.classesTaught || []);
      setSubjectsByClass(user.subjectsByClass || {});
      setIsAlsoAdmin(user.isAlsoAdmin || false);
      
      setPhotoPreview(user.photoURL || null);
      setUploadedPhotoUrl(null); // Reset new upload state
      setError('');
    }
  }, [user]);

  const allStudents = useMemo(() => allUsers.filter(u => u?.uid && u.role === 'student' && u.name), [allUsers]);

  const assignedClasses = useMemo(() => {
    const allClasses = new Set(classesTaught);
    if (classTeacherOf) {
        allClasses.add(classTeacherOf);
    }
    return Array.from(allClasses).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }));
  }, [classesTaught, classTeacherOf]);

  const handleClassesTaughtChange = (className: string) => {
    setClassesTaught(prev =>
        prev.includes(className)
            ? prev.filter(c => c !== className)
            : [...prev, className]
    );
  };
  
  const handleChildLinkChange = (childUid: string) => {
    setParentChildren(prev =>
        prev.includes(childUid)
            ? prev.filter(uid => uid !== childUid)
            : [...prev, childUid]
    );
  };

  const handleSubjectChange = (className: string, subjectName: string) => {
    setSubjectsByClass(prev => {
        const currentSubjects = prev[className] || [];
        const newSubjects = currentSubjects.includes(subjectName)
            ? currentSubjects.filter(s => s !== subjectName)
            : [...currentSubjects, subjectName];
        return {
            ...prev,
            [className]: newSubjects,
        };
    });
  };

  const uploadPhoto = async (file: File) => {
      if (!user) return;
      setIsUploading(true);
      setError('');
      try {
        const storagePath = `users/${user.uid}/profile_${Date.now()}.jpg`;
        const storageRef = storage.ref(storagePath);
        await storageRef.put(file, { contentType: 'image/jpeg' });
        const downloadURL = await storageRef.getDownloadURL();
        setUploadedPhotoUrl(downloadURL);
      } catch (uploadError: any) {
          console.error("Upload failed:", uploadError);
          setError("Failed to upload image. Please check your internet connection.");
          setPhotoPreview(user.photoURL || null); // Revert preview on failure
      } finally {
          setIsUploading(false);
      }
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          
          if (!file.type.startsWith('image/')) {
              setError('Please upload a valid image file.');
              return;
          }
          if (file.size > 10 * 1024 * 1024) { // 10MB Raw limit
               setError('Image size too large. Please pick a smaller image.');
               return;
          }

          setError('');
          setIsCompressing(true);
          
          try {
              const compressedFile = await compressImage(file);
              setPhotoPreview(URL.createObjectURL(compressedFile));
              // Trigger upload immediately for faster save
              await uploadPhoto(compressedFile);
          } catch (err) {
              console.error("Compression error", err);
              setError("Failed to process image. Please try another one.");
          } finally {
              setIsCompressing(false);
          }
      }
  };

  const handleCameraCapture = async (dataUrl: string) => {
      setIsCompressing(true);
      setError('');
      try {
        const file = dataURLtoFile(dataUrl, `profile_capture_${Date.now()}.jpg`);
        const compressedFile = await compressImage(file);
        setPhotoPreview(URL.createObjectURL(compressedFile));
        setShowCamera(false);
        // Trigger upload immediately
        await uploadPhoto(compressedFile);
      } catch(err) {
          setError("Failed to process camera image.");
      } finally {
          setIsCompressing(false);
      }
  };

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCompressing || isUploading) return; // Prevent save until upload is done
    
    setLoading(true);
    setError('');
    
    try {
      const updateData: Partial<UserProfile> = { name, role };
      
      // If we have a new uploaded URL, use it.
      if (uploadedPhotoUrl) {
          updateData.photoURL = uploadedPhotoUrl;
      } else if (user.photoURL && !photoPreview) {
          // If the user had a photo but cleared it (preview is null), delete the field
          updateData.photoURL = firebase.firestore.FieldValue.delete() as any;
      }
      
      if (role === 'teacher') {
        updateData.classTeacherOf = classTeacherOf ? classTeacherOf : (firebase.firestore.FieldValue.delete() as any);
        updateData.classesTaught = classesTaught;
        updateData.subjectsByClass = subjectsByClass;
        updateData.isAlsoAdmin = isAlsoAdmin;
        if (isAlsoAdmin) {
            updateData.adminType = 'co-admin';
        } else {
            updateData.adminType = firebase.firestore.FieldValue.delete() as any;
        }

      } else if (role === 'student') {
          updateData.class = studentClass;
      } else if (role === 'parent') {
          updateData.childUids = parentChildren;
      }

      await onSave(user.uid, updateData);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save changes.');
    } finally {
      setLoading(false);
    }
  };
  
  const renderRoleSpecificFields = () => {
      switch(role) {
          case 'student':
              return (
                  <div>
                      <label htmlFor="edit-student-class" className="block text-sm font-medium text-gray-300">Class</label>
                      <select id="edit-student-class" value={studentClass} onChange={e => setStudentClass(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md">
                          {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                  </div>
              );
          case 'parent':
              return (
                  <div>
                      <label className="block text-sm font-medium text-gray-300">Linked Children</label>
                      <div className="mt-2 grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-800 rounded-md border border-slate-600">
                          {allStudents.map(student => (
                              <label key={student.uid} className="flex items-center space-x-2 p-1 rounded-md hover:bg-slate-700 cursor-pointer">
                                  <input type="checkbox" checked={parentChildren.includes(student.uid)} onChange={() => handleChildLinkChange(student.uid)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-700" />
                                  <span className="text-gray-200 text-sm">{student.name} ({student.class})</span>
                              </label>
                          ))}
                      </div>
                  </div>
              );
          case 'teacher':
              return (
                <div className="space-y-4 border-t border-slate-600 pt-4">
                    <h4 className="text-md font-semibold text-gray-200">Teaching Assignments</h4>
                    <div>
                        <label htmlFor="edit-class-teacher" className="block text-sm font-medium text-gray-300">Class Teacher Of</label>
                        <select id="edit-class-teacher" value={classTeacherOf} onChange={(e) => setClassTeacherOf(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md">
                            <option value="">None</option>
                            {GES_CLASSES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300">Other Classes Taught</label>
                        <div className="mt-2 grid grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-slate-800 rounded-md border border-slate-600">
                            {GES_CLASSES.map(c => (
                                <label key={c} className="flex items-center space-x-2 p-1 rounded-md hover:bg-slate-700 cursor-pointer">
                                    <input type="checkbox" checked={classesTaught.includes(c)} onChange={() => handleClassesTaughtChange(c)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-700" />
                                    <span className="text-gray-200 text-sm">{c}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    {assignedClasses.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300">Subjects Taught per Class</label>
                            <div className="mt-2 space-y-3 max-h-48 overflow-y-auto p-3 bg-slate-800 rounded-md border border-slate-600">
                                {assignedClasses.map(c => {
                                    const availableSubjects = masterSubjectsByClass?.[c] || [];
                                    return (
                                        <div key={c}>
                                            <h5 className="font-semibold text-sm text-gray-300 border-b border-slate-700 pb-1">{c}</h5>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 pl-2">
                                                {availableSubjects.map(subject => (
                                                    <label key={`${c}-${subject}`} className="flex items-center space-x-2 cursor-pointer">
                                                        <input type="checkbox" checked={(subjectsByClass[c] || []).includes(subject)} onChange={() => handleSubjectChange(c, subject)} className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-500 rounded bg-slate-700" />
                                                        <span className="text-gray-300 text-xs">{subject}</span>
                                                    </label>
                                                ))}
                                                {availableSubjects.length === 0 && <p className="text-xs text-gray-500 col-span-2">No subjects enabled for this class by admin.</p>}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                     <div className="pt-4 border-t border-slate-700">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input 
                                type="checkbox" 
                                checked={isAlsoAdmin} 
                                onChange={e => setIsAlsoAdmin(e.target.checked)}
                                className="h-4 w-4 rounded bg-slate-700 border-slate-500 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-semibold">Grant Co-Admin Privileges</span>
                        </label>
                        <p className="text-xs text-gray-400 pl-6">This will allow the teacher to access the Admin Portal and switch between roles.</p>
                    </div>
                </div>
              );
          default:
              return null;
      }
  }

  return (
    <>
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-[60]">
        <Card className="w-full max-w-lg h-[90vh] flex flex-col">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
            <h3 className="text-xl font-bold mb-4 flex-shrink-0">Edit User: {user.name}</h3>
            <div className="flex-grow overflow-y-auto space-y-4 pr-2 border-y border-slate-700 py-4 custom-scrollbar">
                
                <div className="flex flex-col items-center mb-6">
                    <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-700 overflow-hidden relative group shadow-2xl">
                        {photoPreview ? (
                            <img src={photoPreview} alt="Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-5xl text-slate-600 font-bold bg-slate-900">
                                {name ? name.charAt(0) : '?'}
                            </div>
                        )}
                        
                        {/* Overlay Actions */}
                        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 gap-2 backdrop-blur-sm">
                            <button 
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 rounded-full text-[10px] font-bold text-white hover:bg-blue-500 transform hover:scale-105 transition-all shadow-lg w-24 justify-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M1 8.25a1.25 1.25 0 1 1 2.5 0v7.5a1.25 1.25 0 1 1-2.5 0v-7.5ZM11 3V1.7c0-.268.14-.526.395-.607A2 2 0 0 1 14 3c0 .995-.182 1.948-.514 2.826-.125.33-.428.525-.78.525H11v-3.25ZM11 7.75v8.5a1.25 1.25 0 1 1-2.5 0v-8.5a1.25 1.25 0 1 1 2.5 0ZM17.75 3a1.25 1.25 0 1 1-2.5 0v1.75a1.25 1.25 0 1 1 2.5 0V3Z" clipRule="evenodd" /><path d="M16.5 6.5a1.25 1.25 0 1 0 0 2.5 1.25 1.25 0 0 0 0-2.5Z" /></svg>
                                Upload
                            </button>
                            <button 
                                type="button"
                                onClick={() => setShowCamera(true)}
                                className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 rounded-full text-[10px] font-bold text-white hover:bg-purple-500 transform hover:scale-105 transition-all shadow-lg w-24 justify-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" /></svg>
                                Camera
                            </button>
                            {photoPreview && (
                                <button 
                                    type="button"
                                    onClick={() => { setUploadedPhotoUrl(null); setPhotoPreview(null); }}
                                    className="flex items-center gap-2 px-4 py-1.5 bg-red-600/80 rounded-full text-[10px] font-bold text-white hover:bg-red-500 transform hover:scale-105 transition-all shadow-lg w-24 justify-center"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" /></svg>
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                    
                    {isCompressing && <div className="flex justify-center my-2"><Spinner/> <span className="ml-2 text-xs text-blue-300">Processing image...</span></div>}
                    {isUploading && <div className="flex justify-center my-2"><Spinner/> <span className="ml-2 text-xs text-blue-300">Uploading in background...</span></div>}

                    <div className="flex gap-4 mt-2">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="text-xs text-blue-400 hover:text-white transition-colors flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M9.25 13.25a.75.75 0 0 0 1.5 0V4.636l2.955 3.129a.75.75 0 0 0 1.09-1.03l-4.25-4.5a.75.75 0 0 0-1.09 0l-4.25 4.5a.75.75 0 1 0 1.09 1.03L9.25 4.636v8.614Z" /><path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" /></svg>
                            Upload Photo
                        </button>
                        <span className="text-slate-600">|</span>
                        <button type="button" onClick={() => setShowCamera(true)} className="text-xs text-purple-400 hover:text-white transition-colors flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M1 8a2 2 0 0 1 2-2h.93a2 2 0 0 0 1.664-.89l.812-1.22A2 2 0 0 1 8.07 3h3.86a2 2 0 0 1 1.664.89l.812 1.22A2 2 0 0 0 16.07 6H17a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8Zm13.5 3a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM10 14a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" clipRule="evenodd" /></svg>
                            Take Picture
                        </button>
                    </div>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/jpeg, image/png, image/webp"
                        onChange={handleFileChange}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="edit-name" className="block text-sm font-medium text-gray-300">Full Name</label>
                        <input id="edit-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md" />
                    </div>
                    <div>
                        <label htmlFor="edit-role" className="block text-sm font-medium text-gray-300">Role</label>
                        <select id="edit-role" value={role} onChange={e => setRole(e.target.value as UserRole)} className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md capitalize">
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                </div>
                {renderRoleSpecificFields()}
            </div>
            <div className="flex-shrink-0 pt-4">
                {error && <p className="text-red-400 text-sm mb-2">{error}</p>}
                <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={onClose} disabled={loading || isCompressing || isUploading}>Cancel</Button>
                <Button type="submit" disabled={loading || isCompressing || isUploading}>
                    {loading ? 'Saving...' : isUploading ? 'Uploading Image...' : 'Save Changes'}
                </Button>
                </div>
            </div>
            </form>
        </Card>
        </div>
        {showCamera && <CameraModal onCapture={handleCameraCapture} onClose={() => setShowCamera(false)} />}
    </>
  );
};

export default UserEditModal;
