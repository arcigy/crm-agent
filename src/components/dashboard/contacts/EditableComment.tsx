'use client';

import * as React from 'react';
import { Plus, Check, Loader2 } from 'lucide-react';
import { updateContactComments } from '@/app/actions/contacts';
import { toast } from 'sonner';

export function EditableComment({ id, initialValue }: { id: number; initialValue: string }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const [value, setValue] = React.useState(initialValue);
    const [status, setStatus] = React.useState<'idle' | 'saving' | 'saved'>('idle');

    const handleSave = async () => {
        if (value === initialValue) {
            setIsEditing(false);
            return;
        }

        setIsEditing(false); // Close immediately as requested
        setStatus('saving');
        try {
            const result = await updateContactComments(id, value);
            if (result.success) {
                setStatus('saved');
                setTimeout(() => setStatus('idle'), 1500); // Checkmark for 1.5s
            } else {
                setStatus('idle');
                toast.error(result.error || 'Nepodarilo sa uložiť komentár');
            }
        } catch (error) {
            console.error('Failed to save comment:', error);
            setStatus('idle');
            toast.error('Chyba pri ukladaní');
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center min-h-[32px] w-full max-w-[250px] -ml-3 px-3">
                <input
                    autoFocus
                    className="text-[11px] font-[900] uppercase tracking-wider bg-white/5 border-b border-violet-500 text-white outline-none w-full py-1 placeholder:text-zinc-600 transition-all caret-violet-500"
                    placeholder="NAPÍŠTE POZNÁMKU..."
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
            className="group/comment flex items-center gap-2 cursor-pointer min-h-[32px] px-3 py-1 -ml-3 rounded-xl hover:bg-white/5 transition-all w-full max-w-[250px]"
            onClick={() => setIsEditing(true)}
        >
            <span className={`text-[11px] font-[900] uppercase tracking-wider truncate transition-colors ${value ? 'text-zinc-400 group-hover/comment:text-white' : 'text-zinc-500 italic opacity-50'}`}>
                {value || 'Pridať poznámku...'}
            </span>
            {status === 'saving' && <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />}
            {status === 'saved' && <Check className="w-3.5 h-3.5 text-emerald-500" />}
            {status === 'idle' && (
                <Plus className="w-3.5 h-3.5 text-violet-400 opacity-0 group-hover/comment:opacity-100 transform scale-0 group-hover/comment:scale-100 transition-all" />
            )}
        </div>
    );
}
