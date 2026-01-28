'use client';

import * as React from 'react';
import { X, Plus, Phone, Mail, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { Lead } from '@/types/contact';

interface ActivityDetailModalProps {
    contact: Lead | null;
    onClose: () => void;
}

export function ActivityDetailModal({ contact, onClose }: ActivityDetailModalProps) {
    if (!contact) return null;

    const activities = [...(contact.activities || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="fixed inset-0 z-[240] flex justify-end bg-black/40 backdrop-blur-[2px] p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="bg-white w-full max-w-lg h-full sm:h-[calc(100vh-32px)] sm:rounded-2xl shadow-2xl relative flex flex-col overflow-hidden transform transition-all animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {((contact.first_name?.[0] || '') + (contact.last_name?.[0] || '')).toUpperCase()}
                        </div>
                        <div>
                            <h3 className="font-black text-xl text-gray-900 tracking-tight leading-none">{contact.first_name} {contact.last_name}</h3>
                            <p className="text-gray-400 text-sm mt-1 flex items-center gap-1 font-medium">
                                <Mail className="w-3 h-3" /> {contact.email}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors group">
                        <X className="w-6 h-6 text-gray-400 group-hover:text-gray-600" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-50/30">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Interaction History</h4>
                        <button className="text-blue-600 text-xs font-bold hover:underline flex items-center gap-1">
                            <Plus className="w-3 h-3" /> Add Log
                        </button>
                    </div>

                    {activities.length === 0 ? (
                        <div className="text-center py-20">
                            <Calendar className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium italic">No activity logs found for this contact.</p>
                        </div>
                    ) : (
                        <div className="relative space-y-6">
                            {/* Vertical Line */}
                            <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-gray-100"></div>

                            {activities.map((activity, idx) => {
                                const date = new Date(activity.date);
                                const isCall = activity.type === 'call';

                                return (
                                    <div key={idx} className="relative pl-12 group">
                                        <div className={`absolute left-0 top-0 w-10 h-10 rounded-xl border-4 border-white shadow-md flex items-center justify-center z-10 transition-transform group-hover:scale-110
                                            ${isCall ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'}
                                        `}>
                                            {isCall ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                                        </div>

                                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm transition-all hover:shadow-md hover:border-blue-100 group-hover:-translate-y-0.5">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className={`font-black text-sm uppercase tracking-tight
                                                    ${isCall ? 'text-blue-700' : 'text-pink-700'}
                                                `}>
                                                    {isCall ? 'Call Summary' : 'Email Content'}
                                                </span>
                                                <Link
                                                    href={`/dashboard/calendar?date=${date.toISOString().split('T')[0]}`}
                                                    className="text-[10px] font-bold text-gray-400 flex items-center gap-1 uppercase tracking-wider bg-gray-50 px-2 py-0.5 rounded hover:text-blue-600 hover:bg-blue-50 transition-all border border-transparent hover:border-blue-100"
                                                >
                                                    <Clock className="w-3 h-3" /> {date.toLocaleDateString()}
                                                </Link>
                                            </div>

                                            <p className="text-sm text-gray-600 font-medium leading-relaxed">
                                                {activity.subject || (isCall ? 'Dispatched outgoing call from CRM' : 'Sent automated notification')}
                                            </p>

                                            {activity.content && (
                                                <div className={`text-sm leading-relaxed p-3 rounded-lg border-l-4
                                                    ${isCall ? 'bg-blue-50/30 border-blue-200 text-gray-700' : 'bg-gray-50 border-gray-200 text-gray-600'}
                                                `}>
                                                    {isCall && <div className="text-[10px] font-black text-blue-500 uppercase mb-1 opacity-70">AI Interaction Summary:</div>}
                                                    {activity.content}
                                                </div>
                                            )}

                                            <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-4">
                                                <button className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-800">Reply</button>
                                                <button className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600">Archive</button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-white">
                    <div className="flex gap-2">
                        <button className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg active:scale-95">
                            <Mail className="w-4 h-4" /> Send Email
                        </button>
                        <button className="flex-1 border-2 border-gray-100 text-gray-700 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95">
                            <Phone className="w-4 h-4" /> Start Call
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
