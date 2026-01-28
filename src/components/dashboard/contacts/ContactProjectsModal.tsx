'use client';

import * as React from 'react';
import { X, FolderKanban, Calendar, Clock, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Lead } from '@/types/contact';

interface ContactProjectsModalProps {
    contact: Lead | null;
    onClose: () => void;
}

export function ContactProjectsModal({ contact, onClose }: ContactProjectsModalProps) {
    if (!contact) return null;

    const projects = contact.projects || [];

    return (
        <div className="fixed inset-0 z-[260] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0" onClick={onClose} />
            <div className="bg-white rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden relative transform transition-all animate-in slide-in-from-bottom-10 duration-500 border border-gray-100">
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl">
                            <FolderKanban className="w-7 h-7" />
                        </div>
                        <div>
                            <h3 className="font-black text-2xl text-gray-900 tracking-tight leading-none">Prehľad projektov</h3>
                            <p className="text-gray-500 text-sm mt-1.5 font-bold uppercase tracking-widest opacity-60">
                                {contact.first_name} {contact.last_name} • {projects.length} {projects.length === 1 ? 'projekt' : 'projekty'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/80 rounded-full transition-colors group shadow-sm bg-white border border-gray-100">
                        <X className="w-6 h-6 text-gray-400 group-hover:text-gray-900" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 space-y-4 bg-gray-50/50">
                    {projects.length === 0 ? (
                        <div className="text-center py-24">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-dashed border-gray-200">
                                <span className="text-3xl opacity-30">📂</span>
                            </div>
                            <p className="text-gray-400 font-black uppercase tracking-widest text-xs">Žiadne aktívne projekty</p>
                        </div>
                    ) : (
                        projects.map((project, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all group/card border-l-4 border-l-indigo-500">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{project.project_type}</span>
                                        </div>
                                        <h4 className="font-black text-xl text-gray-900 leading-tight">Projekt ID #{project.id}</h4>
                                    </div>
                                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm
                                        ${project.stage === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                            project.stage === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                'bg-amber-50 text-amber-700 border-amber-100'}
                                    `}>
                                        {project.stage || 'plánovanie'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-4 border-y border-gray-50 my-2">
                                    <div>
                                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Začiatok</p>
                                        <p className="text-sm font-bold text-gray-700 flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-gray-300" />
                                            {format(new Date(project.date_created), 'd.M.yyyy')}
                                        </p>
                                    </div>
                                    {project.end_date && (
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Deadline</p>
                                            <p className="text-sm font-bold text-orange-600 flex items-center gap-1.5">
                                                <Clock className="w-3.5 h-3.5 opacity-70" />
                                                {format(new Date(project.end_date), 'd.M.yyyy')}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <Link
                                    href="/dashboard/projects"
                                    onClick={onClose}
                                    className="mt-4 w-full h-12 bg-gray-50 hover:bg-indigo-600 hover:text-white rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all group-hover/card:bg-indigo-50 group-hover/card:text-indigo-600 group-hover/card:hover:bg-indigo-600 group-hover/card:hover:text-white shadow-sm"
                                >
                                    Prejsť na Kanban <ExternalLink className="w-4 h-4" />
                                </Link>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-gray-100 bg-white">
                    <button
                        onClick={onClose}
                        className="w-full h-16 bg-gray-900 text-white rounded-[1.5rem] font-black uppercase tracking-widest shadow-xl shadow-gray-200 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                        Zavrieť prehľad
                    </button>
                </div>
            </div>
        </div>
    );
}
