'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import 'highlight.js/styles/github-dark.css';
import { ComponentProps } from 'react';

import { splitIntoSegments } from '@/lib/entity-tags';
import { EntityTag } from './EntityTag';
import { Fragment } from 'react';

interface MarkdownRendererProps {
  content: string;
  role: 'user' | 'assistant';
}

// Transformácia textu s tagmi → React elementy
function renderTextWithTags(text: string): React.ReactNode {
  const segments = splitIntoSegments(text);

  // Ak žiadne tagy — vráť čistý text
  if (segments.length === 1 && segments[0].type === 'text') {
    return text;
  }

  return (
    <Fragment>
      {segments.map((segment, i) => {
        if (segment.type === 'text') {
          return <Fragment key={i}>{segment.content}</Fragment>;
        }
        return (
          <EntityTag
            key={i}
            type={segment.tag.type}
            id={segment.tag.id}
            label={segment.tag.label}
          />
        );
      })}
    </Fragment>
  );
}

// Helper — spracuj children React nodes a nájdi text nodes na transformáciu
function processChildren(children: React.ReactNode): React.ReactNode {
  if (!children) return children;

  return React.Children.map(children, (child) => {
    if (typeof child === 'string') {
      return renderTextWithTags(child);
    }
    return child;
  });
}

export function MarkdownRenderer({ content, role }: MarkdownRendererProps) {
  if (role === 'user') {
    return (
      <p className="text-sm text-white whitespace-pre-wrap leading-relaxed">
        {content}
      </p>
    );
  }

  return (
    <div className="prose prose-sm prose-invert max-w-none
      prose-headings:font-semibold prose-headings:text-white
      prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
      prose-p:text-gray-200 prose-p:leading-7 prose-p:my-2
      prose-li:text-gray-200 prose-li:my-1
      prose-ul:my-2 prose-ol:my-2
      prose-ul:list-disc prose-ol:list-decimal
      prose-code:text-emerald-400 prose-code:bg-gray-800 
      prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
      prose-pre:bg-gray-900 prose-pre:border prose-pre:border-gray-700
      prose-pre:rounded-xl prose-pre:my-3
      prose-blockquote:border-l-4 prose-blockquote:border-emerald-500
      prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-400
      prose-strong:text-white prose-strong:font-semibold
      prose-em:text-gray-300
      prose-table:text-sm prose-th:text-white prose-td:text-gray-300
      prose-th:bg-gray-800 prose-tr:border-gray-700
      prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
      prose-hr:border-gray-700
    ">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          pre: ({ children, ...props }) => (
            <CodeBlock {...props}>{children}</CodeBlock>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          input: ({ checked }) => (
            <input
              type="checkbox"
              checked={checked}
              readOnly
              className="mr-2 accent-emerald-500"
            />
          ),
          // Every text container node passes through tag processor
          p: ({ children }) => <p>{processChildren(children)}</p>,
          li: ({ children }) => <li>{processChildren(children)}</li>,
          td: ({ children }) => <td>{processChildren(children)}</td>,
          span: ({ children }) => <span>{processChildren(children)}</span>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function CodeBlock({ children, ...props }: ComponentProps<'pre'>) {
  const copyCode = () => {
    const code = (children as any)?.props?.children ?? '';
    navigator.clipboard.writeText(code);
  };

  return (
    <div className="relative group">
      <pre {...props} className="overflow-x-auto">
        {children}
      </pre>
      <button
        onClick={copyCode}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100
          transition-opacity bg-gray-700 hover:bg-gray-600
          text-gray-300 text-xs px-2 py-1 rounded"
      >
        Kopírovať
      </button>
    </div>
  );
}
