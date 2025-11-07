"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, MoreVertical } from "lucide-react";

interface ChatHeaderProps {
  otherUserName: string;
  isOnline?: boolean;
  onBack?: () => void;
}

/**
 * ChatHeader Component
 *
 * Top bar of chat interface with back button and user info
 */
export function ChatHeader({
  otherUserName,
  isOnline = false,
  onBack,
}: ChatHeaderProps) {
  return (
    <div className="h-16 border-b bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="flex-shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>

        <div>
          <h2 className="font-semibold text-gray-900">{otherUserName}</h2>
          <p className="text-xs text-gray-500">
            {isOnline ? "🟢 Online" : "Away"}
          </p>
        </div>
      </div>

      <Button variant="ghost" size="icon" className="flex-shrink-0">
        <MoreVertical className="w-5 h-5" />
      </Button>
    </div>
  );
}
