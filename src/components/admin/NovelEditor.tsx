"use client";

import { Separator } from "@/components/ui/separator";
import {
  EditorBubble,
  EditorCommand,
  EditorCommandEmpty,
  EditorCommandItem,
  EditorCommandList,
  EditorContent,
  EditorRoot,
  ImageResizer,
  handleCommandNavigation,
  type EditorInstance,
  type JSONContent,
} from "novel";
import { useState } from "react";
import { defaultExtensions } from "./novel-extensions";
import { slashCommand, suggestionItems } from "./novel-slash-command";
import { LinkSelector } from "./novel/link-selector";
import { NodeSelector } from "./novel/node-selector";
import { TextButtons } from "./novel/text-buttons";

interface NovelEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function NovelEditor({ value, onChange }: NovelEditorProps) {
  // Parse initial content - expect either JSON or empty string
  const [initialContent] = useState<JSONContent>(() => {
    if (!value) return { type: "doc", content: [] };
    try {
      return JSON.parse(value) as JSONContent;
    } catch {
      // If parsing fails, treat as plain text
      return {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: value }] },
        ],
      };
    }
  });

  const [openNode, setOpenNode] = useState(false);
  const [openLink, setOpenLink] = useState(false);

  const extensions = [...defaultExtensions, slashCommand];

  const handleUpdate = (editor: EditorInstance) => {
    // Store as JSON for Novel compatibility
    const json = editor.getJSON();
    onChange(JSON.stringify(json));
  };

  // Handle image upload
  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "content");

    const response = await fetch("/api/blog/upload-image", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }

    return data.url;
  };

  // Handle paste event for images
  const handlePaste = (view: any, event: ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return false;

    for (const item of Array.from(items)) {
      if (item.type.indexOf("image") === 0) {
        event.preventDefault();
        const file = item.getAsFile();
        if (!file) continue;

        // Upload asynchronously
        uploadImage(file)
          .then((url) => {
            const { state } = view;
            const { selection } = state;
            const position = selection.$head.pos;

            view.dispatch(
              view.state.tr.insert(
                position,
                view.state.schema.nodes.image.create({ src: url })
              )
            );
          })
          .catch((error) => {
            console.error("Image paste upload error:", error);
            alert(
              error instanceof Error ? error.message : "Failed to upload image"
            );
          });

        return true;
      }
    }
    return false;
  };

  // Handle drop event for images
  const handleDrop = (
    view: any,
    event: DragEvent,
    _slice: any,
    moved: boolean
  ) => {
    if (!moved && event.dataTransfer?.files?.length) {
      const files = Array.from(event.dataTransfer.files);
      const imageFiles = files.filter(
        (file) => file.type.indexOf("image") === 0
      );

      if (imageFiles.length === 0) return false;

      event.preventDefault();

      const coordinates = view.posAtCoords({
        left: event.clientX,
        top: event.clientY,
      });

      if (!coordinates) return false;

      // Upload all images asynchronously
      imageFiles.forEach((file) => {
        uploadImage(file)
          .then((url) => {
            view.dispatch(
              view.state.tr.insert(
                coordinates.pos,
                view.state.schema.nodes.image.create({ src: url })
              )
            );
          })
          .catch((error) => {
            console.error("Image drop upload error:", error);
            alert(
              error instanceof Error ? error.message : "Failed to upload image"
            );
          });
      });

      return true;
    }
    return false;
  };

  return (
    <div className="overflow-hidden bg-white border border-gray-300 rounded-lg shadow-sm novel-editor-wrapper">
      <EditorRoot>
        <EditorContent
          initialContent={initialContent}
          extensions={extensions}
          className="relative min-h-[500px] w-full"
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event) => handleCommandNavigation(event),
            },
            handlePaste: handlePaste,
            handleDrop: handleDrop,
            attributes: {
              class:
                "prose prose-lg focus:outline-none max-w-none p-8 prose-headings:font-bold prose-headings:tracking-tight prose-a:text-[#ec2227] prose-a:no-underline hover:prose-a:underline prose-img:rounded-lg prose-ul:list-disc prose-ol:list-decimal prose-li:my-2 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-code:bg-gray-100 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100",
            },
          }}
          onUpdate={({ editor }) => handleUpdate(editor)}
          slotAfter={<ImageResizer />}
        >
          <EditorCommand className="z-50 h-auto max-h-[330px] overflow-y-auto rounded-md border border-gray-200 bg-white px-1 py-2 shadow-md transition-all">
            <EditorCommandEmpty className="px-2 text-gray-500">
              No results
            </EditorCommandEmpty>
            <EditorCommandList>
              {suggestionItems.map((item) => (
                <EditorCommandItem
                  value={item.title}
                  onCommand={(val) => item.command?.(val)}
                  className="flex items-center w-full px-2 py-1 space-x-2 text-sm text-left rounded-md hover:bg-gray-100 aria-selected:bg-gray-100"
                  key={item.title}
                >
                  <div className="flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-md">
                    {item.icon}
                  </div>
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-gray-500">{item.description}</p>
                  </div>
                </EditorCommandItem>
              ))}
            </EditorCommandList>
          </EditorCommand>

          <EditorBubble
            tippyOptions={{
              placement: "top",
            }}
            className="flex w-fit max-w-[90vw] overflow-hidden rounded-md border border-gray-200 bg-white shadow-xl"
          >
            <Separator orientation="vertical" />
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <Separator orientation="vertical" />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <Separator orientation="vertical" />
            <TextButtons />
          </EditorBubble>
        </EditorContent>
      </EditorRoot>
    </div>
  );
}
