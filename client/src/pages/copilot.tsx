import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, Bot, User, Sparkles, Plus, CheckCircle, HelpCircle, Wrench } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ChatMessage, Conversation, StructuredAIResponse } from "@shared/schema";

interface DisplayMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  structured?: StructuredAIResponse;
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showDeflectionPrompt, setShowDeflectionPrompt] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const createConversation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations", {
        title: "New Chat",
        userId: null,
        ticketId: null,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setCurrentConversationId(data.id);
      setMessages([]);
      setShowDeflectionPrompt(false);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  const markDeflected = useMutation({
    mutationFn: async (deflected: boolean) => {
      if (!currentConversationId) return;
      return apiRequest("PATCH", `/api/conversations/${currentConversationId}`, {
        resolved: true,
        deflected,
      });
    },
    onSuccess: () => {
      setShowDeflectionPrompt(false);
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

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

      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          history,
          conversationId: currentConversationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      if (!currentConversationId && data.conversationId) {
        setCurrentConversationId(data.conversationId);
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      }

      const structured: StructuredAIResponse | undefined = data.structured;

      const assistantMessage: DisplayMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: structured?.message || "I couldn't process that. Please try again.",
        timestamp: new Date(),
        structured,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (structured?.phase === "DIAGNOSE" && messages.length >= 3) {
        setShowDeflectionPrompt(true);
      }
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

  const startNewChat = () => {
    createConversation.mutate();
  };

  const handleQuickReply = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full">
      {/* Chat History Sidebar */}
      <div className="w-64 border-r bg-muted/30 hidden md:block">
        <div className="p-4 border-b">
          <Button onClick={startNewChat} className="w-full" data-testid="button-new-chat">
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`p-3 rounded-lg cursor-pointer hover-elevate ${
                  currentConversationId === conv.id ? "bg-primary/10" : ""
                }`}
                onClick={() => setCurrentConversationId(conv.id)}
                data-testid={`conversation-item-${conv.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{conv.title}</span>
                  {conv.resolved && (
                    <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(conv.updatedAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col" data-testid="copilot-main-area">
        <div className="p-6 border-b bg-gradient-to-r from-primary/5 to-primary/10">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold" data-testid="text-page-title">Copilot Chat</h1>
                <p className="text-muted-foreground">
                  Get help with IT issues before creating a ticket
                </p>
              </div>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Bot className="h-16 w-16 mx-auto mb-4 text-primary/40" />
                <h2 className="text-xl font-semibold mb-2 text-foreground">How can I help you today?</h2>
                <p className="text-sm mb-6">
                  Describe your IT issue and I'll ask a couple of quick questions, then guide you through a fix.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
                  <Card className="cursor-pointer hover-elevate" onClick={() => sendMessage("My VPN keeps disconnecting when working from home")}>
                    <CardContent className="p-4 text-left">
                      <p className="text-sm font-medium">VPN Issues</p>
                      <p className="text-xs text-muted-foreground">Connection drops or slow speeds</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover-elevate" onClick={() => sendMessage("I can't access my email on my phone")}>
                    <CardContent className="p-4 text-left">
                      <p className="text-sm font-medium">Email Problems</p>
                      <p className="text-xs text-muted-foreground">Can't send, receive, or sync</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover-elevate" onClick={() => sendMessage("My computer is running very slowly")}>
                    <CardContent className="p-4 text-left">
                      <p className="text-sm font-medium">Slow Computer</p>
                      <p className="text-xs text-muted-foreground">Performance issues</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover-elevate" onClick={() => sendMessage("Computer screen glitching")}>
                    <CardContent className="p-4 text-left">
                      <p className="text-sm font-medium">Display Issues</p>
                      <p className="text-xs text-muted-foreground">Screen flickering or glitching</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-3 ${
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
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>

            {showDeflectionPrompt && (
              <Card className="mt-6 border-green-500/30 bg-green-500/5">
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">Did this solve your issue?</p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markDeflected.mutate(true)}
                      data-testid="button-issue-resolved"
                    >
                      <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                      Yes, issue resolved
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markDeflected.mutate(false)}
                      data-testid="button-need-ticket"
                    >
                      No, I need more help
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="p-4 border-t bg-background">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe your IT issue..."
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
        </div>
      </div>
    </div>
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
    <div className="space-y-3" data-testid="structured-response">
      <p className="text-sm whitespace-pre-wrap">{structured.message}</p>

      {structured.questions && structured.questions.length > 0 && (
        <div className="space-y-2" data-testid="questions-section">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <HelpCircle className="h-3.5 w-3.5" />
            Quick replies
          </div>
          <div className="flex flex-wrap gap-2">
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
        <div className="space-y-1.5" data-testid="steps-section">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Wrench className="h-3.5 w-3.5" />
            Try these steps
          </div>
          <ol className="list-decimal list-inside space-y-1 text-sm">
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
