import React from 'react';
import Button from './Button';
import Card from './Card';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  isLoading?: boolean;
  confirmButtonText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, isLoading, confirmButtonText = 'Confirm' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center p-4 z-50" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <Card className="w-full max-w-md">
        <div className="sm:flex sm:items-start">
            <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-900/50 sm:mx-0 sm:h-10 sm:w-10">
                <svg className="h-6 w-6 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                 <h3 id="modal-title" className="text-lg font-semibold leading-6 text-gray-100">{title}</h3>
                 <div className="mt-2">
                    <div className="text-sm text-gray-400">{message}</div>
                 </div>
            </div>
        </div>
        <div className="mt-5 sm:mt-4 flex flex-row-reverse gap-3">
            <Button
                variant="danger"
                onClick={onConfirm}
                disabled={isLoading}
                className="w-full sm:w-auto"
            >
                {isLoading ? 'Processing...' : confirmButtonText}
            </Button>
            <Button
                variant="secondary"
                onClick={onClose}
                disabled={isLoading}
                className="w-full sm:w-auto"
            >
                Cancel
            </Button>
        </div>
      </Card>
    </div>
  );
};

export default ConfirmationModal;