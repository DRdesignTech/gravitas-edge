'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChatAction,
  ChatTopic,
  askOwnQuestionLabel,
  chatbotFallbackReply,
  chatbotGreetingReply,
  chatbotTopics,
  chatbotWelcome,
  contactSupportLabel,
  isGreeting,
  matchCustomQuestion,
} from '@/data/chatbot-data';
import { AiChatMessage, sendAiChatMessage } from '@/lib/services';
import MarkdownContent from './MarkdownContent';

const WHATSAPP_CHANNEL_URL = 'https://wa.me/message/5JALY3QF6BTKC1';

interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  text: string;
  actions?: ChatAction[];
}

type Suggestion =
  | { kind: 'topic'; topic: ChatTopic }
  | { kind: 'ask' }
  | { kind: 'contact' }
  | { kind: 'custom'; text: string };

function defaultSuggestions(): Suggestion[] {
  return [
    ...chatbotTopics.slice(0, 5).map((topic): Suggestion => ({ kind: 'topic', topic })),
    { kind: 'ask' },
  ];
}

function fallbackSuggestions(): Suggestion[] {
  return [
    ...chatbotTopics.slice(0, 4).map((topic): Suggestion => ({ kind: 'topic', topic })),
    { kind: 'ask' },
    { kind: 'contact' },
  ];
}

function ChatIcon({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM17.25 12a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      <path d="M21 11.25a8.25 8.25 0 01-12.16 7.226L3.75 19.5l1.04-5.028A8.25 8.25 0 1121 11.25z" />
    </svg>
  );
}

function SendIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 12L3.5 4.5 21 12l-17.5 7.5L6 12zm0 0L21 12" />
    </svg>
  );
}

function TrashIcon({ className = 'h-[18px] w-[18px]' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.74 9l-.35 9m-4.79 0L9.26 9m9.97-3.21c.34.05.68.11 1.02.17m-1.02-.17l-1.06 14.13A2.25 2.25 0 0115.94 22H8.06a2.25 2.25 0 01-2.23-2.08L4.77 5.79m14.46 0a48.1 48.1 0 00-3.48-.4m-12 .56c.34-.06.68-.11 1.02-.17m0 0a48.1 48.1 0 013.48-.4m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.965 51.965 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.67 48.67 0 00-7.5 0" />
    </svg>
  );
}

function SparklesIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.05 3.28a.75.75 0 01.71.02l5.05 2.86 5.05-2.86a.75.75 0 011.09.79l-1.05 5.76 3.85 4.39a.75.75 0 01-.42 1.24l-5.83.85-2.6 5.26a.75.75 0 01-1.35 0L17 16.5a.75.75 0 01-.42-1.24l3.85-4.39-1.05-5.76a.75.75 0 01-1.09-.79l-5.05 2.86H9.05z"
      />
    </svg>
  );
}

export default function ChatbotWidget() {
  const pathname = usePathname();
  const isCheckout = pathname?.includes('/checkout');

  const [open, setOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: 'bot', text: chatbotWelcome },
  ]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() => defaultSuggestions());
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [input, setInput] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [typing, setTyping] = useState(false);

  const idRef = useRef(1);
  const typingRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  useEffect(() => {
    if (open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 60);
      return () => window.clearTimeout(t);
    }
  }, [open]);

  const nextId = () => idRef.current++;

  const sendMessage = async (text: string) => {
    if (!text || typingRef.current) return;
    typingRef.current = true;
    setTyping(true);
    setCustomMode(false);
    setInput('');

    const userMsgId = nextId();
    const currentMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, role: 'user', text },
    ];
    setMessages(currentMessages);

    try {
      const history: AiChatMessage[] = currentMessages
        .filter((m) => m.id > 0)
        .slice(-8)
        .map((m) => ({
          role: m.role === 'bot' ? 'assistant' : 'user',
          content: m.text,
        }));

      const res = await sendAiChatMessage(text, history);

      const nextSuggestions: Suggestion[] = [];
      if (res.suggestions && res.suggestions.length > 0) {
        for (const s of res.suggestions.slice(0, 4)) {
          nextSuggestions.push({ kind: 'custom', text: s });
        }
      } else {
        nextSuggestions.push(...defaultSuggestions());
      }

      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'bot',
          text: res.reply,
          actions: res.actions,
        },
      ]);
      setSuggestions(nextSuggestions);
    } catch {
      // Graceful offline fallback
      if (isGreeting(text)) {
        setMessages((prev) => [
          ...prev,
          { id: nextId(), role: 'bot', text: chatbotGreetingReply },
        ]);
        setSuggestions(defaultSuggestions());
      } else {
        const topic = matchCustomQuestion(text);
        if (topic) {
          setMessages((prev) => [
            ...prev,
            {
              id: nextId(),
              role: 'bot',
              text: topic.answer,
              actions: topic.actions,
            },
          ]);
          setSuggestions(defaultSuggestions());
        } else {
          setMessages((prev) => [
            ...prev,
            { id: nextId(), role: 'bot', text: chatbotFallbackReply },
          ]);
          setSuggestions(fallbackSuggestions());
        }
      }
    } finally {
      setTyping(false);
      typingRef.current = false;
    }
  };

  const handleTopic = (topic: ChatTopic) => {
    sendMessage(topic.question);
  };

  const handleCustomPrompt = (text: string) => {
    sendMessage(text);
  };

  const handleAskOwn = () => {
    if (typingRef.current) return;
    setCustomMode(true);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  const handleContact = (topic: ChatTopic) => {
    if (typingRef.current) return;
    setCustomMode(false);
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text: topic.question }]);
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'bot', text: topic.answer, actions: topic.actions },
    ]);
    setSuggestions(fallbackSuggestions());
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
  };

  const clearChat = () => {
    typingRef.current = false;
    setTyping(false);
    setCustomMode(false);
    setInput('');
    idRef.current = 1;
    setMessages([{ id: 0, role: 'bot', text: chatbotWelcome }]);
    setSuggestions(defaultSuggestions());
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  useEffect(() => {
    setDrawerOpen(document.body.dataset.profileDrawerOpen === 'true');
    const onDrawerToggle = (e: Event) => {
      const custom = e as CustomEvent<{ open?: boolean }>;
      setDrawerOpen(Boolean(custom.detail?.open));
    };
    window.addEventListener('ge-profile-drawer', onDrawerToggle);
    return () => window.removeEventListener('ge-profile-drawer', onDrawerToggle);
  }, []);

  // Keep hidden on checkout pages or when a profile edit drawer is open
  if (isCheckout || drawerOpen) {
    return null;
  }

  const launcherPosition = 'bottom-4 right-4 sm:bottom-6 sm:right-6';
  const contactTopic = chatbotTopics.find((t) => t.id === 'contact');

  return (
    <>
      {open ? (
        <div
          className="fixed inset-x-4 bottom-4 z-[60] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop dark:border-brand-800 dark:bg-surface-elevated sm:inset-auto sm:bottom-6 sm:right-6"
          style={{ width: 'min(400px, calc(100vw - 2rem))', maxHeight: 'calc(100dvh - 2rem)' }}
          role="dialog"
          aria-label="Gravitas Edge AI Assistant"
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <header className="relative flex items-center gap-3 bg-gradient-to-r from-[#061B36] via-[#0E2B52] to-[#1E3B68] px-4 py-3.5 text-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[#D6952F]/20 blur-2xl"
            />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F0C27B] to-[#C8842D] text-[#061B36] shadow-sm">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white flex items-center gap-2">
                Gravitas AI Assistant
              </p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/75">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Online · Executive advisory
              </p>
            </div>
            <button
              type="button"
              onClick={clearChat}
              title="Clear chat"
              aria-label="Clear chat"
              className="rounded-lg p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              <TrashIcon />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Minimize"
              aria-label="Minimize chat"
              className="rounded-lg p-2 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </header>

          {/* ── Messages ──────────────────────────────────────────── */}
          <div
            ref={scrollRef}
            aria-live="polite"
            className="scrollbar-thin max-h-[calc(100dvh-14rem)] flex-1 overflow-y-auto bg-surface-muted/50 px-3 py-3 sm:h-[min(440px,calc(100dvh-15rem))] sm:max-h-none sm:flex-initial sm:px-4 sm:py-4 dark:bg-surface"
          >
            <div className="space-y-4">
              {messages.map((message) =>
                message.role === 'bot' ? (
                  <div key={message.id} className="flex items-end gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#061B36] to-[#0E2B52] text-[#F0C27B] border border-[#D6952F]/40 shadow-sm">
                      <SparklesIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 max-w-[88%]">
                      <div className="break-words rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3 text-[13px] leading-relaxed text-content shadow-sm dark:bg-surface-elevated">
                        <MarkdownContent content={message.text} onNavigate={() => setOpen(false)} />
                      </div>
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {message.actions.map((action) => {
                            const isExternal =
                              action.href.startsWith('http') || action.href.startsWith('mailto:');
                            if (isExternal) {
                              return (
                                <a
                                  key={action.href}
                                  href={action.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 rounded-full border border-[#C8842D]/40 bg-[#FFF3D9]/60 px-3 py-1 text-xs font-semibold text-[#8C5814] transition-colors hover:bg-[#F5E6C7] dark:border-[#F0C27B]/30 dark:bg-[#1E3557] dark:text-[#F0C27B] dark:hover:bg-[#284570]"
                                >
                                  {action.label} →
                                </a>
                              );
                            }
                            return (
                              <Link
                                key={action.href}
                                href={action.href}
                                onClick={() => setOpen(false)}
                                className="inline-flex items-center gap-1 rounded-full border border-[#C8842D]/40 bg-[#FFF3D9]/60 px-3 py-1 text-xs font-semibold text-[#8C5814] transition-colors hover:bg-[#F5E6C7] dark:border-[#F0C27B]/30 dark:bg-[#1E3557] dark:text-[#F0C27B] dark:hover:bg-[#284570]"
                              >
                                {action.label} →
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] break-words rounded-2xl rounded-br-md bg-[#061B36] px-3.5 py-2.5 text-[13px] leading-relaxed text-white shadow-sm dark:bg-[#1D3B66]">
                      {message.text}
                    </div>
                  </div>
                ),
              )}

              {typing && (
                <div className="flex items-end gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#061B36] to-[#0E2B52] text-[#F0C27B] border border-[#D6952F]/40 shadow-sm">
                    <SparklesIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-3 shadow-sm dark:bg-surface-elevated">
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-content-faint" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-content-faint [animation-delay:0.15s]" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-content-faint [animation-delay:0.3s]" />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Suggestions + input ───────────────────────────────── */}
          <div className="border-t border-line bg-surface dark:bg-surface-elevated">
            {suggestions.length > 0 && (
              <div className="border-b border-line/60 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#D6952F]/15 text-[#D6952F]">
                      <SparklesIcon className="h-2.5 w-2.5" />
                    </span>
                    <span className="text-[10.5px] font-bold uppercase tracking-wider text-content-faint">
                      Suggested Questions
                    </span>
                    <span className="rounded-full bg-surface-muted px-1.5 py-0.2 text-[9.5px] font-semibold text-content-muted dark:bg-white/10">
                      {suggestions.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSuggestions((prev) => !prev)}
                    aria-expanded={showSuggestions}
                    aria-label={showSuggestions ? 'Hide suggested questions' : 'Show suggested questions'}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold text-[#C8842D] transition-colors hover:bg-[#FFF3D9]/60 hover:text-[#9E6217] dark:text-[#F0C27B] dark:hover:bg-white/5 dark:hover:text-white"
                  >
                    <span>{showSuggestions ? 'Hide' : 'Show'}</span>
                    <svg
                      className={`h-3 w-3 transition-transform duration-200 ${showSuggestions ? 'rotate-180' : ''}`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                </div>

                {showSuggestions && (
                  <div className="scrollbar-thin mt-2 max-h-32 overflow-y-auto">
                    <div className="flex flex-wrap gap-1.5">
                      {suggestions.map((suggestion) => {
                        if (suggestion.kind === 'topic') {
                          return (
                            <button
                              key={suggestion.topic.id}
                              type="button"
                              onClick={() => handleTopic(suggestion.topic)}
                              className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-content-muted transition-colors hover:border-[#D6952F] hover:bg-[#FFF3D9]/40 hover:text-[#061B36] dark:hover:border-[#F0C27B] dark:hover:bg-[#1E3557] dark:hover:text-[#F0C27B]"
                            >
                              <span className="truncate">{suggestion.topic.question}</span>
                            </button>
                          );
                        }
                        if (suggestion.kind === 'custom') {
                          return (
                            <button
                              key={suggestion.text}
                              type="button"
                              onClick={() => handleCustomPrompt(suggestion.text)}
                              className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#D6952F]/40 bg-[#FFF3D9]/20 px-3 py-1.5 text-xs font-medium text-[#061B36] transition-colors hover:border-[#D6952F] hover:bg-[#FFF3D9]/60 dark:border-[#F0C27B]/30 dark:bg-[#1E3557]/40 dark:text-[#F0C27B] dark:hover:bg-[#1E3557]"
                            >
                              <span className="truncate">{suggestion.text}</span>
                            </button>
                          );
                        }
                        if (suggestion.kind === 'ask') {
                          return (
                            <button
                              key="ask"
                              type="button"
                              onClick={handleAskOwn}
                              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-dashed border-[#D6952F] bg-[#FFF3D9]/40 px-3 py-1.5 text-xs font-semibold text-[#8C5814] transition-colors hover:bg-[#FFF3D9] dark:border-[#F0C27B] dark:bg-[#1E3557] dark:text-[#F0C27B] dark:hover:bg-[#284570]"
                            >
                              <svg
                                className="h-3.5 w-3.5 shrink-0"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                aria-hidden="true"
                              >
                                <path d="M12 5v14M5 12h14" />
                              </svg>
                              {askOwnQuestionLabel}
                            </button>
                          );
                        }
                        return (
                          <button
                            key="contact"
                            type="button"
                            onClick={() =>
                              contactTopic ? handleContact(contactTopic) : handleAskOwn()
                            }
                            className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[#061B36] bg-[#061B36] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#10243E] dark:border-[#D6952F] dark:bg-[#D6952F] dark:text-[#061B36]"
                          >
                            {contactSupportLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-3">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about vaults, jobs, resume or pricing..."
                  aria-label="Type your question"
                  className="h-11 w-full rounded-full border border-line bg-surface px-4 pr-4 text-[13px] text-content shadow-sm transition placeholder:font-medium placeholder:text-hint focus:border-[#061B36] focus:outline-none focus:ring-2 focus:ring-[#061B36]/20 dark:bg-surface dark:focus:border-[#D6952F]"
                />
                {customMode && (
                  <span className="pointer-events-none absolute -top-7 left-1 whitespace-nowrap text-[11px] font-medium text-[#C8842D] dark:text-[#F0C27B]">
                    ✍️ Ask anything — our AI advisor will assist you immediately.
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#061B36] text-white shadow-sm transition-colors hover:bg-[#10243E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#061B36] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#061B36] dark:bg-[#D6952F] dark:text-[#061B36] dark:hover:bg-[#E2A746]"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            </form>
          </div>

          <style jsx>{`
            .typing-dot {
              animation: typingBounce 1s ease-in-out infinite;
            }
            @keyframes typingBounce {
              0%,
              60%,
              100% {
                transform: translateY(0);
                opacity: 0.4;
              }
              30% {
                transform: translateY(-3px);
                opacity: 1;
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .typing-dot {
                animation: none;
              }
            }
          `}</style>
        </div>
      ) : (
        <div className={`fixed z-[60] flex items-center gap-3 ${launcherPosition}`}>
          <a
            href={WHATSAPP_CHANNEL_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Chat on WhatsApp"
            title="Chat on WhatsApp"
            className="flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_10px_24px_-6px_rgba(0,0,0,0.35)] transition-transform hover:scale-105 border-0"
          >
            <svg viewBox="0 0 32 32" className="h-[28px] w-[28px] fill-white" aria-hidden="true">
              <path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6a10.6 10.6 0 0 1-5.4-1.5l-.4-.2-3.9 1 1-3.8-.2-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1s-.5-.2-.7.2-.8 1-1 1.2-.4.2-.7 0a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6a1.2 1.2 0 0 0-.9.4 3.6 3.6 0 0 0-1.1 2.7 6.3 6.3 0 0 0 1.3 3.3 14.4 14.4 0 0 0 5.5 4.9c2 .9 2.9.9 3.9.8a3.3 3.3 0 0 0 2.2-1.6 2.7 2.7 0 0 0 .2-1.6c-.1-.2-.3-.2-.6-.4z" />
            </svg>
          </a>
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open AI chat assistant"
            title="Chat with Gravitas Edge AI Assistant"
            className="relative flex h-[56px] w-[56px] items-center justify-center rounded-full bg-[#061B36] text-[#F0C27B] border border-[#D6952F]/40 shadow-xl transition-all duration-200 hover:scale-105 hover:bg-[#0E2B52] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6952F]"
          >
            <ChatIcon className="h-7 w-7 text-[#F0C27B]" />
            <span className="absolute right-0.5 top-0.5 h-3.5 w-3.5 rounded-full border-2 border-surface bg-emerald-500 dark:border-surface-elevated" />
          </button>
        </div>
      )}
    </>
  );
}
