'use client';

import * as React from 'react';
import { ContactExtractionModal } from '@/components/dashboard/ContactExtractionModal';
import {
    Mail,
    Search,
    RefreshCcw,
    Clock,
    User,
    CheckCircle2,
    Download,
    Phone,
    MessageSquare,
    PhoneIncoming,
    PhoneOutgoing,
    PhoneMissed,
    Brain,
    Sparkles,
    AlertCircle,
    TrendingUp,
    Zap,
    Target,
    X,
    Paperclip,
    Trash2,
    ArrowLeft,
    UserPlus,
    Calendar
} from 'lucide-react';
import { VoiceInput } from '@/components/VoiceInput';
import { toast } from 'sonner';
import { GmailMessage, GmailAttachment } from '@/types/gmail';
import { AndroidLog } from '@/types/android';
import { EmailClassification } from '@/types/ai';
import { format } from 'date-fns';
import { sk } from 'date-fns/locale';
import { useUser } from '@clerk/nextjs';
import {
    agentCreateContact,
    agentCreateDeal,
    agentCheckAvailability,
    agentScheduleEvent,
    agentSendEmail
} from '@/app/actions/agent';

interface LeadsInboxProps {
    initialMessages?: GmailMessage[];
}

export function LeadsInbox({ initialMessages = [] }: LeadsInboxProps) {
    const { user, isLoaded } = useUser();
    const [messages, setMessages] = React.useState<GmailMessage[]>(initialMessages);
    const [androidLogs, setAndroidLogs] = React.useState<AndroidLog[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [isConnected, setIsConnected] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedTab, setSelectedTab] = React.useState<'all' | 'unread' | 'leads' | 'sms' | 'calls'>('all');
    const [selectedEmail, setSelectedEmail] = React.useState<GmailMessage | null>(null);

    // MODAL STATE
    const [isContactModalOpen, setIsContactModalOpen] = React.useState(false);
    const [contactModalData, setContactModalData] = React.useState<{ name: string, email: string, phone: string, company: string } | null>(null);
    const [contactModalEmailBody, setContactModalEmailBody] = React.useState('');

    // NEW STATES
    const [activeActionId, setActiveActionId] = React.useState<string | null>(null);
    const [draftingEmail, setDraftingEmail] = React.useState<GmailMessage | null>(null);
    const [draftContent, setDraftContent] = React.useState('');
    const [isGeneratingDraft, setIsGeneratingDraft] = React.useState(false);
    const [customCommandMode, setCustomCommandMode] = React.useState(false);
    const [customPrompt, setCustomPrompt] = React.useState('');

    const fetchMessages = async (isBackground = false) => {
        if (!isBackground) setLoading(true);
        try {
            // Fetch Gmail
            const gmailRes = await fetch('/api/google/gmail', { cache: 'no-store' });
            const gmailData = await gmailRes.json();
            if (gmailData.isConnected && gmailData.messages) {
                setIsConnected(true);
                setMessages(prev => {
                    return gmailData.messages.map((newMsg: GmailMessage) => {
                        const existing = prev.find(p => p.id === newMsg.id);

                        // Try to restore from localStorage if missing in state
                        let classification = existing?.classification;
                        if (!classification) {
                            const saved = localStorage.getItem(`ai_classify_${newMsg.id}`);
                            if (saved) classification = JSON.parse(saved);
                        }

                        // Smart Merge: Keep existing classification if new one is missing
                        if (classification) {
                            return { ...newMsg, classification };
                        }
                        return newMsg;
                    });
                });
            } else if (gmailData.isConnected === false) {
                setIsConnected(false);
            }

            // Fetch Android Logs
            if (!isBackground) {
                const androidRes = await fetch('/api/android-logs');
                const androidData = await androidRes.json();
                if (androidData.success) {
                    setAndroidLogs(androidData.logs);
                }
            }
        } catch (error) {
            console.error('Failed to fetch inbox:', error);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    const handleConnect = async () => {
        if (!isLoaded || !user) return;
        setLoading(true);
        try {
            // Clerk Link Account Logic
            // This will redirect to Google for consent with the scopes defined in Clerk Dashboard
            await user.createExternalAccount({
                provider: 'google',
                redirectUrl: window.location.href,
            });
        } catch (error: any) {
            console.error('Failed to connect Google via Clerk:', error);
            setLoading(false);
        }
    };

    const handleOpenEmail = async (msg: GmailMessage) => {
        setSelectedEmail(msg);

        // Optimistically mark as read in UI
        if (!msg.isRead) {
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));

            // Mark as read in Gmail
            try {
                await fetch('/api/google/gmail', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ messageId: msg.id })
                });
            } catch (error) {
                console.error('Failed to mark as read:', error);
            }
        }
    };

    React.useEffect(() => {
        fetchMessages();

        // Smart Background Sync (Every 15s)
        const interval = setInterval(() => {
            fetchMessages(true);
        }, 15000);

        return () => clearInterval(interval);
    }, []);

    const filteredMessages = messages.filter(msg => {
        const matchesSearch = msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
            msg.snippet.toLowerCase().includes(searchQuery.toLowerCase());

        if (selectedTab === 'unread') return matchesSearch && !msg.isRead;
        if (selectedTab === 'all' || selectedTab === 'leads') return matchesSearch;
        return false;
    });

    const filteredLogs = androidLogs.filter(log => {
        const matchesSearch = log.phone_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (log.body || '').toLowerCase().includes(searchQuery.toLowerCase());

        if (selectedTab === 'sms') return matchesSearch && log.type === 'sms';
        if (selectedTab === 'calls') return matchesSearch && log.type === 'call';
        if (selectedTab === 'all') return matchesSearch;
        return false;
    });

    // Combine for "All" tab or specific tabs
    const allItems = [
        ...filteredMessages.map(m => ({ ...m, itemType: 'email' as const })),
        ...filteredLogs.map(l => ({ ...l, itemType: 'android' as const }))
    ].sort((a, b) => {
        const dateA = new Date((a as any).date || (a as any).timestamp).getTime();
        const dateB = new Date((b as any).date || (b as any).timestamp).getTime();
        return dateB - dateA;
    });

    // NON-AI Extractions
    const handleSaveContact = async (e: React.MouseEvent, msg: GmailMessage) => {
        e.stopPropagation();

        // 1. Initialize with AI Data (Priority)
        const aiEntities = msg.classification?.entities;
        let name = aiEntities?.contact_name && aiEntities.contact_name !== '—' ? aiEntities.contact_name : '';
        let email = aiEntities?.email && aiEntities.email !== '—' ? aiEntities.email : '';
        let phone = aiEntities?.phone && aiEntities.phone !== '—' ? aiEntities.phone : '';
        let company = aiEntities?.company_name && aiEntities.company_name !== '—' ? aiEntities.company_name : '';

        // 2. Fallbacks (Header & Regex) if AI data missing

        // Name & Email Fallback
        if (!name || !email) {
            const emailMatch = msg.from.match(/<([^>]+)>/);
            if (emailMatch) {
                if (!email) email = emailMatch[1];
                if (!name) name = msg.from.replace(/<[^>]+>/, '').trim().replace(/^"|"$/g, '');
            } else {
                if (!email) email = msg.from.trim();
                if (!name) name = email.split('@')[0];
            }
        }

        // Phone Fallback (Regex)
        if (!phone) {
            const phoneRegex = /(?:\+|00)(?:421|420|43|49)\s?\d{1,4}\s?\d{2,4}\s?\d{2,4}|(?<!\d)09\d{2}[\s.-]?\d{3}[\s.-]?\d{3}(?!\d)/g;
            const textToSearch = msg.body || msg.snippet || '';
            const phones = textToSearch.match(phoneRegex);
            const uniquePhones = phones ? Array.from(new Set(phones.map(p => p.trim()))) : [];

            if (uniquePhones.length > 0) {
                // Use the last found phone as it's often the signature
                phone = uniquePhones[uniquePhones.length - 1].replace(/\s/g, '');
            }
        }

        // 3. Open Modal instead of Confirm
        const companyDisplay = company || ''; // Let modal handle empty display logic

        setContactModalData({ name, email, phone, company: companyDisplay });
        setContactModalEmailBody(msg.body || msg.snippet || '');
        setIsContactModalOpen(true);
    };

    // AUTO-ANALYSIS SYSTEM
    const analyzedIds = React.useRef<Set<string>>(new Set());

    const analyzeEmail = async (msg: GmailMessage) => {
        // Prevent double trigger
        if (analyzedIds.current.has(msg.id)) return;
        analyzedIds.current.add(msg.id);

        console.log(`[Auto-Analyze] Starting for: ${msg.id}`);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isAnalyzing: true } : m));

        try {
            // Priority: Use HTML if body is too snippet-like/empty
            let textToAnalyze = msg.body;
            if ((!textToAnalyze || textToAnalyze.length < 50) && msg.bodyHtml) {
                textToAnalyze = msg.bodyHtml.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
            }

            if (!textToAnalyze || textToAnalyze.length < 5) {
                console.warn(`[Auto-Analyze] Skipped ${msg.id}: content too short`);
                setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isAnalyzing: false } : m));
                return;
            }

            const res = await fetch('/api/ai/classify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: textToAnalyze.substring(0, 3000),
                    messageId: msg.id,
                    sender: msg.from
                })
            });

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();

            if (data.success) {
                const storageKey = `ai_classify_${msg.id}`;
                localStorage.setItem(storageKey, JSON.stringify(data.classification));

                setMessages(prev => prev.map(m => m.id === msg.id ? {
                    ...m,
                    classification: data.classification,
                    isAnalyzing: false
                } : m));

                // Optional: Notify user discreetly
                // toast.success(`Analyzovaná správa od: ${msg.from}`);
            } else {
                throw new Error(data.error);
            }
        } catch (error: any) {
            console.error(`[Auto-Analyze] Error for ${msg.id}:`, error);
            setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isAnalyzing: false } : m));
        }
    };

    // Effect to trigger analysis for unclassified stats
    React.useEffect(() => {
        messages.forEach(msg => {
            if (!msg.classification && !msg.isAnalyzing && !analyzedIds.current.has(msg.id)) {
                // Determine if we should analyze (e.g. ignore really old ones if needed, but for now analyze all loaded)
                analyzeEmail(msg);
            }
        });
    }, [messages]);

    const handleManualAnalyze = async (e: React.MouseEvent, msg: GmailMessage) => {
        e.stopPropagation();
        analyzedIds.current.delete(msg.id); // Reset lock to allow manual retry
        analyzeEmail(msg);
    };

    // NEW HANDLERS
    const handleToggleAction = (e: React.MouseEvent, msgId: string) => {
        e.stopPropagation();
        setActiveActionId(prev => prev === msgId ? null : msgId);
    };

    const handleDraftReply = async (msg: GmailMessage) => {
        setIsGeneratingDraft(true);
        try {
            const cleanBody = msg.body.replace(/<[^>]*>?/gm, '').substring(0, 1000);
            const res = await fetch('/api/ai/draft', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    originalContent: cleanBody,
                    nextStep: (msg as any).classification?.next_step || 'Reply',
                    senderName: msg.from,
                    messageId: msg.id // Added for caching
                })
            });
            const data = await res.json();
            if (data.success) {
                setDraftContent(data.draft);
                setDraftingEmail(msg);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsGeneratingDraft(false);
        }
    };



    const handleExecuteCustomCommand = async () => {
        if (!customPrompt.trim() || !selectedEmail) return;
        setIsGeneratingDraft(true); // Reuse loading state provided it fits visually

        try {
            const cleanBody = selectedEmail.body.replace(/<[^>]*>?/gm, '').substring(0, 2000);

            const res = await fetch('/api/ai/agent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: customPrompt,
                    emailBody: cleanBody,
                    sender: selectedEmail.from,
                    messageId: selectedEmail.id
                })
            });

            const data = await res.json();

            if (data.success && data.plan?.actions) {
                // EXECUTE PLAN
                for (const action of data.plan.actions) {
                    console.log('Executing action:', action);

                    if (action.tool === 'draft_reply') {
                        setDraftContent(action.parameters.body_html || action.parameters.body);
                        setDraftingEmail(selectedEmail);
                    }
                    else if (action.tool === 'create_contact') {
                        const result = await agentCreateContact({
                            name: action.parameters.name,
                            email: action.parameters.email,
                            company: action.parameters.company,
                            phone: action.parameters.phone
                        });
                        alert(result.success ? `✅ Contact Created: ${action.parameters.name}` : `❌ Contact Error: ${result.error}`);
                    }
                    else if (action.tool === 'create_deal') {
                        const result = await agentCreateDeal({
                            name: action.parameters.name,
                            value: action.parameters.value,
                            stage: action.parameters.stage,
                            contact_email: selectedEmail.from
                        });
                        alert(result.success ? `✅ Deal Created: ${action.parameters.name}` : `❌ Deal Error: ${result.error}`);
                    }
                    else if (action.tool === 'check_availability') {
                        const result = await agentCheckAvailability(action.parameters.time_range);
                        if (result.success) {
                            alert('📅 Calendar checked successfully.');
                        } else {
                            alert(`❌ Calendar Error: ${result.error}`);
                        }
                    }
                    else if (action.tool === 'schedule_event') {
                        const result = await agentScheduleEvent({
                            title: action.parameters.title,
                            start_time: action.parameters.start_time,
                            duration_min: action.parameters.duration_min || 30
                        });
                        alert(result.success ? `✅ Meeting Scheduled` : `❌ Schedule Error: ${result.error}`);
                    }
                    else if (action.tool === 'send_email') {
                        if (window.confirm(`Send email to ${selectedEmail.from}?`)) {
                            const result = await agentSendEmail({
                                recipient: selectedEmail.from,
                                subject: "Re: " + selectedEmail.subject,
                                body_html: action.parameters.content || action.parameters.body,
                                threadId: selectedEmail.id // Using Message ID as thread ID approximation if threadId missing on type
                            });
                            alert(result.success ? `✉️ Email Sent` : `❌ Email Error: ${result.error}`);
                        }
                    }
                    else if (action.tool === 'search_filter') {
                        if (action.parameters.query) setSearchQuery(action.parameters.query);
                        if (action.parameters.tab && ['all', 'unread', 'leads', 'sms', 'calls'].includes(action.parameters.tab)) {
                            setSelectedTab(action.parameters.tab as any);
                        }
                        // Visual feedback
                        const toastMsg = `🔍 Filtering: "${action.parameters.query}" in ${action.parameters.tab || 'view'}`;
                        console.log(toastMsg);
                        // Note: Alert might be annoying for UI changes, rely on visual change + console
                    }
                    else if (action.tool === 'mark_read') {
                        try {
                            await fetch('/api/google/gmail', {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ messageId: selectedEmail.id })
                            });
                            setMessages(prev => prev.map(m => m.id === selectedEmail.id ? { ...m, isRead: true } : m));
                            alert('✅ Conversation marked as read.');
                        } catch (e) { console.error(e); }
                    }
                }
                setCustomCommandMode(false);
                setCustomPrompt('');
            }
        } catch (error) {
            console.error('Agent Execution Failed:', error);
            alert('Agent narazil na chybu. Skúste to prosím znova.');
        } finally {
            setIsGeneratingDraft(false);
        }
    };

    return (
        <div className="flex h-full gap-0 bg-white rounded-none relative">
            {/* Contact Extraction Modal */}
            {isContactModalOpen && contactModalData && (
                <ContactExtractionModal
                    isOpen={isContactModalOpen}
                    onClose={() => setIsContactModalOpen(false)}
                    emailBody={contactModalEmailBody}
                    extractedData={contactModalData}
                    onConfirm={async () => {
                        const toastId = toast.loading('Ukladám kontakt...');
                        try {
                            // @ts-ignore
                            const res = await agentCreateContact(contactModalData);
                            if (res.success) {
                                toast.success('Kontakt úspešne vytvorený', { id: toastId });
                            } else {
                                toast.error(`Chyba: ${res.error}`, { id: toastId });
                            }
                        } catch (err) {
                            toast.error('Nepodarilo sa uložiť kontakt', { id: toastId });
                        }
                    }}
                />
            )}

            {/* Quick Composer Modal */}
            {draftingEmail && (
                <QuickComposerModal
                    isOpen={!!draftingEmail}
                    onClose={() => setDraftingEmail(null)}
                    initialContent={draftContent}
                    recruitName={draftingEmail.from}
                    onSend={async (text: string) => {
                        console.log('Sending:', text);
                        // Here we would call actual send API
                        setDraftingEmail(null);
                        setActiveActionId(null);
                    }}
                />
            )}

            {selectedEmail && (
                <div className="fixed inset-0 z-[50] bg-white flex flex-col animate-in slide-in-from-right duration-300">
                    <EmailDetailView
                        email={selectedEmail}
                        onClose={() => setSelectedEmail(null)}
                    />
                </div>
            )}

            {/* Sidebar for Navigation */}
            <div className="w-64 flex flex-col gap-1 border-r border-gray-100 bg-gray-50/30 p-4">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 px-2">Schránky</h3>
                <button
                    onClick={() => setSelectedTab('all')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${selectedTab === 'all' ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                >
                    <Mail className="w-4 h-4" /> Všetko
                </button>
                <div className="space-y-1 mt-2">
                    <button
                        onClick={() => setSelectedTab('sms')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${selectedTab === 'sms' ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                    >
                        <MessageSquare className="w-4 h-4" /> SMS
                    </button>
                    <button
                        onClick={() => setSelectedTab('calls')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${selectedTab === 'calls' ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                    >
                        <Phone className="w-4 h-4" /> Hovory
                    </button>
                </div>

                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mt-8 mb-4 px-2">Filtre</h3>
                <button
                    onClick={() => setSelectedTab('unread')}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${selectedTab === 'unread' ? 'bg-gray-900 text-white shadow-xl' : 'text-gray-600 hover:bg-white hover:shadow-sm'}`}
                >
                    <Clock className="w-4 h-4" /> Neprečítané
                </button>
            </div>

            {/* Main Inbox View */}
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
                {/* Header/Toolbar */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-black text-gray-900 tracking-tight">Doručená pošta</h1>
                        {!isConnected && !loading && (
                            <button
                                onClick={handleConnect}
                                className="flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all"
                            >
                                <Sparkles className="w-3 h-3" /> Povoliť Gmail
                            </button>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Hľadať správu..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-gray-200 transition-all"
                            />
                        </div>
                        <button
                            onClick={() => fetchMessages()}
                            className={`p-2.5 rounded-xl bg-gray-50 text-gray-600 hover:bg-gray-100 transition-all ${loading ? 'animate-spin' : ''}`}
                        >
                            <RefreshCcw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Message List */}
                <div className="flex-1 overflow-y-auto">
                    {loading && messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                            <div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Synchronizujem...</p>
                        </div>
                    ) : filteredMessages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-12 text-gray-900">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <Mail className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-xl font-black">Žiadne správy</h3>
                            <p className="text-gray-500 font-medium mt-2">Všetko vybavené! Čas na kávu.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {allItems.map((item: any) => {
                                if (item.itemType === 'email') {
                                    const msg = item as GmailMessage & { classification?: EmailClassification, isAnalyzing?: boolean };
                                    const isSpam = msg.classification?.intent === 'spam';

                                    // New Radial Gradient System
                                    let priorityColor = 'hover:bg-gray-50'; // Default
                                    let borderColor = 'border-transparent border-b-gray-50'; // Default border

                                    if (isSpam) {
                                        // Solid Gray for Spam
                                        priorityColor = 'bg-gray-100/80 grayscale opacity-60 hover:opacity-100 hover:bg-gray-200/50 transition-all';
                                        borderColor = 'border border-gray-200';
                                    } else if (msg.classification?.priority === 'vysoka') {
                                        // Maximum Intensity Red Radial - High
                                        priorityColor = 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-300 via-red-200/60 to-transparent shadow-[inset_0_0_40px_rgba(239,68,68,0.25)]';
                                        borderColor = 'border border-red-400/60';
                                    } else if (msg.classification?.priority === 'stredna') {
                                        // Maximum Intensity Amber Radial - Medium
                                        priorityColor = 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-300 via-amber-200/60 to-transparent shadow-[inset_0_0_40px_rgba(245,158,11,0.25)]';
                                        borderColor = 'border border-amber-400/60';
                                    } else {
                                        // Maximum Intensity Blue Radial - Low / Normal
                                        priorityColor = 'bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-200 via-blue-100/50 to-transparent shadow-[inset_0_0_40px_rgba(59,130,246,0.15)]';
                                        borderColor = 'border border-blue-300/50';
                                    }

                                    const readStyle = !msg.isRead ? '' : 'opacity-95';
                                    const isActionOpen = activeActionId === msg.id;

                                    // Dynamic Theme for Action Panel
                                    const panelTheme = isSpam ? {
                                        bg: 'bg-gray-50 border-gray-200',
                                        iconBg: 'bg-gray-200 text-gray-500',
                                        button: 'bg-gray-700 hover:bg-gray-800',
                                        text: 'text-gray-600'
                                    } : msg.classification?.priority === 'vysoka' ? {
                                        bg: 'bg-gradient-to-r from-red-50/80 to-white border-red-100',
                                        iconBg: 'bg-red-100 text-red-600 border-red-200',
                                        button: 'bg-red-600 hover:bg-red-700 text-white',
                                        text: 'text-gray-900',
                                        accent: 'text-red-700'
                                    } : msg.classification?.priority === 'stredna' ? {
                                        bg: 'bg-gradient-to-r from-amber-50/80 to-white border-amber-100',
                                        iconBg: 'bg-amber-100 text-amber-600 border-amber-200',
                                        button: 'bg-amber-600 hover:bg-amber-700 text-white',
                                        text: 'text-gray-900',
                                        accent: 'text-amber-700'
                                    } : {
                                        bg: 'bg-gradient-to-r from-blue-50/80 to-white border-blue-100',
                                        iconBg: 'bg-blue-100 text-blue-600 border-blue-200',
                                        button: 'bg-gray-900 hover:bg-black text-white',
                                        text: 'text-gray-900',
                                        accent: 'text-blue-700'
                                    };

                                    return (
                                        <React.Fragment key={msg.id}>
                                            <div
                                                onClick={() => handleOpenEmail(msg)}
                                                className={`group flex items-center gap-6 px-6 py-4 transition-all cursor-pointer relative
                                                ${readStyle} ${priorityColor} ${borderColor}
                                                ${isActionOpen ? 'brightness-[0.98] shadow-inner' : ''}`}
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center text-sm font-black text-gray-600 shadow-sm group-hover:scale-105 transition-transform">
                                                    {msg.from.substring(0, 1).toUpperCase()}
                                                </div>

                                                <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                                                    <div className="col-span-2">
                                                        <span className={`text-sm truncate block ${!msg.isRead ? 'font-black text-gray-900' : 'font-bold text-gray-700'}`}>
                                                            {msg.from}
                                                        </span>
                                                        <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                                                            {format(new Date(msg.date), 'd. MMM HH:mm', { locale: sk })}
                                                        </span>
                                                    </div>

                                                    <div className="col-span-4">
                                                        <h4 className={`text-sm truncate mb-0.5 ${!msg.isRead ? 'font-black text-gray-900' : 'font-medium text-gray-800'}`}>
                                                            {msg.subject}
                                                        </h4>
                                                        <p className="text-xs text-gray-400 truncate font-medium">{msg.snippet}</p>
                                                    </div>

                                                    <div className="col-span-6 flex justify-end items-center gap-2">
                                                        {msg.classification ? (
                                                            <div className="flex items-center gap-2">
                                                                {/* Budget Badge */}
                                                                {msg.classification.estimated_budget && msg.classification.estimated_budget !== '—' && msg.classification.estimated_budget !== 'Neznámy' && (
                                                                    <div className="hidden lg:flex px-2 py-1 rounded-lg bg-white/60 border border-gray-200 text-gray-700 items-center gap-1.5 shadow-sm">
                                                                        <Zap className="w-3 h-3" />
                                                                        <span className="text-[10px] font-black uppercase tracking-wide">{msg.classification.estimated_budget}</span>
                                                                    </div>
                                                                )}

                                                                {/* Category Badge */}
                                                                {msg.classification.service_category && msg.classification.service_category !== '—' && (
                                                                    <div className="hidden xl:flex px-2 py-1 rounded-lg bg-white/60 border border-gray-200 text-gray-600 items-center gap-1.5 shadow-sm">
                                                                        <TrendingUp className="w-3 h-3" />
                                                                        <span className="text-[10px] font-bold uppercase tracking-wide truncate max-w-[100px]">{msg.classification.service_category}</span>
                                                                    </div>
                                                                )}

                                                                {/* Intent Badge */}
                                                                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg border shadow-sm bg-white/80 border-gray-200 text-gray-700`}>
                                                                    {isSpam ? <Trash2 className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}
                                                                    <span className="text-[10px] font-black uppercase tracking-wider">
                                                                        {isSpam ? 'SPAM' : msg.classification.intent}
                                                                    </span>
                                                                </div>

                                                                {/* Magic Toggle Button */}
                                                                <button
                                                                    onClick={(e) => handleToggleAction(e, msg.id)}
                                                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isActionOpen ? 'bg-gray-900 text-white shadow-lg rotate-180' : 'bg-white border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200'}`}
                                                                >
                                                                    {isActionOpen ? <X className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => handleManualAnalyze(e, msg)}
                                                                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 text-white hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-95 group/btn"
                                                            >
                                                                {msg.isAnalyzing ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Brain className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />}
                                                                <span className="text-[10px] font-black uppercase tracking-wider">Analyzovať</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* EXPANDABLE AI COMMAND CENTER */}
                                            {isActionOpen && msg.classification && (
                                                <div className={`${panelTheme.bg} border-y relative overflow-hidden animate-in slide-in-from-top-2 duration-300`}>
                                                    {/* Background Pattern decoration */}
                                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                                    <div className="px-16 py-6 relative">
                                                        <div className="flex flex-col lg:flex-row gap-6 items-stretch">

                                                            {/* LEFT: INTELLIGENCE CARD */}
                                                            <div className="flex-1 bg-white/60 backdrop-blur-sm rounded-2xl p-5 border border-white/50 shadow-sm flex flex-col justify-between">
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-3">
                                                                        <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${panelTheme.iconBg}`}>
                                                                            <Brain className="w-3.5 h-3.5" />
                                                                        </div>
                                                                        <span className={`text-[10px] font-black uppercase tracking-widest ${panelTheme.text} opacity-70`}>Analýza Situácie</span>
                                                                    </div>
                                                                    <p className={`text-sm font-medium leading-relaxed ${panelTheme.text}`}>
                                                                        {msg.classification.summary}
                                                                    </p>
                                                                </div>

                                                                <div className="mt-4 pt-4 border-t border-gray-100/50 flex items-center gap-4">
                                                                    <button
                                                                        onClick={(e) => handleSaveContact(e, msg)}
                                                                        className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                                                                    >
                                                                        <UserPlus className="w-3.5 h-3.5" /> Uložiť kontakt
                                                                    </button>
                                                                    <div className="w-px h-3 bg-gray-300/50"></div>
                                                                    <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors">
                                                                        <Calendar className="w-3.5 h-3.5" /> Naplánovať
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* RIGHT: ACTION STRATEGY */}
                                                            <div className="flex-1 bg-white/80 backdrop-blur-md rounded-2xl p-0 border border-white/60 shadow-lg shadow-gray-200/20 overflow-hidden flex flex-col">
                                                                {!customCommandMode ? (
                                                                    <>
                                                                        <div className="p-5 flex-1">
                                                                            <div className="flex items-center gap-2 mb-2">
                                                                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${panelTheme.iconBg}`}>
                                                                                    <Zap className="w-3.5 h-3.5" />
                                                                                </div>
                                                                                <span className={`text-[10px] font-black uppercase tracking-widest ${panelTheme.accent}`}>Odporúčaná stratégia</span>
                                                                            </div>
                                                                            <h3 className={`text-lg font-black leading-tight mb-1 ${panelTheme.text}`}>
                                                                                {msg.classification.next_step}
                                                                            </h3>
                                                                        </div>

                                                                        {/* MAIN ACTION BUTTON AREA */}
                                                                        <div className="bg-white/50 border-t border-gray-100 p-3 flex flex-col gap-2">
                                                                            <div className="flex gap-3">
                                                                                <button
                                                                                    onClick={() => handleDraftReply(msg)}
                                                                                    disabled={isGeneratingDraft}
                                                                                    className={`flex-1 ${panelTheme.button} h-12 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn`}
                                                                                >
                                                                                    <span className="relative z-10 flex items-center gap-2">
                                                                                        {isGeneratingDraft ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                                                                        {isGeneratingDraft ? 'Analyzujem...' : 'Vytvoriť Odpoveď'}
                                                                                    </span>
                                                                                    {/* Shine effect */}
                                                                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[100%] group-hover/btn:animate-[shimmer_1.5s_infinite]" />
                                                                                </button>

                                                                                <button
                                                                                    onClick={(e) => handleToggleAction(e, msg.id)}
                                                                                    className="w-12 h-12 bg-white hover:bg-gray-50 border border-gray-200 text-gray-400 hover:text-gray-600 rounded-xl flex items-center justify-center transition-all"
                                                                                >
                                                                                    <X className="w-5 h-5" />
                                                                                </button>
                                                                            </div>

                                                                            <button
                                                                                onClick={() => setCustomCommandMode(true)}
                                                                                className="w-full py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                                                                            >
                                                                                Chcem urobiť niečo iné...
                                                                            </button>
                                                                        </div>
                                                                    </>
                                                                ) : (
                                                                    <div className="flex flex-col h-full bg-white/90">
                                                                        <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                                                            <div className="flex items-center gap-2">
                                                                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Vlastný príkaz</span>
                                                                            </div>
                                                                            <button onClick={() => setCustomCommandMode(false)} className="text-gray-400 hover:text-gray-600"><X className="w-3 h-3" /></button>
                                                                        </div>
                                                                        <div className="p-3 flex-1">
                                                                            <textarea
                                                                                value={customPrompt}
                                                                                onChange={(e) => setCustomPrompt(e.target.value)}
                                                                                placeholder="Napr: Zisti či mám voľno v utorok a navrhni termín..."
                                                                                className="w-full h-full bg-transparent border-none outline-none text-sm text-gray-700 font-medium resize-none placeholder:text-gray-300 pr-10"
                                                                                autoFocus
                                                                            />
                                                                            <div className="absolute right-4 bottom-4">
                                                                                <VoiceInput onTranscription={(text) => setCustomPrompt(prev => (prev + " " + text).trim())} />
                                                                            </div>
                                                                        </div>
                                                                        <div className="p-3 border-t border-gray-100 bg-gray-50 flex justify-end">
                                                                            <button
                                                                                onClick={handleExecuteCustomCommand}
                                                                                disabled={isGeneratingDraft}
                                                                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-md flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                                                                            >
                                                                                {isGeneratingDraft ? <RefreshCcw className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                                                                {isGeneratingDraft ? 'Pracujem...' : 'Vykonať'}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </React.Fragment>
                                    );
                                } else {
                                    const log = item as AndroidLog;
                                    const isCall = log.type === 'call';
                                    const isMissed = log.direction === 'missed' || log.direction === 'rejected';

                                    return (
                                        <div
                                            key={log.id}
                                            className="group flex items-center gap-6 px-6 py-4 hover:bg-gray-50 transition-all cursor-pointer border-l-[3px] border-transparent"
                                        >
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${isCall ? (isMissed ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600') : 'bg-indigo-50 text-indigo-600'}`}>
                                                {isCall ? (
                                                    log.direction === 'incoming' ? <PhoneIncoming className="w-5 h-5" /> :
                                                        log.direction === 'outgoing' ? <PhoneOutgoing className="w-5 h-5" /> :
                                                            <PhoneMissed className="w-5 h-5" />
                                                ) : <MessageSquare className="w-5 h-5" />}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-black text-gray-900 tracking-tight">
                                                        {log.phone_number}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                        {format(new Date(log.timestamp), 'd. MMM HH:mm', { locale: sk })}
                                                    </span>
                                                </div>
                                                <p className="text-xs font-bold text-gray-500 truncate">
                                                    {isCall ? `Hovor (${log.duration}s)` : log.body}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                }
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function EmailDetailView({ email, onClose }: { email: GmailMessage; onClose: () => void }) {
    const [viewMode, setViewMode] = React.useState<'html' | 'text'>('html');
    const [downloading, setDownloading] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (email) {
            setViewMode(email.bodyHtml ? 'html' : 'text');
        }
    }, [email]);


    const handleDownload = async (attachment: GmailAttachment) => {
        setDownloading(attachment.id);
        try {
            const res = await fetch('/api/google/gmail', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messageId: email.id,
                    attachmentId: attachment.id,
                    filename: attachment.filename
                })
            });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = attachment.filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Failed to download:', error);
        } finally {
            setDownloading(null);
        }
    };

    const hasHtml = !!email.bodyHtml;
    const classification = (email as any).classification;

    return (
        <div className="flex flex-col h-full bg-white text-gray-700 font-medium">
            {/* Header Container - Full Width */}
            <div className="px-6 py-4 border-b border-gray-100 bg-white">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={onClose} className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Späť</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {hasHtml && (
                            <div className="flex p-1 bg-gray-100/80 rounded-lg">
                                <button
                                    onClick={() => setViewMode('html')}
                                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all ${viewMode === 'html' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                                >
                                    HTML
                                </button>
                                <button
                                    onClick={() => setViewMode('text')}
                                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-tighter rounded-md transition-all ${viewMode === 'text' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                                >
                                    TEXT
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-black shadow-lg shadow-blue-200">
                        {email.from[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-sm font-black text-gray-900 leading-tight truncate max-w-[400px]">{email.from}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{format(new Date(email.date), 'd. MMM yyyy HH:mm', { locale: sk })}</p>
                    </div>
                </div>

                <h2 className="text-xl font-black text-gray-900 leading-tight mb-6">{email.subject}</h2>

                {/* AI Insights Bar - if exists */}
                {classification && (
                    <div className={`p-6 rounded-2xl border mb-6 ${classification.intent === 'spam' ? 'bg-red-50/30 border-red-100' : 'bg-gray-50/50 border-gray-100'}`}>
                        <div className="flex flex-wrap gap-3 mb-4">
                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${classification.intent === 'spam' ? 'bg-red-600 text-white border-red-700 shadow-sm' :
                                classification.priority === 'vysoka' ? 'bg-red-50 text-red-700 border-red-100' :
                                    classification.priority === 'stredna' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                        'bg-blue-50 text-blue-700 border-blue-100'
                                }`}>
                                {classification.intent === 'spam' ? <Trash2 className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                                {classification.intent === 'spam' ? 'Nerelevantné / Spam' : `${classification.priority} priorita`}
                            </span>

                            {classification.intent !== 'spam' && (
                                <>
                                    <span className="flex items-center gap-1 px-2 py-0.5 bg-white text-[9px] font-black uppercase tracking-widest text-indigo-700 rounded-md border border-indigo-100">
                                        <Target className="w-2.5 h-2.5" /> {classification.intent}
                                    </span>
                                    {classification.service_category !== '—' && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-white text-[9px] font-black uppercase tracking-widest text-emerald-700 rounded-md border border-emerald-100">
                                            <TrendingUp className="w-2.5 h-2.5" /> {classification.service_category}
                                        </span>
                                    )}
                                    {classification.estimated_budget !== '—' && classification.estimated_budget !== 'Neznámy' && (
                                        <span className="flex items-center gap-1 px-2 py-0.5 bg-green-600 text-[9px] font-black uppercase tracking-widest text-white rounded-md shadow-sm">
                                            <Zap className="w-2.5 h-2.5" /> Budget: {classification.estimated_budget}
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                        <div className="flex items-start gap-2 bg-white/60 p-2 rounded-lg border border-white">
                            <Sparkles className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${classification.intent === 'spam' ? 'text-gray-400' : 'text-blue-500'}`} />
                            <div className="min-w-0">
                                <p className="text-[10px] font-bold text-gray-800 leading-tight mb-1">{classification.summary}</p>
                                {classification.next_step !== '—' && (
                                    <p className="text-[9px] font-medium text-blue-700 uppercase tracking-wide">💡 Odporúčaný krok: {classification.next_step}</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden bg-white">
                {viewMode === 'html' && email.bodyHtml ? (
                    <div className="w-full h-full bg-white relative">
                        <iframe
                            srcDoc={`
                                <!DOCTYPE html>
                                <html>
                                    <head>
                                        <meta charset="utf-8">
                                        <style>
                                            * { box-sizing: border-box; }
                                            body { 
                                                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                                                font-size: 15px; 
                                                line-height: 1.6; 
                                                color: #1f2937;
                                                margin: 0;
                                                padding: 40px;
                                                max-width: 900px;
                                                margin-left: auto;
                                                margin-right: auto;
                                                background-color: #ffffff;
                                                word-wrap: break-word;
                                                overflow-wrap: break-word;
                                            }
                                            img { 
                                                max-width: 100% !important; 
                                                height: auto !important; 
                                                border-radius: 12px;
                                                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                                                margin: 1rem 0;
                                            }
                                            a { color: #2563eb; text-decoration: none; font-weight: 600; }
                                            a:hover { text-decoration: underline; }
                                            table { max-width: 100% !important; border-collapse: collapse; }
                                            blockquote {
                                                border-left: 4px solid #e5e7eb;
                                                margin: 1.5rem 0;
                                                padding-left: 1.5rem;
                                                color: #6b7280;
                                                font-style: italic;
                                            }
                                            /* Fix for some emails with huge font sizes */
                                            @media only screen and (max-width: 600px) {
                                                body { padding: 20px; }
                                            }
                                        </style>
                                    </head>
                                    <body>${email.bodyHtml}</body>
                                </html>
                            `}
                            className="w-full h-full border-none"
                            title="Email Content"
                            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                        />
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto bg-gray-50/30">
                        <div className="max-w-4xl mx-auto p-12 bg-white min-h-full shadow-sm border-x border-gray-100/50">
                            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap select-text font-mono opacity-90">
                                {email.body}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Attachments & Actions Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50">
                {email.attachments && email.attachments.length > 0 && (
                    <div className="mb-6">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Prílohy ({email.attachments.length})</p>
                        <div className="flex flex-wrap gap-2">
                            {email.attachments.map(att => (
                                <button
                                    key={att.id}
                                    onClick={() => handleDownload(att)}
                                    disabled={!!downloading}
                                    className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-md transition-all group disabled:opacity-50 text-left"
                                >
                                    {downloading === att.id ? (
                                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <Paperclip className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                                    )}
                                    <div>
                                        <p className="text-sm font-bold text-gray-900 truncate max-w-[200px]">{att.filename}</p>
                                        <p className="text-[10px] text-gray-500 font-medium">{(att.size / 1024).toFixed(0)} KB</p>
                                    </div>
                                    <Download className="w-4 h-4 text-gray-300 group-hover:text-blue-500 ml-2" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex gap-4">
                    <button className="flex-1 h-12 bg-gray-900 text-white rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-black hover:scale-[1.02] active:scale-95 transition-all text-xs flex items-center justify-center gap-2">
                        <MessageSquare className="w-4 h-4" /> Odpovedať
                    </button>
                    <button
                        className="flex-1 h-12 bg-white border border-gray-200 text-gray-900 rounded-xl font-black uppercase tracking-widest hover:bg-gray-50 hover:border-gray-300 active:scale-95 transition-all text-xs flex items-center justify-center gap-2"
                    >
                        Preposlať
                    </button>
                </div>
            </div>
        </div>
    );
}

// Subcomponent: Quick Composer
function QuickComposerModal({ isOpen, onClose, initialContent, recruitName, onSend }: any) {
    const [content, setContent] = React.useState(initialContent);

    React.useEffect(() => {
        setContent(initialContent);
    }, [initialContent]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <Sparkles className="w-4 h-4" />
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">AI Koncept Odpovede</h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pre: {recruitName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors"><X className="w-4 h-4 text-gray-400" /></button>
                </div>

                <div className="p-6">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-64 p-4 bg-gray-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-xl resize-none outline-none text-sm text-gray-700 font-medium leading-relaxed transition-all"
                        placeholder="Sem napíšte odpoveď..."
                        autoFocus
                    />
                </div>

                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest hover:bg-white transition-all">Zrušiť</button>
                    <button
                        onClick={() => onSend(content)}
                        className="px-6 py-3 rounded-xl bg-gray-900 text-white font-black text-xs uppercase tracking-widest hover:bg-black shadow-xl transition-all flex items-center gap-2 active:scale-95"
                    >
                        <MessageSquare className="w-4 h-4" /> Odoslať
                    </button>
                </div>
            </div>
        </div>
    );
}
