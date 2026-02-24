'use client';

import { MarkdownRenderer } from './MarkdownRenderer';
import { formatDistanceToNow } from 'date-fns';
import { sk } from 'date-fns/locale';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  isStreaming?: boolean;
}

export function ChatBubble({ role, content, createdAt, isStreaming }: ChatBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-start mb-6`}>
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
        max-w-[80%] rounded-2xl px-4 py-3
        ${isUser 
          ? 'bg-emerald-600 text-white rounded-tr-sm' 
          : 'bg-gray-800 text-gray-100 rounded-tl-sm border border-gray-700'
        }
      `}>
        <MarkdownRenderer content={content} role={role} />
        
        {createdAt && (
          <div className={`text-xs mt-1.5 ${isUser ? 'text-emerald-200' : 'text-gray-500'}`}>
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: sk })}
          </div>
        )}

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
