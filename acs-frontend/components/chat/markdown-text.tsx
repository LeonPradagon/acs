"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Copy, Check } from "lucide-react";

/**
 * Small button to copy code block content
 */
const CopyCodeButton = ({ code }: { code: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all opacity-0 group-hover/code:opacity-100"
      title="Copy code"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-green-400" />
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
};

/**
 * Component to render text with markdown properly (tables, HTML tags, headings, lists, bold, blockquotes)
 */
export const MarkdownText = ({ text }: { text: string }) => {
  if (!text) return null;

  return (
    <div className="text-sm leading-relaxed break-words w-full overflow-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          table: ({ node, ...props }) => (
            <div className="w-full overflow-x-auto my-4 rounded-md border border-border">
              <table className="w-full text-sm border-collapse" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => (
            <thead className="bg-muted/50 border-b border-border" {...props} />
          ),
          th: ({ node, ...props }) => (
            <th
              className="px-4 py-3 text-left font-semibold text-foreground border-border break-words"
              {...props}
            />
          ),
          td: ({ node, ...props }) => (
            <td
              className="px-4 py-3 align-top text-foreground/80 border-t border-border break-words"
              {...props}
            />
          ),
          p: ({ node, ...props }) => (
            <p
              className="mb-3 last:mb-0 leading-relaxed text-foreground/90"
              {...props}
            />
          ),
          ul: ({ node, ...props }) => (
            <ul
              className="list-disc ml-6 mb-3 text-foreground/90 space-y-1"
              {...props}
            />
          ),
          ol: ({ node, ...props }) => (
            <ol
              className="list-decimal ml-6 mb-3 text-foreground/90 space-y-1"
              {...props}
            />
          ),
          li: ({ node, ...props }) => (
            <li className="mb-1 leading-relaxed" {...props} />
          ),
          h1: ({ node, ...props }) => (
            <h1
              className="text-2xl font-extrabold mt-6 mb-4 text-foreground border-b border-border pb-2 tracking-tight"
              {...props}
            />
          ),
          h2: ({ node, ...props }) => (
            <h2
              className="text-xl font-bold mt-5 mb-3 text-foreground tracking-tight"
              {...props}
            />
          ),
          h3: ({ node, ...props }) => (
            <h3
              className="text-lg font-bold mt-4 mb-2 text-foreground tracking-tight"
              {...props}
            />
          ),
          h4: ({ node, ...props }) => (
            <h4
              className="text-base font-semibold mt-3 mb-1 text-foreground"
              {...props}
            />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-indigo-500 pl-4 py-1 my-3 text-muted-foreground italic bg-muted/20 rounded-r-md"
              {...props}
            />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          code: ({ node, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || "");
            const isInline = !match && !className?.includes("language-");
            const codeString = String(children).replace(/\n$/, "");

            return isInline ? (
              <code
                className="bg-muted px-1.5 py-0.5 rounded text-[0.85em] font-mono text-pink-600 dark:text-pink-400"
                {...props}
              >
                {children}
              </code>
            ) : (
              <div className="relative overflow-x-auto my-3 rounded-md bg-zinc-950 border border-zinc-800 group/code">
                {/* Language label */}
                {match && (
                  <div className="flex items-center justify-between px-4 py-1.5 border-b border-zinc-800 bg-zinc-900/50">
                    <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                      {match[1]}
                    </span>
                  </div>
                )}
                <CopyCodeButton code={codeString} />
                <div className="p-4 overflow-x-auto">
                  <code
                    className={`block text-[0.85em] font-mono text-zinc-50 leading-relaxed ${className || ""}`}
                    {...props}
                  >
                    {children}
                  </code>
                </div>
              </div>
            );
          },
          hr: ({ node, ...props }) => (
            <hr className="my-5 border-border" {...props} />
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
};

export const removeMarkdownBold = (text: string): string => {
  if (!text) return "";
  return text.replace(/\*\*/g, "").replace(/\*/g, "");
};
