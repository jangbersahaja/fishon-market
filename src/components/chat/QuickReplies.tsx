"use client";

import { Button } from "@/components/ui/button";

interface QuickRepliesProps {
  replies: string[];
  onReplyClick: (reply: string) => void;
  isLoading?: boolean;
}

const DEFAULT_QUICK_REPLIES = [
  "Thank you!",
  "Got it, thanks",
  "Can you provide more details?",
  "I have a question about equipment",
  "What time should I arrive?",
];

/**
 * QuickReplies Component
 *
 * Displays pre-defined quick reply buttons for common responses
 * Helps users reply faster without typing
 */
export function QuickReplies({
  replies = DEFAULT_QUICK_REPLIES,
  onReplyClick,
  isLoading = false,
}: QuickRepliesProps) {
  return (
    <div className="px-4 py-2 border-t bg-gray-50">
      <p className="text-xs text-gray-600 mb-2">Quick replies:</p>
      <div className="flex flex-wrap gap-2">
        {replies.map((reply) => (
          <Button
            key={reply}
            variant="outline"
            size="sm"
            onClick={() => onReplyClick(reply)}
            disabled={isLoading}
            className="text-xs"
          >
            {reply}
          </Button>
        ))}
      </div>
    </div>
  );
}
