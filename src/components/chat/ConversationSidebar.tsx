'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { MessageSquare, Plus, Trash2, Pin, Menu } from 'lucide-react';

export interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  message_count: number;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  onDelete: (id: string) => Promise<void>;
  chatCount: number;
  maxChats: number;
  onClose?: () => void;
}

export function ConversationSidebar({
  conversations,
  onDelete,
  chatCount,
  maxChats,
  onClose
}: ConversationSidebarProps) {
  const router = useRouter();
  const params = useParams();
  const activeId = params?.id as string;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    
    try {
      await onDelete(id);
      if (activeId === id) router.push('/chat');
    } finally {
      setDeletingId(null);
    }
  };

  const isAtLimit = chatCount >= maxChats;

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full flex-shrink-0 transition-all duration-300">
      <div className="p-3">
        <div className="flex justify-between items-center mb-4 px-1">
          <span className="text-sm font-semibold text-gray-300">Konverzácie</span>
          {onClose && (
            <button 
              onClick={onClose} 
              className="p-1.5 hover:bg-gray-800 text-gray-400 hover:text-white rounded-lg transition-colors"
              title="Skryť panel"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={() => router.push('/chat')}
          disabled={isAtLimit}
          className={`
            w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium
            transition-all duration-150
            ${isAtLimit
              ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }
          `}
        >
          <Plus className="w-4 h-4" />
          Nová konverzácia
        </button>

        {isAtLimit && (
          <div className="mt-2 text-[11px] leading-tight text-red-400 bg-red-400/10 px-2.5 py-2 rounded-lg border border-red-500/20">
            Dosiahol si limit {maxChats} konverzácií. Vymaž staré chaty aby si mohol začať novú.
          </div>
        )}
        
        <div className="mt-2 px-1">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Konverzácie</span>
            <span className={chatCount >= maxChats * 0.8 ? 'text-orange-400' : ''}>
              {chatCount}/{maxChats}
            </span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1">
            <div
              className={`h-1 rounded-full transition-all ${
                chatCount >= maxChats ? 'bg-red-500' :
                chatCount >= maxChats * 0.8 ? 'bg-orange-400' : 'bg-emerald-500'
              }`}
              style={{ width: `${(chatCount / maxChats) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
        {conversations.length === 0 && (
          <div className="text-center text-gray-600 text-xs py-8">
            Žiadne konverzácie.<br />Začni novú!
          </div>
        )}

        {conversations.map(conv => (
          <div
            key={conv.id}
            onClick={() => router.push(`/chat/${conv.id}`)}
            className={`
              group flex items-center gap-2 px-3 py-2.5 rounded-xl cursor-pointer
              transition-all duration-100 text-sm
              ${activeId === conv.id
                ? 'bg-gray-700 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }
            `}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0 text-gray-500" />
            
            <span className="flex-1 truncate">{conv.title}</span>

            <button
              onClick={(e) => handleDelete(e, conv.id)}
              disabled={deletingId === conv.id}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg
                hover:bg-red-500/20 hover:text-red-400 text-gray-600
                transition-all duration-150"
            >
              {deletingId === conv.id 
                ? <span className="text-xs">...</span>
                : <Trash2 className="w-3.5 h-3.5" />
              }
            </button>
          </div>
        ))}
      </div>
    </aside>
  );
}
