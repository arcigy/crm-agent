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
      className={`mention-tag ${mentionClass} ${!mentionClass ? `${config.color} ${config.textColor} ${config.borderColor}` : ''}`}
      title={`Otvoriť ${type}: ${label}`}
    >
      <span className="text-[10px]">{config.icon}</span>
      <span>{config.prefix}{label}</span>
    </span>
  );
}
