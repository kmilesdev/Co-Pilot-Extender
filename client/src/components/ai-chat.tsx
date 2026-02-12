import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, Bot, User, Sparkles, HelpCircle, Wrench } from "lucide-react";
import type { ChatMessage, StructuredAIResponse } from "@shared/schema";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  structured?: StructuredAIResponse;
}

interface AIChatProps {
  ticketId: string;
  ticketSubject: string;
}

export function AIChat({ ticketId, ticketSubject }: AIChatProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (overrideMessage?: string) => {
    const messageContent = overrideMessage || input.trim();
    if (!messageContent || isLoading) return;

    const userMessage: DisplayMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageContent,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch(`/api/tickets/${ticketId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          history,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();
      const structured: StructuredAIResponse | undefined = data.structured;

      const assistantMessage: DisplayMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: structured?.message || "I couldn't process that. Please try again.",
        timestamp: new Date(),
        structured,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: DisplayMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I'm sorry, I couldn't process your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleQuickReply = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  if (!isOpen) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Troubleshooting Assistant
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Get step-by-step help resolving this issue. Our AI will guide you through troubleshooting.
          </p>
          <Button
            onClick={() => setIsOpen(true)}
            className="w-full"
            data-testid="button-start-chat"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Start Troubleshooting Chat
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Troubleshooting
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            data-testid="button-minimize-chat"
          >
            Minimize
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80 p-4" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="h-12 w-12 mx-auto mb-3 text-primary/40" />
              <p className="text-sm">
                Hi! I'm here to help you troubleshoot "{ticketSubject}".
              </p>
              <p className="text-xs mt-1">
                Describe what's happening and I'll ask a couple of questions first.
              </p>
            </div>
          )}
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-lg px-4 py-2 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                  data-testid={`chat-message-${msg.role}`}
                >
                  {msg.role === "assistant" && msg.structured ? (
                    <StructuredMessageView
                      structured={msg.structured}
                      onQuickReply={handleQuickReply}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">
                      {msg.content || (isLoading ? "..." : "")}
                    </p>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe your issue or answer the questions..."
              className="min-h-[44px] max-h-32 resize-none"
              disabled={isLoading}
              data-testid="input-chat-message"
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="icon"
              data-testid="button-send-message"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function StructuredMessageView({
  structured,
  onQuickReply,
}: {
  structured: StructuredAIResponse;
  onQuickReply: (text: string) => void;
}) {
  return (
    <div className="space-y-2" data-testid="structured-response">
      <p className="text-sm whitespace-pre-wrap">{structured.message}</p>

      {structured.questions && structured.questions.length > 0 && (
        <div className="space-y-1.5" data-testid="questions-section">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <HelpCircle className="h-3 w-3" />
            Quick replies
          </div>
          <div className="flex flex-wrap gap-1.5">
            {structured.questions.map((q, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs whitespace-normal text-left"
                onClick={() => onQuickReply(q)}
                data-testid={`button-quick-reply-${idx}`}
              >
                {q}
              </Button>
            ))}
          </div>
        </div>
      )}

      {structured.steps && structured.steps.length > 0 && (
        <div className="space-y-1" data-testid="steps-section">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Wrench className="h-3 w-3" />
            Try these steps
          </div>
          <ol className="list-decimal list-inside space-y-0.5 text-sm">
            {structured.steps.map((step, idx) => (
              <li key={idx} data-testid={`text-step-${idx}`}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      {structured.phase === "COLLECT_INFO" && (
        <Badge variant="secondary" className="text-xs" data-testid="badge-phase-info">
          Gathering info
        </Badge>
      )}
      {structured.phase === "DIAGNOSE" && (
        <Badge variant="secondary" className="text-xs" data-testid="badge-phase-diagnose">
          Troubleshooting
        </Badge>
      )}
    </div>
  );
}
