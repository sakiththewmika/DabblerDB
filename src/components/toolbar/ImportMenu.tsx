import React, { useRef, useState } from 'react';
import { FileCode, FileJson, Upload } from 'lucide-react';
import { importFile } from '../../utils/importFiles';
import { MenuItem, ToolbarMenu } from './ToolbarMenu';

export const ImportMenu: React.FC = () => {
  const [open, setOpen] = useState(false);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const sqlInputRef = useRef<HTMLInputElement>(null);

  const pick = (input: React.RefObject<HTMLInputElement | null>) => {
    setOpen(false);
    input.current?.click();
  };

  // Both inputs go through the same importer, which checks the file type and size
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void importFile(file);
    e.target.value = '';
  };

  return (
    <>
      <input ref={jsonInputRef} type="file" accept=".json" onChange={onFile} className="hidden" />
      <input ref={sqlInputRef} type="file" accept=".sql,.txt" onChange={onFile} className="hidden" />

      <ToolbarMenu
        open={open}
      onOpenChange={setOpen}
        icon={<Upload className="w-3.5 h-3.5 text-accent" />}
        label="Import"
        title="Import Schema (JSON / SQL)"
        heading="Import Schema"
      >
        <MenuItem
          tone="amber"
          icon={<FileJson className="w-3.5 h-3.5" />}
          title="JSON Workspace"
          subtitle="Full project backup (.json)"
          onClick={() => pick(jsonInputRef)}
        />
        <MenuItem
          tone="blue"
          icon={<FileCode className="w-3.5 h-3.5" />}
          title="SQL DDL Script"
          subtitle="Parse CREATE TABLE (.sql)"
          onClick={() => pick(sqlInputRef)}
        />
      </ToolbarMenu>
    </>
  );
};
