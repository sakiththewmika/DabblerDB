import { useEffect } from 'react';
import { useSchemaStore } from '../store/useSchemaStore';

export function useKeyboardShortcuts(): void {
  const {
    undo,
    redo,
    addTable,
    duplicateTable,
    deleteTable,
    selectedTableId,
    setSelectedTableId,
    isShortcutsModalOpen,
    setIsShortcutsModalOpen,
  } = useSchemaStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if target is an interactive form element or editable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Escape key works everywhere to close modals or deselect
      if (e.key === 'Escape') {
        if (isShortcutsModalOpen) {
          setIsShortcutsModalOpen(false);
          return;
        }
        if (selectedTableId) {
          setSelectedTableId(null);
          return;
        }
      }

      // If typing inside an input/textarea, do not intercept other shortcuts
      if (isInput) return;

      const isMod = e.metaKey || e.ctrlKey;

      // Mod + Z: Undo
      if (isMod && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return;
      }

      // Mod + Shift + Z or Mod + Y: Redo
      if ((isMod && e.shiftKey && e.key.toLowerCase() === 'z') || (isMod && e.key.toLowerCase() === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      // Mod + K or /: Focus top search input
      if ((isMod && e.key.toLowerCase() === 'k') || e.key === '/') {
        e.preventDefault();
        const searchInput = document.getElementById('top-search-input') as HTMLInputElement | null;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
        return;
      }

      // Shift + N: Create new table
      if (e.shiftKey && e.key.toUpperCase() === 'N') {
        e.preventDefault();
        addTable();
        return;
      }

      // Mod + D: Duplicate selected table
      if (isMod && e.key.toLowerCase() === 'd') {
        if (selectedTableId) {
          e.preventDefault();
          duplicateTable(selectedTableId);
        }
        return;
      }

      // Delete or Backspace: Delete selected table
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedTableId) {
          e.preventDefault();
          deleteTable(selectedTableId);
        }
        return;
      }

      // ?: Toggle keyboard shortcuts modal
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsModalOpen(!isShortcutsModalOpen);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    addTable,
    duplicateTable,
    deleteTable,
    selectedTableId,
    setSelectedTableId,
    isShortcutsModalOpen,
    setIsShortcutsModalOpen,
  ]);
}

