// Import extensions directly from Novel
import {
  HorizontalRule,
  Placeholder,
  StarterKit,
  TaskItem,
  TaskList,
  TiptapImage,
  TiptapLink,
  TiptapUnderline,
} from "novel";

// Configure Novel extensions for blog editor
export const defaultExtensions = [
  StarterKit.configure({
    bulletList: {
      HTMLAttributes: {
        class: "list-disc list-outside leading-3 -mt-2",
      },
    },
    orderedList: {
      HTMLAttributes: {
        class: "list-decimal list-outside leading-3 -mt-2",
      },
    },
    listItem: {
      HTMLAttributes: {
        class: "leading-normal -mb-2",
      },
    },
    blockquote: {
      HTMLAttributes: {
        class: "border-l-4 border-gray-300 pl-4 italic",
      },
    },
    codeBlock: {
      HTMLAttributes: {
        class:
          "rounded-md bg-gray-900 text-gray-100 border p-5 font-mono font-medium",
      },
    },
    code: {
      HTMLAttributes: {
        class: "rounded-md bg-gray-100 px-1.5 py-1 font-mono font-medium",
        spellcheck: "false",
      },
    },
    horizontalRule: false,
    dropcursor: {
      color: "#DBEAFE",
      width: 4,
    },
    gapcursor: false,
  }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "heading") {
        return `Heading ${node.attrs.level}`;
      }
      return "Start writing your blog post... Press '/' for commands";
    },
    includeChildren: true,
  }),
  TiptapLink.configure({
    HTMLAttributes: {
      class:
        "text-[#ec2227] underline underline-offset-[3px] hover:text-[#d11e22] transition-colors cursor-pointer",
    },
  }),
  TiptapImage.configure({
    allowBase64: true,
    HTMLAttributes: {
      class: "rounded-lg border border-gray-200",
    },
  }),
  TiptapUnderline,
  TaskList.configure({
    HTMLAttributes: {
      class: "not-prose pl-2",
    },
  }),
  TaskItem.configure({
    HTMLAttributes: {
      class: "flex gap-2 items-start my-4",
    },
    nested: true,
  }),
  HorizontalRule.configure({
    HTMLAttributes: {
      class: "mt-4 mb-6 border-t border-gray-300",
    },
  }),
];
