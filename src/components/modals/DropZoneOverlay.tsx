import React, { useEffect, useState } from 'react';
import { FileUp } from 'lucide-react';
import { importFile } from '../../utils/importFiles';
import { toast } from '../../store/useToastStore';

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/** Full-screen "drop a file" hint. Dropping a .sql or .json file anywhere imports it. */
export const DropZoneOverlay: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    // dragenter/dragleave also fire for child elements, so count them
    let depth = 0;

    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setIsDragging(true);
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setIsDragging(false);
    };
    const onOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // required to allow dropping
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); // stop the browser from opening the file
      depth = 0;
      setIsDragging(false);

      const files = Array.from(e.dataTransfer?.files ?? []);
      if (files.length === 0) return;
      if (files.length > 1) toast.info('Only one file can be imported at a time', { details: [`Importing "${files[0].name}".`] });
      void importFile(files[0]);
    };

    window.addEventListener('dragenter', onEnter);
    window.addEventListener('dragleave', onLeave);
    window.addEventListener('dragover', onOver);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onEnter);
      window.removeEventListener('dragleave', onLeave);
      window.removeEventListener('dragover', onOver);
      window.removeEventListener('drop', onDrop);
    };
  }, []);

  if (!isDragging) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 px-10 py-8 rounded-2xl border-2 border-dashed border-accent bg-card/95 shadow-2xl">
        <FileUp className="w-9 h-9 text-accent" />
        <p className="text-sm font-semibold text-foreground">Drop a .sql or .json file to import</p>
        <p className="text-xs text-muted-foreground">It will replace the current canvas (you can undo)</p>
      </div>
    </div>
  );
};
