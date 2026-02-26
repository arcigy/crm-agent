import { MarkdownRenderer } from './MarkdownRenderer';
import { formatDistanceToNow } from 'date-fns';
import { sk } from 'date-fns/locale';
import { Copy, Check } from 'lucide-react';
import React, { useState } from 'react';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  isStreaming?: boolean;
}

export function ChatBubble({ role, content, createdAt, isStreaming }: ChatBubbleProps) {
  const isUser = role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start mb-6 group`}>
      <div className={`
        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
        ${isUser 
          ? 'bg-emerald-600 text-white' 
          : 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
        }
      `}>
        {isUser ? 'TY' : 'AI'}
      </div>

      <div className={`
        relative
        ${isUser 
          ? 'max-w-[80%] rounded-2xl px-4 py-3 bg-emerald-600 text-white rounded-tr-sm' 
          : 'flex-1 text-gray-100 mt-1 overflow-x-auto custom-scrollbar'
        }
      `}>
        <MarkdownRenderer content={content} role={role} />
        
        <div className={`flex items-center gap-3 mt-1.5`}>
          {createdAt && !isNaN(new Date(createdAt).getTime()) && (
            <div className={`text-xs ${isUser ? 'text-emerald-200' : 'text-gray-500'}`}>
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: sk })}
            </div>
          )}
          
          <button 
            onClick={handleCopy}
            className={`
              opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md
              hover:bg-white/10 text-gray-400 hover:text-white
              ${isUser ? 'order-first' : ''}
            `}
            title="Kopírovať správu"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {isStreaming && (
          <div className="flex gap-1 mt-2">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
        )}
      </div>
    </div>
  );
}
