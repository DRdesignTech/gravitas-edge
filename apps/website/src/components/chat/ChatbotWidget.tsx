'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
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

const HIDDEN_RESUME_PREFIXES = ['/login', '/register', '/dashboard'];

interface ChatMessage {
  id: number;
  role: 'user' | 'bot';
  text: string;
  actions?: ChatAction[];
}

type Suggestion =
  | { kind: 'topic'; topic: ChatTopic }
  | { kind: 'ask' }
  | { kind: 'contact' };

function defaultSuggestions(): Suggestion[] {
  return [
    ...chatbotTopics.map((topic): Suggestion => ({ kind: 'topic', topic })),
    { kind: 'ask' },
  ];
}

function fallbackSuggestions(): Suggestion[] {
  return [
    ...chatbotTopics.map((topic): Suggestion => ({ kind: 'topic', topic })),
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
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
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
  const resumeVisible = !HIDDEN_RESUME_PREFIXES.some((p) => pathname.startsWith(p));

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: 'bot', text: chatbotWelcome },
  ]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() =>
    defaultSuggestions(),
  );
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

  const typeThenReply = (
    text: string,
    actions: ChatAction[] | undefined,
    nextSuggestions: Suggestion[],
  ) => {
    typingRef.current = true;
    setTyping(true);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: 'bot', text, actions },
      ]);
      setSuggestions(nextSuggestions);
      setTyping(false);
      typingRef.current = false;
    }, 600);
  };

  const handleTopic = (topic: ChatTopic) => {
    if (typingRef.current) return;
    setCustomMode(false);
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: topic.question },
    ]);
    typeThenReply(topic.answer, topic.actions, defaultSuggestions());
  };

  const handleAskOwn = () => {
    if (typingRef.current) return;
    setCustomMode(true);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  const handleContact = (topic: ChatTopic) => {
    if (typingRef.current) return;
    setCustomMode(false);
    setMessages((prev) => [
      ...prev,
      { id: nextId(), role: 'user', text: topic.question },
    ]);
    typeThenReply(topic.answer, topic.actions, fallbackSuggestions());
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || typingRef.current) return;

    setCustomMode(false);
    setInput('');
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', text }]);

    if (isGreeting(text)) {
      typeThenReply(chatbotGreetingReply, undefined, defaultSuggestions());
      return;
    }

    const topic = matchCustomQuestion(text);
    if (topic) {
      typeThenReply(topic.answer, topic.actions, defaultSuggestions());
    } else {
      typeThenReply(chatbotFallbackReply, undefined, fallbackSuggestions());
    }
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

  const launcherPosition = resumeVisible
    ? 'bottom-24 right-4 sm:bottom-24 sm:right-6'
    : 'bottom-4 right-4 sm:bottom-6 sm:right-6';

  const contactTopic = chatbotTopics.find((t) => t.id === 'contact');

  return (
    <>
      {open ? (
        <div
          className="fixed bottom-4 right-4 z-[60] flex flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-pop dark:border-brand-800 dark:bg-surface-elevated sm:bottom-6 sm:right-6"
          style={{ width: 'min(400px, calc(100vw - 2rem))' }}
          role="dialog"
          aria-label="Gravitas Edge assistant"
        >
          {/* ── Header ─────────────────────────────────────────────── */}
          <header className="relative flex items-center gap-3 bg-gradient-to-r from-brand-700 via-brand-600 to-brand-500 px-4 py-3 text-white">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/10 blur-2xl"
            />
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30 backdrop-blur-sm">
              <SparklesIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">Gravitas Edge Assistant</p>
              <p className="flex items-center gap-1.5 text-[11px] text-white/75">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Online · typically replies instantly
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
            className="scrollbar-thin h-[min(430px,calc(100dvh-15rem))] overflow-y-auto bg-surface-muted/50 px-3 py-4 sm:px-4 dark:bg-surface"
          >
            <div className="space-y-4">
              {messages.map((message) =>
                message.role === 'bot' ? (
                  <div key={message.id} className="flex items-end gap-2">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
                      <SparklesIcon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 max-w-[85%]">
                      <div className="whitespace-pre-line break-words rounded-2xl rounded-bl-md border border-line bg-surface px-3.5 py-2.5 text-[13px] leading-relaxed text-content shadow-sm dark:bg-surface-elevated">
                        {message.text}
                      </div>
                      {message.actions && message.actions.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {message.actions.map((action) => {
                            const external = action.href.startsWith('http');
                            return (
                              <a
                                key={action.href}
                                href={action.href}
                                target={external ? '_blank' : undefined}
                                rel={external ? 'noopener noreferrer' : undefined}
                                className="inline-flex items-center rounded-full border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
                              >
                                {action.label}
                              </a>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div key={message.id} className="flex justify-end">
                    <div className="max-w-[85%] break-words rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2.5 text-[13px] leading-relaxed text-white shadow-sm">
                      {message.text}
                    </div>
                  </div>
                ),
              )}

              {typing && (
                <div className="flex items-end gap-2">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
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
              <div className="scrollbar-thin max-h-32 overflow-y-auto px-3 pt-3">
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-content-faint">
                  Suggested
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((suggestion, i) => {
                    if (suggestion.kind === 'topic') {
                      return (
                        <button
                          key={suggestion.topic.id}
                          type="button"
                          onClick={() => handleTopic(suggestion.topic)}
                          className="inline-flex max-w-full items-center gap-1 rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-content-muted transition-colors hover:border-brand-400 hover:bg-brand-50 hover:text-brand-700 dark:hover:border-brand-700 dark:hover:bg-brand-950 dark:hover:text-brand-300"
                        >
                          <span className="truncate">{suggestion.topic.question}</span>
                        </button>
                      );
                    }
                    if (suggestion.kind === 'ask') {
                      return (
                        <button
                          key="ask"
                          type="button"
                          onClick={handleAskOwn}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-dashed border-brand-400 bg-brand-50/60 px-3 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:border-brand-600 dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-900"
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
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-brand-600 bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-brand-700"
                      >
                        {contactSupportLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <form onSubmit={handleSend} className="flex items-center gap-2 px-3 py-3">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your question..."
                  aria-label="Type your question"
                  className="h-11 w-full rounded-full border border-line bg-surface px-4 pr-4 text-[13px] text-content shadow-sm transition placeholder:font-medium placeholder:text-content-faint focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40 dark:bg-surface"
                />
                {customMode && (
                  <span className="pointer-events-none absolute -top-7 left-1 whitespace-nowrap text-[11px] font-medium text-brand-600 dark:text-brand-400">
                    ✍️ Ask anything — we&apos;ll answer if we can.
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={!input.trim()}
                aria-label="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-brand-600"
              >
                <SendIcon className="h-5 w-5" />
              </button>
            </form>
          </div>

          <style jsx>{`
            @keyframes chatPop {
              from {
                opacity: 0;
                transform: translateY(8px) scale(0.97);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }
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
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat assistant"
          title="Chat with Gravitas Edge"
          className={`fixed z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-brand-400 text-white shadow-lg shadow-brand-500/30 transition-all duration-200 hover:bg-brand-500 hover:shadow-xl hover:shadow-brand-500/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 ${launcherPosition}`}
        >
          <ChatIcon className="h-7 w-7" />
          <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full border-2 border-surface bg-emerald-500 dark:border-surface-elevated" />
        </button>
      )}
    </>
  );
}