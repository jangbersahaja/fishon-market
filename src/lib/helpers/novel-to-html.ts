import HorizontalRule from "@tiptap/extension-horizontal-rule";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

// Server-safe extensions for rendering Novel JSON to HTML
// Using standalone TipTap extensions instead of Novel's bundled ones
const extensions = [
  StarterKit,
  Link,
  Image,
  Underline,
  TaskList,
  TaskItem,
  HorizontalRule,
];

interface JSONContent {
  type?: string;
  content?: JSONContent[];
  [key: string]: any;
}

export function novelToHTML(content: string): string {
  if (!content) return "";

  try {
    // Parse JSON content from Novel editor
    const json = JSON.parse(content) as JSONContent;

    // Generate HTML from JSON using TipTap
    return generateHTML(json, extensions);
  } catch (error) {
    // If parsing fails, assume it's already HTML or plain text
    console.error("Failed to parse Novel content:", error);
    return content;
  }
}
