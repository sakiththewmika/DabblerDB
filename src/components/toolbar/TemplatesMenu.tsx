import React, { useState } from 'react';
import { Building2, FileText, LayoutTemplate, ShoppingBag } from 'lucide-react';
import { useSchemaStore } from '../../store/useSchemaStore';
import { STARTER_TEMPLATES } from '../../data/starterTemplates';
import { MenuItem, ToolbarMenu } from './ToolbarMenu';

const TEMPLATE_ICONS: Record<string, React.ReactNode> = {
  ecommerce: <ShoppingBag className="w-3.5 h-3.5" />,
  saas: <Building2 className="w-3.5 h-3.5" />,
  blog: <FileText className="w-3.5 h-3.5" />,
};

export const TemplatesMenu: React.FC = () => {
  const loadTemplate = useSchemaStore((s) => s.loadTemplate);
  const [open, setOpen] = useState(false);

  return (
    <ToolbarMenu
      open={open}
      onOpenChange={setOpen}
      icon={<LayoutTemplate className="w-3.5 h-3.5 text-accent" />}
      label="Templates"
      title="Browse Starter Database Templates"
      heading="Starter Schemas"
      widthClass="w-64"
    >
      {STARTER_TEMPLATES.map((tpl) => (
        <MenuItem
          key={tpl.id}
          tone="accent"
          icon={TEMPLATE_ICONS[tpl.id]}
          title={tpl.name}
          subtitle={tpl.description}
          onClick={() => {
            loadTemplate(tpl.id);
            setOpen(false);
          }}
        />
      ))}
    </ToolbarMenu>
  );
};
