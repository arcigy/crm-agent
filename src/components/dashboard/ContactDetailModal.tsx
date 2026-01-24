'use client';

import * as React from 'react';
import {
    X, Mail, Phone, Building2, Calendar, Clock,
    Briefcase, FolderKanban, MessageSquare,
    ExternalLink, MapPin, Globe, Shield, User,
    Edit2, Trash2, Plus, Paperclip, CheckCircle2,
    StickyNote, Wallet, Sparkles, Send, QrCode, ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { Project } from '@/types/project';
import { Lead, Activity, Deal } from '@/types/contact';
import { QRCodeSVG } from 'qrcode.react';

interface ContactDetailModalProps {
    contact: Lead | null;
    isOpen: boolean;
    onClose: () => void;
}

export function ContactDetailModal({ contact, isOpen, onClose }: ContactDetailModalProps) {
    // Basic States
    const [emailMode, setEmailMode] = React.useState(false);
    const [smsMode, setSmsMode] = React.useState(false);
    const [showQr, setShowQr] = React.useState(false);
    const [draftBody, setDraftBody] = React.useState('');
    const [subject, setSubject] = React.useState('');

    // Reset when modal opens/closes
    React.useEffect(() => {
        if (isOpen) {
            setEmailMode(false);
            setSmsMode(false);
            setShowQr(false);
            setDraftBody('');
            setSubject('');
        }
    }, [isOpen]);

    if (!isOpen || !contact) return null;

    const initials = (contact.first_name?.[0] || '') + (contact.last_name?.[0] || '');
    const totalDealValue = contact.deals?.reduce((sum, d) => sum + (d.value || 0), 0) || 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-6">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />

            <div className="bg-white w-full max-w-[95vw] sm:max-w-6xl h-[95vh] sm:rounded-3xl shadow-2xl relative flex overflow-hidden animate-in zoom-in-95 duration-300">

                {/* CONTACT PROFILE SIDEBAR (Only visible when NOT in Email/SMS Mode or on wider screens) */}
                <div className={`w-80 lg:w-96 bg-gray-50/80 border-r border-gray-200 flex flex-col shrink-0 overflow-y-auto transition-all duration-300 ${emailMode ? 'hidden lg:flex w-64 opacity-50 pointer-events-none' : ''} ${smsMode ? 'hidden' : ''}`}>
                    {/* Header/Cover */}
                    <div className="h-32 bg-gradient-to-br from-slate-800 to-slate-900 relative">
                        <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10 block sm:hidden">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Avatar & Name */}
                    <div className="px-6 relative">
                        <div className="-mt-12 mb-4 w-24 h-24 rounded-3xl bg-white p-1.5 shadow-xl">
                            <div className="w-full h-full rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-3xl">
                                {initials.toUpperCase()}
                            </div>
                        </div>

                        <div className="mb-6">
                            <h2 className="text-2xl font-bold text-gray-900 leading-tight mb-1">
                                {contact.first_name} {contact.last_name}
                            </h2>
                            <p className="text-sm font-medium text-gray-500 flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5" />
                                {contact.company || 'Private Contact'}
                            </p>
                            <div className="flex gap-2 mt-3">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border uppercase tracking-wide
                                    ${contact.status === 'published' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}
                                `}>
                                    {contact.status}
                                </span>
                            </div>
                        </div>

                        {/* Contact Methods */}
                        <div className="grid grid-cols-2 gap-3 mb-8 relative">
                            {/* Call Button Group */}
                            <div className="relative group/call">
                                <button
                                    onClick={() => setShowQr(!showQr)}
                                    className="w-full flex items-center justify-center gap-2 p-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm transition-all active:scale-95 z-20 relative"
                                >
                                    <Phone className="w-4 h-4" /> <span className="text-xs font-bold">Call</span>
                                </button>

                                {/* QR Code Popover */}
                                {showQr && contact.phone && (
                                    <div className="absolute top-full left-0 mt-2 z-50 bg-white p-4 rounded-xl shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200 w-48 flex flex-col items-center text-center">
                                        <div className="bg-white p-2 rounded-lg border border-gray-100 mb-2">
                                            <QRCodeSVG value={`tel:${contact.phone}`} size={120} />
                                        </div>
                                        <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Scan to Call</p>
                                        <p className="text-xs font-black text-gray-900">{contact.phone}</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setEmailMode(true)}
                                className="flex items-center justify-center gap-2 p-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl shadow-sm transition-all active:scale-95"
                            >
                                <Mail className="w-4 h-4" /> <span className="text-xs font-bold">Email</span>
                            </button>

                            <button
                                onClick={() => setSmsMode(true)}
                                className="col-span-2 flex items-center justify-center gap-2 p-2.5 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-700 rounded-xl shadow-sm transition-all active:scale-95"
                            >
                                <MessageSquare className="w-4 h-4" /> <span className="text-xs font-bold">Draft SMS to QR</span>
                            </button>
                        </div>

                        {/* Details List */}
                        <div className="space-y-4 mb-8">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Information</h3>

                            <InfoRow icon={<Mail />} label="Email" value={contact.email} copyable />
                            <InfoRow icon={<Phone />} label="Phone" value={contact.phone} copyable />
                            <InfoRow icon={<Briefcase />} label="Role" value="CEO / Owner" />
                            <InfoRow icon={<MapPin />} label="Location" value="Slovakia" />
                            <InfoRow icon={<Globe />} label="Website" value="www.example.com" valueClass="text-blue-600 hover:underline cursor-pointer" />
                        </div>
                    </div>
                </div>

                {/* RIGHT CONTENT AREA */}
                <div className="flex-1 flex flex-col bg-white overflow-hidden relative">

                    {emailMode ? (
                        /* ================= EMAIL COMPOSER VIEW ================= */
                        <div className="flex flex-col h-full bg-white animate-in slide-in-from-bottom duration-300">
                            {/* Composer Header */}
                            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 shrink-0 bg-white">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    New Message
                                </h3>
                                <button onClick={() => setEmailMode(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 flex overflow-hidden">
                                {/* LEFT: History Context while writing */}
                                <div className="w-1/3 border-r border-gray-100 bg-gray-50/50 flex flex-col overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 bg-gray-50 sticky top-0">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Previous Interactions</h4>
                                    </div>
                                    <div className="overflow-y-auto p-4 space-y-4">
                                        {contact.activities && contact.activities.length > 0 ? (
                                            contact.activities.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((act, i) => (
                                                <div key={i} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-xs">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`font-bold uppercase tracking-tight 
                                                            ${act.type === 'call' ? 'text-blue-600' :
                                                                act.type === 'sms' ? 'text-emerald-600' : 'text-pink-600'}`}>
                                                            {act.type}
                                                        </span>
                                                        <span className="text-gray-400">{new Date(act.date).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-gray-600 font-medium line-clamp-2">{act.subject}</p>
                                                    {act.content && <p className="text-gray-400 mt-1 line-clamp-3">{act.content}</p>}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-gray-400 italic text-xs mt-10">No history found.</p>
                                        )}
                                    </div>
                                </div>

                                {/* RIGHT: Composer Input */}
                                <div className="flex-1 flex flex-col bg-white">
                                    <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">To</label>
                                            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                                <span className="text-sm font-bold text-gray-900">{contact.first_name} {contact.last_name}</span>
                                                <span className="text-xs text-gray-400">&lt;{contact.email}&gt;</span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Subject</label>
                                            <input
                                                className="w-full text-sm font-bold text-gray-900 border-b border-gray-200 py-2 outline-none focus:border-blue-500 placeholder:font-normal"
                                                placeholder="Enter subject..."
                                                value={subject}
                                                onChange={(e) => setSubject(e.target.value)}
                                            />
                                        </div>

                                        <div className="flex-1 flex flex-col min-h-[300px]">
                                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2 flex justify-between items-center">
                                                Message
                                                <button className="flex items-center gap-1 text-purple-600 hover:text-purple-700 transition-colors">
                                                    <Sparkles className="w-3 h-3" /> <span className="text-[10px]">AI Assistant</span>
                                                </button>
                                            </label>
                                            <textarea
                                                className="flex-1 w-full p-4 bg-gray-50/30 rounded-xl border border-gray-100 outline-none focus:ring-1 focus:ring-blue-100 focus:bg-white transition-all resize-none text-sm leading-relaxed"
                                                placeholder="Write your message here..."
                                                value={draftBody}
                                                onChange={(e) => setDraftBody(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    {/* Toolbar Footer */}
                                    <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white shrink-0">
                                        <div className="flex gap-2">
                                            <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"><Paperclip className="w-4 h-4" /></button>
                                            <button className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"><SmileIcon className="w-4 h-4" /></button>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => setEmailMode(false)} className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg">Discard</button>
                                            <button className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all">
                                                Send Message <Send className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : smsMode ? (
                        /* ================= SMS TO QR VIEW ================= */
                        <div className="flex flex-col h-full bg-white animate-in slide-in-from-bottom duration-300">
                            {/* Header */}
                            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-6 shrink-0 bg-white">
                                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                    <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                                        <MessageSquare className="w-4 h-4" />
                                    </div>
                                    Draft SMS to QR
                                </h3>
                                <button onClick={() => setSmsMode(false)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-900">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 flex overflow-hidden">
                                {/* LEFT: History Context */}
                                <div className="w-72 border-r border-gray-100 bg-gray-50/50 flex flex-col overflow-hidden shrink-0">
                                    <div className="p-4 border-b border-gray-100 bg-gray-50 sticky top-0">
                                        <h4 className="text-xs font-black uppercase tracking-widest text-gray-400">Context</h4>
                                    </div>
                                    <div className="overflow-y-auto p-4 space-y-4">
                                        {contact.activities?.map((act, i) => (
                                            <div key={i} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm text-xs opacity-70">
                                                <span className="font-bold block mb-1">{new Date(act.date).toLocaleDateString()}</span>
                                                <p className="line-clamp-2">{act.subject}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* RIGHT: Editor & QR Split */}
                                <div className="flex-1 flex flex-col p-8 gap-8 items-center justify-center bg-slate-50 relative">
                                    {/* Mobile Phone Frame Visualization */}
                                    <div className="flex w-full max-w-5xl gap-12 h-full">

                                        {/* Input Area (Wider) */}
                                        <div className="flex-[2] flex flex-col gap-4">
                                            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 flex-1 flex flex-col">
                                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-3">Type your SMS here</label>
                                                <textarea
                                                    className="flex-1 w-full bg-transparent outline-none resize-none text-lg text-gray-800 placeholder:text-gray-300 leading-relaxed"
                                                    placeholder="Hello, regarding our meeting..."
                                                    value={draftBody}
                                                    onChange={(e) => setDraftBody(e.target.value)}
                                                    autoFocus
                                                />
                                                <div className="flex justify-between items-center pt-4 border-t border-gray-100 mt-2">
                                                    <span className="text-xs font-bold text-gray-400">{draftBody.length} chars</span>
                                                    <button className="flex items-center gap-1 text-purple-600 hover:text-purple-700 transition-colors text-xs font-bold">
                                                        <Sparkles className="w-3 h-3" /> AI Help
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Arrow */}
                                        <div className="flex items-center justify-center text-gray-300">
                                            <ArrowRight className="w-8 h-8 animate-pulse" />
                                        </div>

                                        {/* QR Output */}
                                        <div className="flex-1 flex flex-col items-center justify-center">
                                            <div className="bg-white p-4 rounded-3xl shadow-xl border border-gray-100 transform transition-all hover:scale-105 duration-300">
                                                <QRCodeSVG
                                                    value={`sms:${contact.phone}?body=${encodeURIComponent(draftBody)}`}
                                                    size={160}
                                                    level="M"
                                                    includeMargin={true}
                                                />
                                            </div>
                                            <div className="mt-8 text-center space-y-2">
                                                <h3 className="text-lg font-black text-gray-900">Scan to Send</h3>
                                                <p className="text-sm text-gray-500 max-w-[200px] mx-auto">Open Camera app on your phone and scan this code to open SMS.</p>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* ================= DASHBOARD OVERVIEW (Default) ================= */
                        <>
                            {/* Top Bar */}
                            <div className="h-16 border-b border-gray-100 flex items-center justify-between px-8 bg-white shrink-0">
                                <div className="flex items-center gap-6">
                                    <button className="text-sm font-bold text-gray-900 border-b-2 border-gray-900 pb-5 pt-5">Overview</button>
                                    <button className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors pb-5 pt-5">Documents</button>
                                    <button className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors pb-5 pt-5">Invoices</button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="w-px h-4 bg-gray-200 mx-1"></div>
                                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Main Content */}
                            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                                <div className="grid grid-cols-12 gap-6">

                                    {/* KPI Cards Row */}
                                    <div className="col-span-12 grid grid-cols-4 gap-4 mb-2">
                                        <KpiCard
                                            label="Total Deals Value"
                                            value={`$${totalDealValue.toLocaleString()}`}
                                            icon={<Wallet className="w-4 h-4 text-green-600" />}
                                            trend="+12% vs last month"
                                        />
                                        <KpiCard
                                            label="Open Deals"
                                            value={String(contact.deals?.length || 0)}
                                            icon={<Briefcase className="w-4 h-4 text-blue-600" />}
                                        />
                                        <KpiCard
                                            label="Total Interactions"
                                            value={String(contact.activities?.length || 0)}
                                            icon={<MessageSquare className="w-4 h-4 text-purple-600" />}
                                        />
                                        <KpiCard
                                            label="Last Contact"
                                            value="2 days ago"
                                            icon={<Clock className="w-4 h-4 text-amber-600" />}
                                        />
                                    </div>

                                    {/* Main Column (8 cols) */}
                                    <div className="col-span-12 lg:col-span-8 space-y-6">

                                        {/* Projects Section */}
                                        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                                            <div className="flex items-center justify-between mb-5">
                                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                    <FolderKanban className="w-4 h-4 text-gray-400" /> Active Projects
                                                </h3>
                                                <button className="text-[11px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors uppercase tracking-wide">
                                                    + New Project
                                                </button>
                                            </div>

                                            {contact.projects && contact.projects.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {contact.projects.map((p, i) => (
                                                        <div key={i} className="p-4 rounded-xl border border-gray-100 bg-gray-50/50 hover:bg-white hover:shadow-md hover:border-blue-100 transition-all cursor-pointer group">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <span className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] font-bold uppercase tracking-wider text-gray-500">{p.project_type}</span>
                                                                <span className={`w-2 h-2 rounded-full ${p.stage === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}></span>
                                                            </div>
                                                            <h4 className="font-bold text-gray-800 text-sm mb-1 group-hover:text-blue-600 transition-colors">Project #{p.id}</h4>
                                                            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                                                <Clock className="w-3 h-3" /> {new Date(p.date_created).toLocaleDateString()}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-8 text-center border-2 border-dashed border-gray-100 rounded-xl">
                                                    <p className="text-xs text-gray-400 font-medium">No active projects linked to this contact.</p>
                                                </div>
                                            )}
                                        </section>

                                        {/* Activity Timeline */}
                                        <section className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm min-h-[300px]">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-gray-400" /> Activity Log
                                                </h3>
                                                <div className="flex gap-2">
                                                    <button className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold transition-colors">Log Call</button>
                                                    <button className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 rounded-lg text-xs font-bold transition-colors">Log Email</button>
                                                </div>
                                            </div>

                                            <div className="space-y-6 relative pl-2">
                                                <div className="absolute left-[27px] top-2 bottom-4 w-px bg-gray-100"></div>

                                                {contact.activities?.map((a, i) => (
                                                    <div key={i} className="flex gap-4 relative group">
                                                        <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center z-10 border-4 border-white shadow-sm transition-transform group-hover:scale-105
                                                            ${a.type === 'call' ? 'bg-blue-600 text-white' :
                                                                a.type === 'sms' ? 'bg-emerald-500 text-white' : 'bg-pink-500 text-white'}
                                                        `}>
                                                            {a.type === 'call' ? <Phone className="w-4 h-4" /> :
                                                                a.type === 'sms' ? <MessageSquare className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                                                        </div>
                                                        <div className="flex-1 pt-1.5">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <span className="text-xs font-bold text-gray-900">{a.subject || 'Interaction'}</span>
                                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide bg-gray-50 px-2 py-0.5 rounded">{new Date(a.date).toLocaleDateString()}</span>
                                                            </div>
                                                            <p className="text-xs text-gray-500 leading-relaxed bg-gray-50/50 p-3 rounded-lg border border-transparent group-hover:border-gray-100 transition-colors">
                                                                {a.content || 'No specific notes recorded for this interaction.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}

                                                {(!contact.activities || contact.activities.length === 0) && (
                                                    <p className="text-xs text-gray-400 italic text-center py-4">No activity history found.</p>
                                                )}
                                            </div>
                                        </section>
                                    </div>

                                    {/* Sidebar Column (4 cols) */}
                                    <div className="col-span-12 lg:col-span-4 space-y-6">
                                        {/* Deals */}
                                        <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4 flex items-center justify-between">
                                                Active Deals <span className="text-gray-900">{contact.deals?.length || 0}</span>
                                            </h3>
                                            <div className="space-y-3">
                                                {contact.deals?.map((d, i) => (
                                                    <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                                                                <Briefcase className="w-3.5 h-3.5 text-gray-500" />
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-bold text-gray-900">{d.name}</p>
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase">{d.paid ? 'Paid' : 'Pending'}</p>
                                                            </div>
                                                        </div>
                                                        <span className="text-xs font-black text-gray-900">${d.value}</span>
                                                    </div>
                                                ))}
                                                <button className="w-full py-2 border border-dashed border-gray-200 rounded-xl text-xs font-bold text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-1">
                                                    <Plus className="w-3 h-3" /> Add Deal
                                                </button>
                                            </div>
                                        </section>

                                        {/* Notes */}
                                        <section className="bg-amber-50/50 rounded-2xl p-5 border border-amber-100/50">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-amber-400 mb-3 flex items-center gap-2">
                                                <StickyNote className="w-3 h-3" /> Internal Notes
                                            </h3>
                                            <textarea
                                                className="w-full bg-white border-0 rounded-xl shadow-sm text-xs text-gray-600 p-3 min-h-[120px] resize-none focus:ring-1 focus:ring-amber-200 outline-none"
                                                placeholder="Add private notes about this client..."
                                                defaultValue={contact.comments || ''}
                                            />
                                            <button className="mt-2 text-[10px] font-bold text-amber-600 hover:text-amber-800 uppercase tracking-wide float-right">
                                                Save Note
                                            </button>
                                        </section>

                                        <section className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
                                            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Files</h3>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                                                    <div className="w-8 h-8 rounded bg-blue-50 text-blue-600 flex items-center justify-center">
                                                        <span className="text-[9px] font-black uppercase">PDF</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-gray-700 truncate">Contract_2026.pdf</p>
                                                        <p className="text-[9px] text-gray-400">1.2 MB • 2 days ago</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors">
                                                    <div className="w-8 h-8 rounded bg-orange-50 text-orange-600 flex items-center justify-center">
                                                        <span className="text-[9px] font-black uppercase">JPG</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-gray-700 truncate">Office_Visit.jpg</p>
                                                        <p className="text-[9px] text-gray-400">4.5 MB • 1 week ago</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </section>
                                    </div>

                                </div>
                            </div>
                        </>
                    )}
                </div>

            </div>
        </div>
    );
}

function InfoRow({ icon, label, value, copyable, valueClass }: { icon: any, label: string, value?: string, copyable?: boolean, valueClass?: string }) {
    return (
        <div className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 bg-white border border-gray-100 shadow-sm shrink-0">
                {React.cloneElement(icon, { className: 'w-3.5 h-3.5' })}
            </div>
            <div className="min-w-0 flex-1">
                <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">{label}</p>
                <p className={`text-xs font-semibold text-gray-900 truncate ${valueClass || ''}`}>{value || '—'}</p>
            </div>
            {copyable && value && (
                <button
                    onClick={() => navigator.clipboard.writeText(value)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white hover:shadow-sm rounded transition-all text-xs text-gray-400 font-medium"
                    title="Copy"
                >
                    Copy
                </button>
            )}
        </div>
    );
}

function KpiCard({ label, value, icon, trend }: { label: string, value: string, icon: any, trend?: string }) {
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</span>
                <div className="p-1.5 bg-gray-50 rounded-md">
                    {icon}
                </div>
            </div>
            <div>
                <span className="text-xl font-black text-gray-900 tracking-tight">{value}</span>
                {trend && <p className="text-[9px] font-bold text-green-600 mt-1">{trend}</p>}
            </div>
        </div>
    )
}

function SmileIcon({ className }: { className?: string }) {
    return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
}
