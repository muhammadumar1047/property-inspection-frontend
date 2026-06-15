'use client';

import React, { useState, useEffect } from 'react';
import { InspectionResponse, InspectionStatus } from '@/types/api';
import Modal from './ui/Modal';

interface CloseReportModalProps {
    isOpen: boolean;
    onClose: () => void;
    inspection: InspectionResponse | null;
    onCloseReport: (data: CloseReportData) => Promise<void>;
    loading: boolean;
}

export interface CloseReportData {
    inspectionCompletedDate: string;
    inspectionCloseDate: string;
    signatureDate: string;
    signatureImageUrl: string;
}

const CloseReportModal: React.FC<CloseReportModalProps> = ({
    isOpen,
    onClose,
    inspection,
    onCloseReport,
    loading,
}) => {
    const [inspectionCompletedDate, setInspectionCompletedDate] = useState('');
    const [inspectionCloseDate, setInspectionCloseDate] = useState('');
    const [signatureDate, setSignatureDate] = useState('');
    const [showMobilePrompt, setShowMobilePrompt] = useState(false);

    useEffect(() => {
        if (isOpen && inspection) {
            // Pre-populate dates from existing inspection data if available
            const today = new Date().toISOString().split('T')[0];
            setInspectionCompletedDate(
                inspection.inspectionCompletedDate
                    ? new Date(inspection.inspectionCompletedDate).toISOString().split('T')[0]
                    : today
            );
            setInspectionCloseDate(
                inspection.inspectionCloseDate
                    ? new Date(inspection.inspectionCloseDate).toISOString().split('T')[0]
                    : today
            );
            setSignatureDate(
                inspection.signatureDate
                    ? new Date(inspection.signatureDate).toISOString().split('T')[0]
                    : today
            );
            setShowMobilePrompt(false);
        }
    }, [isOpen, inspection]);

    if (!inspection) return null;

    // Determine the signature image source:
    // 1. Already saved signatureImageUrl on the inspection
    // 2. Inspector's signature image from the inspection's inspector navigation property
    const signatureImageSrc =
        inspection.signatureImageUrl ||
        (inspection as any).inspector?.signatureImage ||
        (inspection as any).inspector?.SignatureImage ||
        (inspection as any).inspector?.profileImage ||
        (inspection as any).inspector?.ProfileImage ||
        '';

    const handleSignatureClick = () => {
        setShowMobilePrompt(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onCloseReport({
            inspectionCompletedDate,
            inspectionCloseDate,
            signatureDate,
            signatureImageUrl: signatureImageSrc || '',
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Close Inspection Report">
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Inspection Info Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                            <span className="text-gray-500">Property:</span>{' '}
                            <span className="font-medium text-gray-800">{inspection.propertyAddress}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Inspector:</span>{' '}
                            <span className="font-medium text-gray-800">{inspection.inspectorName}</span>
                        </div>
                        <div>
                            <span className="text-gray-500">Inspection Date:</span>{' '}
                            <span className="font-medium text-gray-800">
                                {new Date(inspection.inspectionDate).toLocaleDateString()}
                            </span>
                        </div>
                        <div>
                            <span className="text-gray-500">Status:</span>{' '}
                            <span className="font-medium text-green-700">Completed → Closed</span>
                        </div>
                    </div>
                </div>

                {/* Date Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Inspection Completed Date *
                        </label>
                        <input
                            type="date"
                            required
                            value={inspectionCompletedDate}
                            onChange={(e) => setInspectionCompletedDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Inspection Close Date *
                        </label>
                        <input
                            type="date"
                            required
                            value={inspectionCloseDate}
                            onChange={(e) => setInspectionCloseDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                </div>

                {/* Signature Section */}
                <div className="border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-800 mb-3">Signature</h4>

                    <div className="flex flex-col items-center">
                        {/* Signature Image */}
                        <div
                            className="relative border-2 border-dashed border-gray-300 rounded-lg p-2 cursor-pointer hover:border-blue-400 transition-colors"
                            onClick={handleSignatureClick}
                            title="Click to update signature via mobile"
                        >
                            {signatureImageSrc ? (
                                <img
                                    src={signatureImageSrc}
                                    alt="Inspector Signature"
                                    className="max-h-32 max-w-[280px] object-contain"
                                />
                            ) : (
                                <div className="w-[280px] h-32 flex items-center justify-center text-gray-400 text-sm">
                                    <div className="text-center">
                                        <svg
                                            className="mx-auto h-10 w-10 text-gray-300 mb-1"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                                            />
                                        </svg>
                                        No signature available
                                    </div>
                                </div>
                            )}
                            {/* Overlay hint */}
                            <div className="absolute inset-0 flex items-end justify-center pb-1 opacity-0 hover:opacity-100 transition-opacity">
                                <span className="text-xs bg-black/60 text-white px-2 py-0.5 rounded">
                                    Click to update via mobile
                                </span>
                            </div>
                        </div>

                        {/* Mobile Update Prompt */}
                        {showMobilePrompt && (
                            <div className="mt-3 w-full bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                                <div className="flex items-start gap-2">
                                    <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <div>
                                        <p className="font-medium">Update Signature via Mobile App</p>
                                        <p className="mt-1 text-blue-700">
                                            Please open the Property Inspection mobile app on your device, navigate to your profile,
                                            and upload or update your signature image. The updated signature will be reflected here
                                            when you refresh the inspection data.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowMobilePrompt(false)}
                                    className="mt-2 text-blue-600 hover:text-blue-800 underline text-xs"
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Signature Date */}
                    <div className="mt-4">
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                            Date of Signature *
                        </label>
                        <input
                            type="date"
                            required
                            value={signatureDate}
                            onChange={(e) => setSignatureDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                        />
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Closing Report...
                            </>
                        ) : (
                            'Close Report'
                        )}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default CloseReportModal;