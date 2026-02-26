// components/chat/EntityTag.tsx
'use client';

import { ENTITY_CONFIG, EntityType } from '@/lib/entity-tags';
import { useContactPreview } from '@/components/providers/ContactPreviewProvider';
import { useProjectPreview } from '@/components/providers/ProjectPreviewProvider';
import { useNotePreview } from '@/components/providers/NotePreviewProvider';
import { CheckCircle2, Circle } from 'lucide-react';
import React, { useState } from 'react';

interface EntityTagProps {
  type: EntityType;
  id: string;
  label: string;
}

export function EntityTag({ type, id, label }: EntityTagProps) {
  const config = ENTITY_CONFIG[type];
  const [isDone, setIsDone] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Use context for opening details
  let openContact: ((id: string | number) => void) | undefined;
  let openProject: ((id: string | number) => void) | undefined;
  let openNote: ((id: string | number) => void) | undefined;

  try {
    const contactCtx = useContactPreview();
    openContact = contactCtx.openContact;
  } catch (e) {}

  try {
    const projectCtx = useProjectPreview();
    openProject = projectCtx.openProject;
  } catch (e) {}

  try {
    const noteCtx = useNotePreview();
    openNote = noteCtx.openNote;
  } catch (e) {}

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isProcessing) return;

    switch (type) {
      case 'contact': 
        if (openContact) openContact(id); 
        break;
      case 'project': 
      case 'deal':    
        if (openProject) openProject(id); 
        break;
      case 'note':
        if (openNote) openNote(id);
        break;
      case 'task':
        if (isDone) {
          import('sonner').then(({ toast }) => toast.info('Úloha je už splnená.'));
          return;
        }
        setIsProcessing(true);
        try {
          const { executeDbTaskTool } = await import('@/app/actions/executors-tasks');
          const res = await executeDbTaskTool('db_complete_task', { task_id: id }, 'current_user_placeholder'); // The executor handles auth
          if (res.success) {
            setIsDone(true);
            import('sonner').then(({ toast }) => toast.success(`Úloha "${label}" bola splnená!`));
          } else {
            import('sonner').then(({ toast }) => toast.error('Nepodarilo sa splniť úlohu.'));
          }
        } catch (err) {
          import('sonner').then(({ toast }) => toast.error('Chyba pri plnení úlohy.'));
        } finally {
          setIsProcessing(false);
        }
        break;
      case 'file':
        import('sonner').then(({ toast }) => {
          toast.info(`Detail pre ${type} #${id} bude čoskoro dostupný v globálnom náhľade.`);
        });
        break;
      default:
        console.log(`[EntityTag] No handler for type: ${type}, id: ${id}`);
    }
  };

  return (
    <span
      onClick={handleClick}
      data-entity-type={type}
      data-entity-id={id}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1
        rounded-full text-[11px] font-black tracking-tight transition-all cursor-pointer
        border select-none my-0.5 mx-0.5
        ${isDone ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 line-through opacity-60' : `${config.color} ${config.textColor} ${config.borderColor}`}
        ${isProcessing ? 'animate-pulse cursor-wait' : 'hover:brightness-125 hover:scale-105 hover:shadow-lg hover:shadow-violet-900/20 active:scale-95'}
        duration-200 backdrop-blur-sm
      `}
      title={type === 'task' ? (isDone ? 'Splnené' : 'Klikni pre splnenie') : `Zobraziť detail: ${label}`}
    >
      <span className="text-[12px] filter drop-shadow-sm">
        {type === 'task' ? (isDone ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Circle className="w-3.5 h-3.5" />) : config.icon}
      </span>
      <span className="uppercase tracking-wider">{label}</span>
    </span>
  );
}
