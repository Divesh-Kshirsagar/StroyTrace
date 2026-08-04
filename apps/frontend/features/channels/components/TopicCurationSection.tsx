"use client";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  type TopicSchema,
  appsTopicsRoutersListTopics,
  appsUsersRoutersSetMyTopics,
} from "@/generated";
import TopicBadge from "@/shared/components/TopicBadge";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { useEffect, useState } from "react";

interface TopicCurationSectionProps {
  channelHandle: string;
  initialTopics: TopicSchema[];
}

export default function TopicCurationSection({
  channelHandle,
  initialTopics,
}: TopicCurationSectionProps) {
  const [topics, setTopics] = useState<TopicSchema[]>(initialTopics);
  const [isOwner, setIsOwner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [allTopics, setAllTopics] = useState<TopicSchema[]>([]);
  const [selectedTopicSlugs, setSelectedTopicSlugs] = useState<Set<string>>(
    new Set(initialTopics.map((t) => t.slug)),
  );
  const [isSaving, setIsSaving] = useState(false);
  const { creatorProfile } = useAuth();

  // Check if current user is owner
  useEffect(() => {
    if (creatorProfile && creatorProfile.handle === channelHandle) {
      setIsOwner(true);
    } else {
      setIsOwner(false);
    }
  }, [channelHandle, creatorProfile]);

  const handleOpenModal = async () => {
    setShowModal(true);
    // Reset selection to current saved topics
    setSelectedTopicSlugs(new Set(topics.map((t) => t.slug)));

    if (allTopics.length === 0) {
      try {
        const { data: fetchedTopics } = await appsTopicsRoutersListTopics();
        if (fetchedTopics) setAllTopics(fetchedTopics);
      } catch (e) {
        console.error("Failed to fetch topics", e);
      }
    }
  };

  const toggleTopic = (slug: string) => {
    const newSelected = new Set(selectedTopicSlugs);
    if (newSelected.has(slug)) {
      newSelected.delete(slug);
    } else {
      if (newSelected.size >= 10) {
        alert("You can only select up to 10 topics.");
        return;
      }
      newSelected.add(slug);
    }
    setSelectedTopicSlugs(newSelected);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const slugsArray = Array.from(selectedTopicSlugs);
      await appsUsersRoutersSetMyTopics({
        body: { topic_slugs: slugsArray },
      } as any);

      // Update local state by finding the full TopicSchema objects from allTopics
      const updatedTopics = allTopics.filter((t) =>
        slugsArray.includes(t.slug),
      );
      setTopics(updatedTopics);
      setShowModal(false);
    } catch (e) {
      console.error(e);
      alert("Failed to save topics");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
          Curated Topics
        </h3>
        {isOwner && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenModal}
            className="h-6 text-xs px-2 py-0"
          >
            Edit Topics
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {topics.length > 0 ? (
          topics.map((topic) => <TopicBadge key={topic.slug} topic={topic} />)
        ) : (
          <p className="text-zinc-500 text-sm italic">
            This creator hasn't curated any topics yet.
          </p>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Curated Topics</DialogTitle>
            <DialogDescription>
              Select up to 10 topics that you cover. These will be displayed on
              your public profile.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 my-4">
            {allTopics.map((topic) => (
              <label
                key={topic.slug}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer transition-colors border-zinc-200 dark:border-zinc-800"
              >
                <Checkbox
                  checked={selectedTopicSlugs.has(topic.slug)}
                  onCheckedChange={() => toggleTopic(topic.slug)}
                  className="mt-1"
                />
                <div className="flex flex-col">
                  <span className="font-semibold text-sm">{topic.name}</span>
                  <span className="text-xs text-zinc-500">
                    {topic.description}
                  </span>
                </div>
              </label>
            ))}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Topics"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
