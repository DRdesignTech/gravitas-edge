'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';

interface MarkdownContentProps {
  content: string;
  className?: string;
  onNavigate?: () => void;
}

interface InlineToken {
  type: 'text' | 'bold-italic' | 'bold' | 'italic' | 'code' | 'link';
  text?: string;
  label?: string;
  href?: string;
}

/**
 * Parses inline formatting:
 * - [label](url)
 * - ***bold-italic***
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - `code`
 */
function parseInline(text: string, onNavigate?: () => void): ReactNode[] {
  const tokens: InlineToken[] = [];
  // Regex order matters: check link first, then bold-italic, then bold, italic, code
  const regex =
    /(\[([^\]]+)\]\(([^)]+)\))|(\*\*\*([^*]+)\*\*\*)|(\*\*([^*]+)\*\*|__([^_]+)__)|((?<!\*)\*([^*]+)\*(?!\*)|(?<!_)_([^_]+)_(?!_))|(`([^`]+)`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      // Link [label](url)
      tokens.push({ type: 'link', label: match[2], href: match[3] });
    } else if (match[4]) {
      // Bold + Italic ***text***
      tokens.push({ type: 'bold-italic', text: match[5] });
    } else if (match[6]) {
      // Bold **text** or __text__
      tokens.push({ type: 'bold', text: match[7] || match[8] });
    } else if (match[9]) {
      // Italic *text* or _text_
      tokens.push({ type: 'italic', text: match[10] || match[11] });
    } else if (match[12]) {
      // Code `code`
      tokens.push({ type: 'code', text: match[13] });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return tokens.map((token, i) => {
    switch (token.type) {
      case 'bold-italic':
        return (
          <strong key={i} className="font-extrabold text-[#061B36] dark:text-white">
            <em className="italic">{token.text}</em>
          </strong>
        );
      case 'bold':
        return (
          <strong key={i} className="font-bold text-[#061B36] dark:text-white">
            {token.text}
          </strong>
        );
      case 'italic':
        return (
          <em key={i} className="italic text-[#061B36]/90 dark:text-slate-200">
            {token.text}
          </em>
        );
      case 'code':
        return (
          <code
            key={i}
            className="rounded bg-[#061B36]/[0.08] dark:bg-white/[0.12] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#B37E28] dark:text-[#F0C27B]"
          >
            {token.text}
          </code>
        );
      case 'link': {
        const href = token.href || '#';
        const isExternal = href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:');
        if (isExternal) {
          return (
            <a
              key={i}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#C8842D] underline decoration-[#D6952F]/40 underline-offset-2 transition-colors hover:text-[#9E6217] dark:text-[#F0C27B] dark:hover:text-[#F5D59F]"
            >
              {token.label}
            </a>
          );
        }
        return (
          <Link
            key={i}
            href={href}
            onClick={onNavigate}
            className="font-semibold text-[#C8842D] underline decoration-[#D6952F]/40 underline-offset-2 transition-colors hover:text-[#9E6217] dark:text-[#F0C27B] dark:hover:text-[#F5D59F]"
          >
            {token.label}
          </Link>
        );
      }
      case 'text':
      default:
        return <React.Fragment key={i}>{token.text}</React.Fragment>;
    }
  });
}

type Block =
  | { type: 'h1'; content: string }
  | { type: 'h2'; content: string }
  | { type: 'h3'; content: string }
  | { type: 'quote'; content: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'p'; content: string };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      continue;
    }

    // Header 1 (# Title)
    if (trimmed.startsWith('# ')) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({ type: 'h1', content: trimmed.slice(2) });
      continue;
    }

    // Header 2 (## Title)
    if (trimmed.startsWith('## ')) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({ type: 'h2', content: trimmed.slice(3) });
      continue;
    }

    // Header 3 (### Title)
    if (trimmed.startsWith('### ')) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({ type: 'h3', content: trimmed.slice(4) });
      continue;
    }

    // Blockquote (> Quote)
    if (trimmed.startsWith('> ')) {
      if (currentList) {
        blocks.push(currentList);
        currentList = null;
      }
      blocks.push({ type: 'quote', content: trimmed.slice(2) });
      continue;
    }

    // Unordered List (- Item, * Item, • Item)
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        if (currentList) blocks.push(currentList);
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Ordered List (1. Item)
    const numMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (numMatch) {
      if (!currentList || currentList.type !== 'ol') {
        if (currentList) blocks.push(currentList);
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numMatch[1]);
      continue;
    }

    // Normal paragraph line
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
    blocks.push({ type: 'p', content: trimmed });
  }

  if (currentList) {
    blocks.push(currentList);
  }

  return blocks;
}

export function MarkdownContent({ content, className = '', onNavigate }: MarkdownContentProps) {
  if (!content) return null;

  const blocks = parseBlocks(content);

  return (
    <div className={`space-y-2 text-[13px] leading-relaxed text-content dark:text-slate-200 ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'h1':
            return (
              <h3 key={idx} className="mt-2.5 mb-1 text-[14px] font-extrabold text-[#061B36] dark:text-white">
                {parseInline(block.content, onNavigate)}
              </h3>
            );
          case 'h2':
            return (
              <h4 key={idx} className="mt-2 mb-1 text-[13.5px] font-bold text-[#061B36] dark:text-white">
                {parseInline(block.content, onNavigate)}
              </h4>
            );
          case 'h3':
            return (
              <h5
                key={idx}
                className="mt-2 mb-0.5 text-[11px] font-bold uppercase tracking-wider text-[#C8842D] dark:text-[#F0C27B]"
              >
                {parseInline(block.content, onNavigate)}
              </h5>
            );
          case 'quote':
            return (
              <blockquote
                key={idx}
                className="my-1.5 border-l-2 border-[#D6952F] pl-2.5 italic text-content-muted dark:text-slate-300"
              >
                {parseInline(block.content, onNavigate)}
              </blockquote>
            );
          case 'ul':
            return (
              <ul key={idx} className="my-1.5 list-disc space-y-1 pl-4.5 marker:text-[#D6952F] marker:text-[11px]">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="pl-0.5">
                    {parseInline(item, onNavigate)}
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx} className="my-1.5 list-decimal space-y-1 pl-4.5 font-medium marker:text-[#D6952F]">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="pl-0.5 font-normal">
                    {parseInline(item, onNavigate)}
                  </li>
                ))}
              </ol>
            );
          case 'p':
          default:
            return (
              <p key={idx} className="leading-relaxed">
                {parseInline(block.content, onNavigate)}
              </p>
            );
        }
      })}
    </div>
  );
}

export default MarkdownContent;
