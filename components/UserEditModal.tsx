
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

/**
 * Standardizes any image file to a lightweight JPEG suitable for profile pictures.
 * - Resizes to max 400x400
 * - Fills transparent backgrounds with white
 * - Compresses quality to 0.8
 */
const standardizeAndCompressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
        // 10-second timeout for local processing safety
        const timer = setTimeout(() => reject(new Error("Image processing timed out locally")), 10000);

        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            
            img.onload = () => {
                // Determine new dimensions (Max 400px)
                const MAX_DIMENSION = 400;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_DIMENSION) {
                        height *= MAX_DIMENSION / width;
                        width = MAX_DIMENSION;
                    }
                } else {
                    if (height > MAX_DIMENSION) {
                        width *= MAX_DIMENSION / height;
                        height = MAX_DIMENSION;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    clearTimeout(timer);
                    reject(new Error("System error: Canvas context unavailable"));
                    return;
                }

                // Fill background with white (handles PNG transparency turning black)
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);

                // Draw image
                ctx.drawImage(img, 0, 0, width, height);
                
                // Export as compact JPEG
                canvas.toBlob((blob) => {
                    clearTimeout(timer);
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject(new Error("Image conversion failed"));
                    }
                }, 'image/jpeg', 0.80);
            };

            img.onerror = () => {
                clearTimeout(timer);
                reject(new Error("Failed to load image data"));
            };
        };

        reader.onerror = () => {
            clearTimeout(timer);
            reject(new Error("Failed to read image file"));
        };
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
  
  // Upload Status
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track active process to prevent race conditions
  const activeProcessId = useRef<number>(0);

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
      setUploadedPhotoUrl(null); 
      setIsProcessing(false);
      setUploadProgress(0);
      setStatusMessage('');
      setError('');
    }
  }, [user]);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
      return () => {
          if (photoPreview && photoPreview.startsWith('blob:')) {
              URL.revokeObjectURL(photoPreview);
          }
      };
  }, [photoPreview]);

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

  // --- IMAGE PIPELINE ---
  
  const processAndUploadImage = async (file: File) => {
      if (!user) return;
      
      const processId = Date.now();
      activeProcessId.current = processId;
      
      // 1. Reset State
      setError('');
      setIsProcessing(true);
      setUploadProgress(0);
      setStatusMessage('Optimizing...');
      
      try {
          // 2. Client-Side Compression & Conversion
          const processedBlob = await standardizeAndCompressImage(file);
          
          if (activeProcessId.current !== processId) return; // Cancelled
          
          // Show Local Preview immediately using the processed blob
          const previewUrl = URL.createObjectURL(processedBlob);
          setPhotoPreview(previewUrl);

          // 3. Upload to Firebase
          setStatusMessage('Uploading...');
          
          const filename = `profile_${user.uid}_${processId}.jpg`;
          const storagePath = `users/${user.uid}/${filename}`;
          const storageRef = storage.ref(storagePath);
          
          const uploadTask = storageRef.put(processedBlob, {
              contentType: 'image/jpeg',
              cacheControl: 'public,max-age=7200'
          });

          uploadTask.on('state_changed', 
              (snapshot) => {
                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                  if (activeProcessId.current === processId) {
                      setUploadProgress(progress);
                  }
              },
              (err) => {
                  if (activeProcessId.current === processId) {
                      console.error("Upload error:", err);
                      setError("Network error during upload. Please try again.");
                      setIsProcessing(false);
                      setPhotoPreview(user.photoURL || null); // Revert
                  }
              },
              async () => {
                  if (activeProcessId.current === processId) {
                      const downloadURL = await uploadTask.snapshot.ref.getDownloadURL();
                      setUploadedPhotoUrl(downloadURL);
                      setIsProcessing(false);
                      setStatusMessage('Ready to Save');
                      setUploadProgress(100);
                  }
              }
          );
          
      } catch (err: any) {
          if (activeProcessId.current === processId) {
              console.error("Processing error:", err);
              setError("Failed to process image. Try a different file.");
              setIsProcessing(false);
              setPhotoPreview(user.photoURL || null); // Revert
          }
      }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          e.target.value = ''; // Reset input to allow re-selection
          
          // Basic validation before processing
          if (file.size > 10 * 1024 * 1024) {
               setError('File is too large. Please pick an image under 10MB.');
               return;
          }
          
          processAndUploadImage(file);
      }
  };

  const handleCameraCapture = (dataUrl: string) => {
      try {
        const file = dataURLtoFile(dataUrl, `cam_capture.jpg`);
        setShowCamera(false);
        processAndUploadImage(file);
      } catch(err) {
          setError("Failed to process camera image.");
      }
  };

  const handleRemovePhoto = () => {
      setPhotoPreview(null);
      setUploadedPhotoUrl(null);
      activeProcessId.current = 0; // Cancel any active uploads
      setIsProcessing(false);
      setStatusMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessing) return; // Prevent saving while uploading

    setLoading(true);
    setError('');
    
    try {
      const updateData: Partial<UserProfile> = { name, role };
      
      // Determine final photo URL
      if (uploadedPhotoUrl) {
          updateData.photoURL = uploadedPhotoUrl;
      } else if (!photoPreview && user.photoURL) {
          // Explicit removal
          updateData.photoURL = firebase.firestore.FieldValue.delete() as any;
      }
      
      // Role-specific fields
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4 z-[60]">
        <Card className="w-full max-w-lg h-[90vh] flex flex-col !bg-slate-900 !border-slate-700 shadow-2xl">
            <form onSubmit={handleSubmit} className="flex flex-col h-full">
            
            <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
                <h3 className="text-xl font-bold text-white">Edit User Profile</h3>
                <button type="button" onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
                </button>
            </div>

            <div className="flex-grow overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                
                {/* Profile Photo Section */}
                <div className="flex flex-col items-center">
                    <div className="relative group">
                        <div className={`w-32 h-32 rounded-full overflow-hidden border-4 ${isProcessing ? 'border-blue-500' : 'border-slate-700'} bg-slate-800 shadow-lg transition-all duration-300`}>
                            {photoPreview ? (
                                <img 
                                    src={photoPreview} 
                                    alt="Profile" 
                                    className={`w-full h-full object-cover transition-opacity duration-300 ${isProcessing ? 'opacity-50' : 'opacity-100'}`} 
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-slate-600 bg-slate-800">
                                    {name ? name.charAt(0).toUpperCase() : '?'}
                                </div>
                            )}
                            
                            {/* Processing Overlay */}
                            {isProcessing && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20">
                                    <Spinner />
                                </div>
                            )}
                        </div>

                        {/* Edit Badge */}
                        {!isProcessing && (
                            <div className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full border-4 border-slate-900 shadow-sm cursor-pointer hover:bg-blue-500 transition-colors" onClick={() => fileInputRef.current?.click()}>
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" /></svg>
                            </div>
                        )}
                    </div>

                    {/* Status Text */}
                    <div className="h-6 mt-2">
                        {statusMessage && <p className="text-xs text-blue-400 font-medium animate-pulse">{statusMessage} {uploadProgress > 0 && Math.round(uploadProgress) + '%'}</p>}
                    </div>

                    {/* Actions Row */}
                    <div className="flex gap-3 mt-1">
                        <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-700 transition-all flex items-center gap-1 disabled:opacity-50">
                            Upload Photo
                        </button>
                        <button type="button" onClick={() => setShowCamera(true)} disabled={isProcessing} className="text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-full border border-slate-700 transition-all flex items-center gap-1 disabled:opacity-50">
                            Take Picture
                        </button>
                        {photoPreview && (
                            <button type="button" onClick={handleRemovePhoto} disabled={isProcessing} className="text-xs font-medium text-red-400 hover:text-red-300 bg-red-900/20 hover:bg-red-900/40 px-3 py-1.5 rounded-full border border-red-900/30 transition-all disabled:opacity-50">
                                Remove
                            </button>
                        )}
                    </div>

                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        className="hidden" 
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleFileChange}
                    />
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-name" className="block text-xs font-bold text-slate-400 uppercase mb-1">Full Name</label>
                            <input id="edit-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                        </div>
                        <div>
                            <label htmlFor="edit-role" className="block text-xs font-bold text-slate-400 uppercase mb-1">Role</label>
                            <select id="edit-role" value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all capitalize">
                                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                        </div>
                    </div>
                    {renderRoleSpecificFields()}
                </div>
            </div>

            <div className="flex-shrink-0 pt-6 mt-4 border-t border-slate-800">
                {error && (
                    <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300 text-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
                        {error}
                    </div>
                )}
                <div className="flex justify-end gap-3">
                    <Button type="button" variant="secondary" onClick={onClose} disabled={loading || isProcessing}>Cancel</Button>
                    <Button type="submit" disabled={loading || isProcessing}>
                        {loading ? 'Saving Changes...' : isProcessing ? 'Uploading Image...' : 'Save Profile'}
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
