// components/chat/EntityTag.tsx
'use client';

import { ENTITY_CONFIG, EntityType } from '@/lib/entity-tags';
import { useContactPreview } from '@/components/providers/ContactPreviewProvider';
import { useProjectPreview } from '@/components/providers/ProjectPreviewProvider';

interface EntityTagProps {
  type: EntityType;
  id: string;
  label: string;
}

export function EntityTag({ type, id, label }: EntityTagProps) {
  const config = ENTITY_CONFIG[type];
  
  // Use context for opening details
  let openContact: ((id: string | number) => void) | undefined;
  let openProject: ((id: string | number) => void) | undefined;

  try {
    const contactCtx = useContactPreview();
    openContact = contactCtx.openContact;
  } catch (e) {}

  try {
    const projectCtx = useProjectPreview();
    openProject = projectCtx.openProject;
  } catch (e) {}

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    switch (type) {
      case 'contact': 
        if (openContact) openContact(id); 
        break;
      case 'project': 
      case 'deal':    
        if (openProject) openProject(id); 
        break;
      case 'note':
      case 'task':
      case 'file':
        import('sonner').then(({ toast }) => {
          toast.info(`Detail pre ${type} #${id} bude čoskoro dostupný v globálnom náhľade.`);
        });
        break;
      default:
        console.log(`[EntityTag] No handler for type: ${type}, id: ${id}`);
    }
  };

  // Determine which global mention class to use for standard types
  const getMentionClass = () => {
    if (type === 'contact') return 'mention-tag-contact';
    if (type === 'project') return 'mention-tag-project';
    if (type === 'deal') return 'mention-tag-project'; // Use project style for deals
    return '';
  };

  const mentionClass = getMentionClass();

  return (
    <span
      onClick={handleClick}
      data-entity-type={type}
      data-entity-id={id}
      className={`
        inline-flex items-center gap-1.5 px-3 py-1
        rounded-full text-[11px] font-black tracking-tight transition-all cursor-pointer
        border select-none my-0.5 mx-0.5
        ${config.color} ${config.textColor} ${config.borderColor}
        hover:brightness-125 hover:scale-105 hover:shadow-lg hover:shadow-violet-900/20
        active:scale-95 duration-200
        backdrop-blur-sm
      `}
      title={`Zobraziť detail: ${label}`}
    >
      <span className="text-[12px] filter drop-shadow-sm">{config.icon}</span>
      <span className="uppercase tracking-wider">{label}</span>
    </span>
  );
}
