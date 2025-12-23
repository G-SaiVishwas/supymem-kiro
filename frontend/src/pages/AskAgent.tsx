import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { queryKnowledge } from '../api/client';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Array<{ content: string; source: string }>;
  timestamp: Date;
}

export default function AskAgent() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await queryKnowledge(input.trim());

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        sources: response.sources || undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const exampleQueries = [
    "What's the architecture of this project?",
    'Why did we choose React for the frontend?',
    "Who's the expert on the authentication system?",
    'What are the pending high-priority tasks?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">Ask the Agent</h1>
        <p className="text-[var(--color-text-muted)] mt-1">
          Query your team's knowledge base with natural language
        </p>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-auto glass rounded-xl p-6 space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 animate-pulse-glow">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
              Your AI Knowledge Assistant
            </h2>
            <p className="text-[var(--color-text-muted)] max-w-md mb-6">
              Ask me anything about your codebase, past decisions, or team knowledge. I'll search
              through commits, PRs, Slack messages, and more.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl">
              {exampleQueries.map((query) => (
                <button
                  key={query}
                  onClick={() => setInput(query)}
                  className="px-4 py-3 text-left text-sm bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-border)] rounded-lg transition-colors text-[var(--color-text-secondary)]"
                >
                  {query}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-[var(--color-accent)] text-white'
                      : 'bg-[var(--color-bg-tertiary)]'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p>{message.content}</p>
                  )}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                      <p className="text-xs text-[var(--color-text-muted)] mb-2">Sources:</p>
                      <div className="space-y-1">
                        {message.sources.slice(0, 3).map((source, idx) => (
                          <p key={idx} className="text-xs text-[var(--color-text-secondary)]">
                            • {source.source}: {source.content.slice(0, 50)}...
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-[var(--color-bg-tertiary)] rounded-xl px-4 py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--color-accent)]" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about your codebase..."
          className="flex-1 px-4 py-3 bg-[var(--color-bg-tertiary)] border border-[var(--color-border)] rounded-xl text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-accent)] transition-colors"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="px-6 py-3 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-2"
        >
          <Send className="w-4 h-4" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}

