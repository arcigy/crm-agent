'use client';

import * as React from 'react';
import { updateContact } from '@/app/actions/contacts/mutate';
import { toast } from 'sonner';

interface InlineEditableCellProps {
    id: number;
    initialValue: string;
    field: 'first_name' | 'last_name' | 'email' | 'phone' | 'company' | 'comments';
    placeholder?: string;
    className?: string;
}

export function InlineEditableCell({ id, initialValue, field, placeholder, className = '' }: InlineEditableCellProps) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [value, setValue] = React.useState(initialValue);
    const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');

    const handleSave = async () => {
        if (value === initialValue) {
            setIsEditing(false);
            return;
        }

        setIsEditing(false);
        setStatus('saving');
        try {
            const result = await updateContact(id, { [field]: value });
            if (result.success) {
                setStatus('saved');
                setTimeout(() => setStatus('idle'), 1500);
            } else {
                setStatus('idle');
                toast.error(result.error || 'Nepodarilo sa uložiť');
                setValue(initialValue);
            }
        } catch (error) {
            console.error(`Failed to save ${field}:`, error);
            setStatus('idle');
            toast.error('Chyba pri ukladaní');
            setValue(initialValue);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center min-h-[32px] w-full px-1">
                <input
                    autoFocus
                    className={`text-[13px] font-bold bg-white/5 border-b border-violet-500 text-white outline-none w-full py-0.5 placeholder:text-zinc-600 transition-all caret-violet-500 ${className}`}
                    placeholder={placeholder || 'NAPÍŠTE...'}
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
            className={`group/inline flex items-center cursor-pointer min-h-[32px] px-1 rounded-lg hover:bg-white/10 transition-all w-full border border-transparent hover:border-white/5 ${status === 'saving' ? 'opacity-50 pointer-events-none' : ''}`}
            onClick={() => setIsEditing(true)}
        >
            <span className={`text-[13px] font-bold transition-all truncate block ${value ? 'text-zinc-100 group-hover/inline:text-white' : 'text-white/0 group-hover/inline:text-white/20 italic'} ${className}`}>
                {value || placeholder || '...'}
            </span>
            {status === 'saving' && <div className="ml-2 w-2 h-2 rounded-full bg-violet-500 animate-pulse shrink-0" />}
            {status === 'saved' && <div className="ml-2 w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
            {!value && status === 'idle' && (
                <div className="ml-auto opacity-0 group-hover/inline:opacity-50 text-[10px] text-violet-400">
                    +
                </div>
            )}
        </div>
    );
}
