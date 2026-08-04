"use client";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { useEditor } from "../context/EditorContext";
import EvidenceUploader from "./EvidenceUploader";

function SortableEvidenceCard({
  item,
  onRemove,
  isEditing,
}: { item: any; onRemove: (id: string) => void; isEditing: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="overflow-hidden shadow-sm hover:shadow-md transition-shadow relative group"
    >
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-10">
        <Button
          variant="secondary"
          size="sm"
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing"
        >
          Drag
        </Button>
        {isEditing && (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onRemove(item.id)}
          >
            Remove
          </Button>
        )}
      </div>
      <div className="aspect-video bg-zinc-200 dark:bg-zinc-800 relative">
        {item.thumbnail_url ? (
          <img
            src={item.thumbnail_url}
            alt={item.caption || "Evidence"}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-zinc-400">
            [{item.media_type}]
          </div>
        )}
      </div>
      <div
        className="p-2 text-xs truncate"
        title={item.caption || item.source_url}
      >
        {item.caption || item.source_url}
      </div>
    </Card>
  );
}

export default function EvidenceBoardPanel() {
  const { evidenceQueue, updateEvidenceOrder, removeEvidence, isEditing } =
    useEditor();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = evidenceQueue.findIndex((i) => i.id === active.id);
      const newIndex = evidenceQueue.findIndex((i) => i.id === over.id);

      const newArray = arrayMove(evidenceQueue, oldIndex, newIndex);
      // Update display order internally for UI predictability, though backend uses array index
      const reordered = newArray.map((item, idx) => ({
        ...item,
        display_order: idx,
      }));
      updateEvidenceOrder(reordered);
    }
  };

  return (
    <Card className="flex flex-col h-full overflow-hidden bg-zinc-100 dark:bg-zinc-950/50">
      <div className="p-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center">
        <h3 className="font-semibold">Evidence Board</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsModalOpen(true)}
        >
          + Add Evidence
        </Button>
      </div>

      <div className="flex-grow overflow-y-auto p-4">
        {evidenceQueue.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-500 flex-col gap-2">
            <p>No evidence attached yet.</p>
            <p className="text-sm text-center max-w-xs">
              All media must be added here to maintain a structured
              investigation record.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={evidenceQueue.map((i) => i.id)}
              strategy={rectSortingStrategy}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {evidenceQueue.map((item) => (
                  <SortableEvidenceCard
                    key={item.id}
                    item={item}
                    onRemove={removeEvidence}
                    isEditing={isEditing}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <EvidenceUploader
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </Card>
  );
}
