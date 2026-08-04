"use client";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { useEffect, useState } from "react";

export default function SubscribeForm({
  channelHandle,
}: { channelHandle: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  // Check local storage on mount to see if already subscribed
  useEffect(() => {
    try {
      const subs = JSON.parse(
        localStorage.getItem("clarity_subscriptions") || "{}",
      );
      if (subs[channelHandle]) {
        setStatus("success");
      }
    } catch (e) {}
  }, [channelHandle]);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus("loading");

    // Simulate API delay
    setTimeout(() => {
      try {
        const subs = JSON.parse(
          localStorage.getItem("clarity_subscriptions") || "{}",
        );
        subs[channelHandle] = [...(subs[channelHandle] || []), email];
        localStorage.setItem("clarity_subscriptions", JSON.stringify(subs));
        setStatus("success");
        setEmail("");
      } catch (err) {
        setStatus("error");
      }
    }, 600);
  };

  if (status === "success") {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 p-4 rounded-xl border border-green-200 dark:border-green-800/30 flex items-center gap-3">
        <svg
          className="w-5 h-5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span className="font-medium">
          You are subscribed to @{channelHandle}. We'll email you when new
          investigations are published.
        </span>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubscribe}
      className="bg-zinc-50 dark:bg-zinc-900/50 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800/50"
    >
      <h3 className="text-lg font-bold mb-2">Subscribe to @{channelHandle}</h3>
      <p className="text-sm text-zinc-500 mb-4">
        Get notified directly in your inbox when new investigations drop.
      </p>

      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="max-w-xs"
          disabled={status === "loading"}
        />
        <Button type="submit" disabled={status === "loading" || !email}>
          {status === "loading" ? "Subscribing..." : "Subscribe"}
        </Button>
      </div>
      {status === "error" && (
        <p className="text-red-500 text-sm mt-2">
          Failed to subscribe. Please try again.
        </p>
      )}
    </form>
  );
}
