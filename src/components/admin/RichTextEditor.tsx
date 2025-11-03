"use client";

import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect } from "react";

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: "text-blue-600 underline",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "max-w-full h-auto",
        },
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[500px] max-w-none p-6 prose-headings:font-bold prose-a:text-blue-600 prose-img:rounded-lg prose-pre:bg-gray-900 prose-pre:text-gray-100",
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange(html);
    },
  });

  // Update editor content when value prop changes externally
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="min-h-[400px] rounded-md border border-gray-300 bg-gray-50 p-4">
        <p className="text-gray-500">Loading editor...</p>
      </div>
    );
  }

  const addImage = () => {
    // Create a file input programmatically
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/jpg,image/png,image/webp,image/gif";

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
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

        // Insert the uploaded image into the editor
        editor.chain().focus().setImage({ src: data.url }).run();
      } catch (error) {
        console.error("Image upload error:", error);
        alert(
          error instanceof Error ? error.message : "Failed to upload image"
        );
      }
    };

    input.click();
  };

  const setLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="rich-text-editor border border-gray-300 rounded-md overflow-hidden">
      {/* Toolbar - Sticky on scroll */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-3 flex flex-wrap items-center gap-1 shadow-sm">
        {/* Headings */}
        <select
          onChange={(e) => {
            const level = parseInt(e.target.value);
            if (level === 0) {
              editor.chain().focus().setParagraph().run();
            } else {
              editor
                .chain()
                .focus()
                .toggleHeading({ level: level as any })
                .run();
            }
          }}
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm bg-white hover:border-gray-400 focus:border-[#EC2227] focus:ring-1 focus:ring-[#EC2227] transition-colors"
          value={
            editor.isActive("heading", { level: 1 })
              ? "1"
              : editor.isActive("heading", { level: 2 })
                ? "2"
                : editor.isActive("heading", { level: 3 })
                  ? "3"
                  : editor.isActive("heading", { level: 4 })
                    ? "4"
                    : editor.isActive("heading", { level: 5 })
                      ? "5"
                      : editor.isActive("heading", { level: 6 })
                        ? "6"
                        : "0"
          }
        >
          <option value="0">Paragraph</option>
          <option value="1">H1</option>
          <option value="2">H2</option>
          <option value="3">H3</option>
          <option value="4">H4</option>
          <option value="5">H5</option>
          <option value="6">H6</option>
        </select>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Text formatting */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-3 py-1.5 rounded-md font-bold text-sm transition-colors ${
            editor.isActive("bold")
              ? "bg-[#EC2227] text-white"
              : "hover:bg-gray-100"
          }`}
          title="Bold (Ctrl+B)"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-3 py-1.5 rounded-md italic text-sm transition-colors ${
            editor.isActive("italic")
              ? "bg-[#EC2227] text-white"
              : "hover:bg-gray-100"
          }`}
          title="Italic (Ctrl+I)"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`px-3 py-1.5 rounded-md line-through text-sm transition-colors ${
            editor.isActive("strike")
              ? "bg-[#EC2227] text-white"
              : "hover:bg-gray-100"
          }`}
          title="Strikethrough"
        >
          S
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Lists */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            editor.isActive("bulletList")
              ? "bg-[#EC2227] text-white"
              : "hover:bg-gray-100"
          }`}
          title="Bullet List"
        >
          • List
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            editor.isActive("orderedList")
              ? "bg-[#EC2227] text-white"
              : "hover:bg-gray-100"
          }`}
          title="Numbered List"
        >
          1. List
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Alignment */}
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            editor.isActive({ textAlign: "left" })
              ? "bg-[#EC2227] text-white"
              : "hover:bg-gray-100"
          }`}
          title="Align Left"
        >
          ⇤
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            editor.isActive({ textAlign: "center" })
              ? "bg-[#EC2227] text-white"
              : "hover:bg-gray-100"
          }`}
          title="Align Center"
        >
          ≡
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            editor.isActive({ textAlign: "right" })
              ? "bg-[#EC2227] text-white"
              : "hover:bg-gray-100"
          }`}
          title="Align Right"
        >
          ⇥
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Block formats */}
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            editor.isActive("blockquote")
              ? "bg-[#EC2227] text-white"
              : "hover:bg-gray-100"
          }`}
          title="Blockquote"
        >
          &ldquo; &rdquo;
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          className={`px-3 py-1.5 rounded-md text-sm font-mono transition-colors ${
            editor.isActive("codeBlock")
              ? "bg-[#EC2227] text-white"
              : "hover:bg-gray-100"
          }`}
          title="Code Block"
        >
          {"</>"}
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Media */}
        <button
          type="button"
          onClick={setLink}
          className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
            editor.isActive("link")
              ? "bg-[#EC2227] text-white"
              : "hover:bg-gray-100"
          }`}
          title="Insert Link"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={addImage}
          className="px-3 py-1.5 rounded-md text-sm hover:bg-gray-100 transition-colors"
          title="Upload Image"
        >
          🖼️
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1" />

        {/* Undo/Redo */}
        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="px-3 py-1.5 rounded-md text-sm hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="px-3 py-1.5 rounded-md text-sm hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>
      </div>

      {/* Editor Content - Scrollable area */}
      <div className="bg-white overflow-y-auto max-h-[600px]">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
