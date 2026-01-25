'use client';

import * as React from 'react';
import {
    createColumnHelper,
    flexRender,
    getCoreRowModel,
    useReactTable,
    getSortedRowModel,
    SortingState,
    getGroupedRowModel,
    GroupingState,
    getExpandedRowModel,
    getFilteredRowModel,
} from '@tanstack/react-table';
import { format } from 'date-fns';
import {
    ChevronRight,
    ChevronDown,
    MoreHorizontal,
    Plus,
    Search,
    Filter,
    User,
    Phone,
    Mail,
    Building2,
    MessageSquare,
    ExternalLink,
    X,
    QrCode,
    Calendar,
    Clock,
    ArrowRight,
    Check,
    Loader2,
    FolderKanban,
    Smartphone
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';
import { updateContactComments } from '@/app/actions/contacts';
import { ContactDetailModal } from './ContactDetailModal';
import { ContactImportModal } from './ContactImportModal';
import { Lead, Activity, Deal } from '@/types/contact';

const columnHelper = createColumnHelper<Lead>();

// Comprehensive country code detection
const getCountryFlag = (phone: string | undefined): { code: string; name: string } => {
    if (!phone) return { code: 'unknown', name: 'Unknown' };

    const p = phone.replace(/[\s\-\(\)]/g, '');

    if (p.startsWith('09') || p.startsWith('04') || p.startsWith('+421') || p.startsWith('00421')) {
        return { code: 'sk', name: 'Slovakia' };
    }

    if (p.startsWith('+420') || p.startsWith('00420')) return { code: 'cz', name: 'Czechia' };
    if (p.startsWith('+43') || p.startsWith('0043')) return { code: 'at', name: 'Austria' };
    if (p.startsWith('+49') || p.startsWith('0049')) return { code: 'de', name: 'Germany' };
    if (p.startsWith('+1') || p.startsWith('001')) return { code: 'us', name: 'USA' };
    if (p.startsWith('+44') || p.startsWith('0044')) return { code: 'gb', name: 'UK' };
    if (p.startsWith('+48') || p.startsWith('0048')) return { code: 'pl', name: 'Poland' };
    if (p.startsWith('+36') || p.startsWith('0036')) return { code: 'hu', name: 'Hungary' };
    return { code: 'unknown', name: 'Unknown' };
};

// Flag Badge Component with Real SVG Images (Windows compatible)
function FlagBadge({ phone }: { phone: string | undefined }) {
    const flag = getCountryFlag(phone);

    if (flag.code === 'unknown') {
        return (
            <div className="flex items-center gap-1.5" title="Unknown">
                <div className="w-5 h-3.5 rounded-sm bg-gray-100 border border-gray-200 flex items-center justify-center text-[8px] text-gray-400 font-bold">?</div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">??</span>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 group/flag" title={flag.name}>
            <div className="w-5 h-3.5 rounded-sm overflow-hidden shadow-sm border border-gray-200 flex shrink-0">
                <img
                    src={`https://flagcdn.com/w40/${flag.code.toLowerCase()}.png`}
                    width="20"
                    alt={flag.name}
                    className="w-full h-full object-cover"
                />
            </div>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{flag.code}</span>
        </div>
    );
}


const columns = [
    columnHelper.accessor('first_name', {
        id: 'contact',
        header: 'Contact',
        cell: (info) => {
            const fn = info.row.original.first_name || '';
            const ln = info.row.original.last_name || '';
            const initials = (fn[0] || '') + (ln[0] || '');
            return (
                <div
                    className="flex items-center gap-2 cursor-pointer group/name"
                    onClick={() => {
                        const event = new CustomEvent('open-contact-detail', { detail: info.row.original });
                        window.dispatchEvent(event);
                    }}
                >
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700 shadow-sm transition-transform">
                        {initials.toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-bold text-gray-900 group-hover/name:text-blue-600 transition-colors leading-none text-xs">{fn} {ln}</span>
                    </div>
                </div>
            );
        },
    }),
    columnHelper.accessor('email', {
        header: 'Email',
        cell: (info) => (
            <a href={`mailto:${info.getValue()}`} className="text-blue-600 hover:underline text-xs leading-none">
                {info.getValue()}
            </a>
        ),
    }),
    columnHelper.accessor('activities', {
        header: 'Activities timeline (7d)',
        cell: (info) => {
            const row = info.row.original;
            const activities = info.getValue() || [];
            const days = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                return date.toISOString().split('T')[0];
            });

            return (
                <div
                    className="flex gap-0.5 items-end h-5 cursor-pointer group/timeline px-1 rounded hover:bg-gray-50 transition-colors"
                    onClick={() => {
                        const event = new CustomEvent('open-activity-detail', { detail: row });
                        window.dispatchEvent(event);
                    }}
                >
                    {days.map((day) => {
                        const hasActivity = activities.some(a => a.date.startsWith(day));
                        const activityType = activities.find(a => a.date.startsWith(day))?.type;

                        let colorClass = 'bg-gray-100';
                        if (hasActivity) {
                            colorClass = activityType === 'call' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.4)]' : 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.4)]';
                        }

                        return (
                            <div
                                key={day}
                                className={`w-2 ${hasActivity ? 'h-4' : 'h-1.5'} ${colorClass} rounded-full transition-all group-hover/timeline:scale-110`}
                            ></div>
                        );
                    })}
                    <div className="ml-1 opacity-0 group-hover/timeline:opacity-100 transition-opacity">
                        <ArrowRight className="w-3 h-3 text-gray-400" />
                    </div>
                </div>
            );
        },
    }),
    columnHelper.accessor('company', {
        header: 'Account Workspace',
        cell: (info) => {
            const company = info.getValue();
            return company ? (
                <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-md bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100 group transition-all hover:bg-indigo-100 cursor-pointer">
                        <Building2 className="w-3 h-3 mr-1 text-indigo-400 group-hover:text-indigo-600" />
                        {company}
                        <ExternalLink className="w-2.5 h-2.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                </div>
            ) : <span className="text-gray-400 text-xs">-</span>;
        },
    }),
    columnHelper.accessor('projects', {
        header: 'Projects',
        cell: (info) => {
            const projects = info.getValue() || [];

            if (projects.length === 0) return <span className="text-gray-300 text-[10px] font-bold uppercase italic tracking-widest pl-2">No projects</span>;

            return (
                <button
                    onClick={() => {
                        const event = new CustomEvent('open-project-detail', { detail: info.row.original });
                        window.dispatchEvent(event);
                    }}
                    className="flex items-center gap-2 group hover:bg-gray-50 px-2 py-1 rounded-md transition-all border border-transparent hover:border-gray-200 w-fit"
                >
                    <div className="flex -space-x-2">
                        {projects.slice(0, 3).map((_, i) => (
                            <div key={i} className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border-2 border-white flex items-center justify-center shadow-sm">
                                <FolderKanban className="w-3 h-3 text-white" />
                            </div>
                        ))}
                        {projects.length > 3 && (
                            <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-500">
                                +{projects.length - 3}
                            </div>
                        )}
                    </div>
                    <span className="text-[11px] font-black text-indigo-600 uppercase tracking-tighter group-hover:text-indigo-800">
                        {projects.length} {projects.length === 1 ? 'projekt' : 'projekty'}
                    </span>
                    <ArrowRight className="w-3 h-3 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                </button>
            )
        }
    }),
    columnHelper.accessor('phone', {
        header: 'Phone (Scan to Call)',
        cell: (info) => {
            const phone = info.getValue();
            return phone ? (
                <button
                    onClick={() => {
                        const event = new CustomEvent('open-qr', { detail: phone });
                        window.dispatchEvent(event);
                    }}
                    className="flex items-center gap-2 group hover:bg-gray-50 px-2 py-1 rounded-md transition-all border border-transparent hover:border-gray-200"
                >
                    <FlagBadge phone={phone} />
                    <span className="text-sm font-medium text-gray-700 group-hover:text-blue-600">{phone}</span>
                    <QrCode className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                </button>
            ) : <span className="text-gray-400 text-xs">-</span>
        }
    }),
    columnHelper.accessor('status', {
        id: 'status',
        header: 'Status',
        enableHiding: true,
    }),
    columnHelper.accessor('comments', {
        header: 'Comments',
        cell: (info) => (
            <EditableComment
                id={info.row.original.id}
                initialValue={info.getValue() || ''}
            />
        )
    }),
];

// Editable Comment Component
function EditableComment({ id, initialValue }: { id: number; initialValue: string }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [value, setValue] = React.useState(initialValue);
    const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');

    const handleSave = async () => {
        if (value === initialValue) {
            setIsEditing(false);
            return;
        }

        setStatus('saving');
        try {
            const result = await updateContactComments(id, value);
            if (result.success) {
                setStatus('saved');
                setTimeout(() => setStatus('idle'), 2000);
            } else {
                setStatus('idle');
            }
        } catch (error) {
            console.error('Failed to save comment:', error);
            setStatus('idle');
        }
        setIsEditing(false);
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2 max-w-[200px]">
                <input
                    autoFocus
                    className="text-xs border border-blue-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500 w-full"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleSave}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') {
                            setValue(initialValue);
                            setIsEditing(false);
                        }
                    }}
                />
            </div>
        );
    }

    return (
        <div
            className="group/comment flex items-center gap-2 cursor-pointer min-h-[24px]"
            onClick={() => setIsEditing(true)}
        >
            <span className={`text-xs truncate max-w-[150px] ${value ? 'text-gray-600 font-medium' : 'text-gray-300 italic'}`}>
                {value || 'Add comment...'}
            </span>
            {status === 'saving' && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
            {status === 'saved' && <Check className="w-3 h-3 text-green-500" />}
            {!status || status === 'idle' && (
                <Plus className="w-3 h-3 text-gray-300 opacity-0 group-hover/comment:opacity-100" />
            )}
        </div>
    );
}

// Activity History Drawer/Modal
function ActivityDetailModal({ contact, onClose }: { contact: Lead | null, onClose: () => void }) {
    if (!contact) return null;

    const activities = [...(contact.activities || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="fixed inset-0 z-[70] flex justify-end bg-black/40 backdrop-blur-[2px] p-0 sm:p-4">
            <div
                className="absolute inset-0"
                onClick={onClose}
            ></div>

            <div className="bg-white w-full max-w-lg h-full sm:h-[calc(100vh-32px)] sm:rounded-2xl shadow-2xl relative flex flex-col overflow-hidden transform transition-all animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                            {(contact.first_name[0] + contact.last_name[0]).toUpperCase()}
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
                                        {/* Icon Node */}
                                        <div className={`absolute left-0 top-0 w-10 h-10 rounded-xl border-4 border-white shadow-md flex items-center justify-center z-10 transition-transform group-hover:scale-110
                                            ${isCall ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'}
                                        `}>
                                            {isCall ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                                        </div>

                                        {/* Card */}
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

                {/* Footer Footer */}
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

// QR Code Modal
function PhoneQrModal({ phone, onClose }: { phone: string | null, onClose: () => void }) {
    if (!phone) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-500" /> Call Contact
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>
                <div className="p-8 flex flex-col items-center gap-6">
                    <div className="p-4 bg-white rounded-xl shadow-inner border border-gray-100">
                        <QRCodeSVG value={`tel:${phone}`} size={180} />
                    </div>
                    <div className="text-center">
                        <p className="text-sm text-gray-500 mb-1">Scan this code with your phone</p>
                        <p className="text-lg font-bold text-gray-900 tracking-tight">{phone}</p>
                    </div>
                    <a
                        href={`tel:${phone}`}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                        <Phone className="w-4 h-4" /> Call Now
                    </a>
                </div>
            </div>
        </div>
    );
}

// Contact Projects Modal
function ContactProjectsModal({ contact, onClose }: { contact: Lead | null; onClose: () => void }) {
    if (!contact) return null;

    const projects = contact.projects || [];

    return (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-md p-0 sm:p-4">
            <div className="bg-white rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden transform transition-all animate-in slide-in-from-bottom duration-300 border border-gray-100">
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

// Simple Modal Component with JSON Support
function CreateContactModal({ isOpen, onClose, onSubmit, initialMode = 'form' }: { isOpen: boolean; onClose: () => void; onSubmit: (data: any) => Promise<void>; initialMode?: 'form' | 'json' }) {
    const [loading, setLoading] = React.useState(false);
    const [mode, setMode] = React.useState<'form' | 'json'>(initialMode);
    const [jsonInput, setJsonInput] = React.useState('');
    const [formData, setFormData] = React.useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        company: '',
        status: 'published'
    });

    React.useEffect(() => {
        if (isOpen) setMode(initialMode);
    }, [isOpen, initialMode]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let parsed: any[] = [];
            try {
                // Try JSON first
                const possibleJson = JSON.parse(jsonInput);
                parsed = Array.isArray(possibleJson) ? possibleJson : [possibleJson];
            } catch (e) {
                // Fallback to "NV" / Line-by-line parser
                // Formats: "Name: John Doe, Email: john@doe.com" OR multiple lines
                const lines = jsonInput.split('\n').filter(l => l.trim());
                if (lines.length > 0) {
                    const entry: any = {};
                    lines.forEach(line => {
                        const [key, ...valParts] = line.split(':');
                        if (valParts.length > 0) {
                            const k = key.trim().toLowerCase();
                            const v = valParts.join(':').trim();
                            if (k.includes('name')) entry.name = v;
                            if (k.includes('email')) entry.email = v;
                            if (k.includes('phone') || k.includes('tel')) entry.phone = v;
                            if (k.includes('company') || k.includes('org')) entry.company = v;
                        }
                    });
                    if (Object.keys(entry).length > 0) parsed = [entry];
                }
            }

            if (parsed.length === 0) {
                alert('Nepodarilo sa rozpoznať formát (JSON ani Text)');
                setLoading(false);
                return;
            }

            const { bulkCreateContacts } = await import('@/app/actions/contacts');
            const res = await bulkCreateContacts(parsed);

            if (res.success) {
                onClose();
                window.location.reload();
            } else {
                alert('Import zlyhal: ' + res.error);
            }

        } else {
            await onSubmit(formData);
            onClose();
            window.location.reload();
        }
    } catch (error: any) {
        console.error(error);
        alert('Chyba: ' + error.message);
    } finally {
        setLoading(false);
    }
};

return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent backdrop-blur-sm pointer-events-none">
        {/* Background overlay that handles click-to-close */}
        <div className="absolute inset-0 bg-black/40 pointer-events-auto" onClick={onClose}></div>

        <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 relative pointer-events-auto transform transition-all animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Nový kontakt</h2>
                <div className="flex bg-gray-100 rounded-lg p-1 text-xs font-bold">
                    <button
                        onClick={() => setMode('form')}
                        className={`px-3 py-1.5 rounded-md transition-all ${mode === 'form' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        Formulár
                    </button>
                    <button
                        onClick={() => setMode('json')}
                        className={`px-3 py-1.5 rounded-md transition-all ${mode === 'json' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}
                    >
                        RAW Extrakcia
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {mode === 'form' ? (
                    <>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Meno</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Priezvisko</label>
                                <input
                                    type="text"
                                    required
                                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                required
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Telefón</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                placeholder="+421 900 000 000"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Firma / Account</label>
                            <input
                                type="text"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Status</label>
                            <select
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                            >
                                <option value="draft">Neaktívny (Draft)</option>
                                <option value="published">Aktívny (Published)</option>
                            </select>
                        </div>
                    </>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vložte RAW dáta (JSON alebo Text)</label>
                        <div className="bg-slate-900 rounded-md p-3 mb-2">
                            <code className="text-xs text-green-400 block mb-1">Príklady formátov:</code>
                            <pre className="text-[10px] text-gray-400 font-mono overflow-x-auto">
                                {`// JSON formát
[{"name": "Ján", "email": "jan@mail.sk"}]

// NV formát (Text)
Name: Peter Pan
Email: peter@neverland.sk
Tel: +421 900 111 222`}
                            </pre>
                        </div>
                        <textarea
                            className="w-full h-64 font-mono text-xs p-3 border border-gray-300 rounded-md focus:border-blue-500 focus:outline-none"
                            placeholder='Vložte JSON alebo textové riadky...'
                            value={jsonInput}
                            onChange={(e) => setJsonInput(e.target.value)}
                        ></textarea>
                    </div>
                )}

                <div className="flex justify-end gap-2 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md"
                    >
                        Zrušiť
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                    >
                        {loading ? 'Spracúvam...' : (mode === 'json' ? 'Importovať RAW' : 'Vytvoriť kontakt')}
                    </button>
                </div>
            </form>
        </div>
    </div>
);
}

export function ContactsTable({ data, onCreate }: { data: Lead[], onCreate?: (data: any) => Promise<any> }) {
    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [grouping, setGrouping] = React.useState<GroupingState>(['status']);
    const [globalFilter, setGlobalFilter] = React.useState('');
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [modalMode, setModalMode] = React.useState<'form' | 'json'>('form');
    const [isImportModalOpen, setIsImportModalOpen] = React.useState(false);
    const [qrPhone, setQrPhone] = React.useState<string | null>(null);
    const [detailContact, setDetailContact] = React.useState<Lead | null>(null);
    const [fullDetailContact, setFullDetailContact] = React.useState<Lead | null>(null);
    const [projectsContact, setProjectsContact] = React.useState<Lead | null>(null);
    const [isMounted, setIsMounted] = React.useState(false);

    React.useEffect(() => {
        setIsMounted(true);

        const handleOpenQr = (e: any) => setQrPhone(e.detail);
        const handleOpenDetail = (e: any) => setDetailContact(e.detail);
        const handleOpenFullDetail = (e: any) => setFullDetailContact(e.detail);
        const handleOpenProjects = (e: any) => setProjectsContact(e.detail);
        const handleOpenCreate = (e: any) => {
            setModalMode(e.detail || 'form');
            setIsModalOpen(true);
        };
        const handleOpenImport = () => setIsImportModalOpen(true);

        window.addEventListener('open-qr', handleOpenQr);
        window.addEventListener('open-activity-detail', handleOpenDetail);
        window.addEventListener('open-contact-detail', handleOpenFullDetail);
        window.addEventListener('open-project-detail', handleOpenProjects);
        window.addEventListener('open-create-contact', handleOpenCreate);
        window.addEventListener('open-import-contact', handleOpenImport);

        return () => {
            window.removeEventListener('open-qr', handleOpenQr);
            window.removeEventListener('open-activity-detail', handleOpenDetail);
            window.removeEventListener('open-contact-detail', handleOpenFullDetail);
            window.removeEventListener('open-project-detail', handleOpenProjects);
            window.removeEventListener('open-create-contact', handleOpenCreate);
            window.removeEventListener('open-import-contact', handleOpenImport);
        };
    }, []);

    const table = useReactTable({
        data,
        columns,
        state: {
            sorting,
            grouping,
            globalFilter,
        },
        onSortingChange: setSorting,
        onGroupingChange: setGrouping,
        onGlobalFilterChange: setGlobalFilter,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getGroupedRowModel: getGroupedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        initialState: {
            expanded: true,
            columnVisibility: {
                status: false // Hide status column by default as it is grouped
            }
        },
    });

    if (!isMounted) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-gray-400 font-medium">Initializing workspace...</span>
            </div>
        );
    }

    return (
        <>
            <CreateContactModal
                isOpen={isModalOpen}
                initialMode={modalMode}
                onClose={() => setIsModalOpen(false)}
                onSubmit={async (data) => {
                    if (onCreate) await onCreate(data);
                }}
            />

            <ContactImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    // Refresh data or something (revalidatePath does it on server, maybe we need router.refresh() if client cache persists)
                    // The server action calls revalidatePath, so next render (which might happen on router refresh) gets new data.
                    // For now simple close is enough, Next.js should handle RSC update.
                    window.location.reload(); // Simple brute force to ensure table updates immediately
                }}
            />

            <PhoneQrModal phone={qrPhone} onClose={() => setQrPhone(null)} />

            <ActivityDetailModal contact={detailContact} onClose={() => setDetailContact(null)} />

            <ContactDetailModal
                contact={fullDetailContact}
                isOpen={!!fullDetailContact}
                onClose={() => setFullDetailContact(null)}
            />

            <ContactProjectsModal contact={projectsContact} onClose={() => setProjectsContact(null)} />

            <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 shadow-sm transition-all active:scale-95"
                        >
                            New <ChevronDown className="w-3 h-3 opacity-70" />
                        </button>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 transition-all active:scale-95 shadow-sm"
                        >
                            Import vCard
                        </button>
                        <div className="h-3 w-px bg-gray-300 mx-1"></div>
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search all columns..."
                                value={globalFilter ?? ''}
                                onChange={(e) => setGlobalFilter(e.target.value)}
                                className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs w-56 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all font-medium placeholder:text-gray-400"
                            />
                        </div>
                        <div className="h-4 w-px bg-gray-200 mx-2"></div>
                        <Link href="/dashboard/settings/sync">
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 transition-all">
                                <Smartphone className="w-3.5 h-3.5" />
                                Sync to Mobile
                            </button>
                        </Link>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <div className="text-xs font-bold text-gray-400 uppercase mr-2 tracking-widest hidden sm:block">Total: {data.length}</div>
                        <button className="p-2 hover:bg-gray-100 rounded-md text-gray-400 transition-colors">
                            <MoreHorizontal className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Grouped Table */}
                <div className="overflow-auto flex-1">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead className="bg-gray-50/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
                            {table.getHeaderGroups().map(headerGroup => (
                                <tr key={headerGroup.id}>
                                    {/* Placeholder for group expander column */}
                                    <th className="w-10 p-2"></th>
                                    <th className="w-8 p-2"></th>
                                    {headerGroup.headers.map(header => (
                                        <th key={header.id} className="px-3 py-1.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider border-r border-gray-100 last:border-0 hover:bg-gray-200 cursor-pointer transition-colors relative group">
                                            <div className="flex items-center justify-between leading-none">
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                <ChevronDown className="w-2.5 h-2.5 text-gray-300 opacity-0 group-hover:opacity-100" />
                                            </div>
                                        </th>
                                    ))}
                                    <th className="w-10 p-2 border-l border-gray-100 text-center"><Plus className="w-4 h-4 text-gray-400 mx-auto" /></th>
                                </tr>
                            ))}
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {table.getRowModel().rows.map(row => {
                                // Group Header Row
                                if (row.getIsGrouped()) {
                                    return (
                                        <tr key={row.id} className="bg-white/50 hover:bg-gray-50">
                                            <td colSpan={columns.length + 3} className="p-4">
                                                <div
                                                    className="flex items-center gap-2 cursor-pointer select-none group"
                                                    onClick={row.getToggleExpandedHandler()}
                                                >
                                                    <div className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-200 transition-colors">
                                                        {row.getIsExpanded() ? (
                                                            <ChevronDown className="w-4 h-4 text-gray-600 transition-transform" />
                                                        ) : (
                                                            <ChevronRight className="w-4 h-4 text-gray-600 transition-transform" />
                                                        )}
                                                    </div>

                                                    <div className={`
                                            flex items-center gap-2 px-3 py-1 rounded-md text-sm font-black tracking-tight
                                            ${String(row.original?.status).toLowerCase() === 'published' ? 'text-green-700 bg-green-50' : 'text-gray-700 bg-gray-50'}
                                        `}>
                                                        {String(row.original?.status).toLowerCase() === 'published' ? 'Active Participants' : 'Inactive Pipeline'}
                                                        <span className="font-bold text-gray-400/60 ml-1 text-xs px-1.5 py-0.5 bg-white rounded border border-gray-100">
                                                            {row.subRows.length}
                                                        </span>
                                                    </div>
                                                    <div className="h-px bg-gray-100 flex-1 ml-4 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                }

                                // Data Row
                                return (
                                    <tr key={row.id} className="group bg-white hover:bg-blue-50/30 transition-colors relative">
                                        {/* Color strip indicator */}
                                        <td className="p-0 relative w-2">
                                            <div className={`absolute inset-y-0.5 left-0 w-1.5 rounded-r-md 
                                    ${String(row.original.status).toLowerCase() === 'published' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-gray-300'}
                                `}></div>
                                        </td>
                                        {/* Drag handle */}
                                        <td className="p-2 text-center w-8">
                                            <div className="opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 transition-opacity">
                                                ⠿
                                            </div>
                                        </td>
                                        {row.getVisibleCells().map(cell => (
                                            <td key={cell.id} className="px-3 py-1 border-r border-gray-50 last:border-0 text-xs text-gray-700 relative group/cell hover:bg-white/80 transition-colors">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </td>
                                        ))}
                                        {/* Add Column Button Placeholder */}
                                        <td className="p-2 border-l border-gray-50 text-center">
                                            <div className="w-6 h-6 rounded-full hover:bg-gray-200 flex items-center justify-center cursor-pointer transition-colors mx-auto group-hover:scale-110">
                                                <Plus className="w-3 h-3 text-gray-300 hover:text-blue-500" />
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>

                    {/* Bottom Add Bar */}
                    <div className="p-3 border-t border-gray-100 bg-gray-50/50 sticky bottom-0">
                        <div
                            className="flex items-center gap-2 text-gray-400 text-sm hover:text-blue-600 cursor-pointer transition-colors font-medium group"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
                            <span>Double click to add a new contact...</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoomIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        .animate-in {
          animation-duration: 300ms;
          animation-fill-mode: both;
        }
        .fade-in {
          animation-name: fadeIn;
        }
        .zoom-in {
          animation-name: zoomIn;
        }
        .slide-in-from-right {
          animation-name: slideInRight;
        }
      `}</style>
        </>
    );
}
