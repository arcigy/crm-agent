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
                {value || 'Pridať komentár...'}
            </span>
            {status === 'saving' && <Loader2 className="w-3 h-3 text-blue-500 animate-spin" />}
            {status === 'saved' && <Check className="w-3 h-3 text-green-500" />}
            {(!status || status === 'idle') && (
                <Plus className="w-3 h-3 text-gray-300 opacity-0 group-hover/comment:opacity-100" />
            )}
        </div>
    );
}
