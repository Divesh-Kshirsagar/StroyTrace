'use client';
import { useEditor } from '../context/EditorContext';
import { useEditor as useTipTap, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Card } from '@/shared/components/ui/card';
import { useEffect, useRef } from 'react';

export default function NarrativeEditorPanel() {
  const { event, narrative, setNarrativeContent, saveNarrative } = useEditor();
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    if (narrative.isDirty && !narrative.isSaving && event) {
      saveTimeoutRef.current = setTimeout(() => {
        saveNarrative();
      }, 2000);
    }
    return () => clearTimeout(saveTimeoutRef.current);
  }, [narrative.content, narrative.isDirty, narrative.isSaving, event]);

  const editor = useTipTap({
    extensions: [
      StarterKit,
      // Link.configure({ openOnClick: false }), // Removed due to duplicate extension name warning
    ],
    immediatelyRender: false,
    content: narrative.content,
    onUpdate: ({ editor }) => {
      setNarrativeContent(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[50vh] p-4',
      },
    },
  });

  return (
    <Card className="flex flex-col h-full overflow-hidden border-r border-zinc-200 dark:border-zinc-800">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center">
        <h3 className="font-semibold">Narrative</h3>
        <span className="text-xs font-medium text-zinc-500">
          {narrative.isSaving ? 'Saving...' : narrative.isDirty ? 'Unsaved changes' : 'Saved'}
        </span>
      </div>
      
      {/* Editor Toolbar (Basic) */}
      <div className="flex gap-2 p-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
        <button 
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`px-2 py-1 rounded text-sm ${editor?.isActive('bold') ? 'bg-zinc-200 dark:bg-zinc-800' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
        >
          Bold
        </button>
        <button 
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 rounded text-sm ${editor?.isActive('italic') ? 'bg-zinc-200 dark:bg-zinc-800' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
        >
          Italic
        </button>
        <button 
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-2 py-1 rounded text-sm ${editor?.isActive('heading', { level: 2 }) ? 'bg-zinc-200 dark:bg-zinc-800' : 'hover:bg-zinc-100 dark:hover:bg-zinc-900'}`}
        >
          H2
        </button>
      </div>

      <div className="flex-grow overflow-y-auto bg-white dark:bg-zinc-950">
        <EditorContent editor={editor} />
      </div>
    </Card>
  );
}
