import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, Bot, User, Sparkles, Paperclip, X, FileText, Plus, Trash2, CheckCircle } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { ChatMessage, Conversation } from "@shared/schema";

interface Attachment {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  size: number;
}

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [showDeflectionPrompt, setShowDeflectionPrompt] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const maxSize = 10 * 1024 * 1024;
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "text/plain"];

    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        alert(`File "${file.name}" is too large. Maximum size is 10MB.`);
        continue;
      }

      if (!allowedTypes.includes(file.type)) {
        alert(`File type "${file.type}" is not supported. Please use images (JPEG, PNG, GIF, WebP) or text files.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: file.name,
            type: file.type,
            dataUrl,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading) return;

    const currentAttachments = [...attachments];
    const messageContent = input.trim();
    
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: messageContent || (currentAttachments.length > 0 ? `[Attached ${currentAttachments.length} file(s)]` : ""),
      timestamp: new Date(),
      attachments: currentAttachments.map(a => ({ name: a.name, type: a.type, dataUrl: a.dataUrl })),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setAttachments([]);
    setIsLoading(true);

    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments,
      }));

      const response = await fetch("/api/copilot/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          message: messageContent, 
          history,
          conversationId: currentConversationId,
          attachments: currentAttachments.map(a => ({
            name: a.name,
            type: a.type,
            dataUrl: a.dataUrl,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.content) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg?.role === "assistant") {
                    lastMsg.content += data.content;
                  }
                  return updated;
                });
              }
              if (data.done) {
                // Show deflection prompt after conversation
                if (messages.length >= 2) {
                  setShowDeflectionPrompt(true);
                }
              }
              if (data.error) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg?.role === "assistant") {
                    lastMsg.content = "I'm sorry, something went wrong. Please try again.";
                  }
                  return updated;
                });
              }
            } catch (e) {
            }
          }
        }
      }
    } catch (error) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastMsg = updated[updated.length - 1];
        if (lastMsg?.role === "assistant" && !lastMsg.content) {
          lastMsg.content = "I'm sorry, I couldn't process your request. Please try again.";
        }
        return updated;
      });
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
                  Describe your IT issue and I'll guide you through troubleshooting steps.
                  Upload screenshots or error logs for better assistance.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg mx-auto">
                  <Card className="cursor-pointer hover-elevate" onClick={() => setInput("My VPN keeps disconnecting when working from home")}>
                    <CardContent className="p-4 text-left">
                      <p className="text-sm font-medium">VPN Issues</p>
                      <p className="text-xs text-muted-foreground">Connection drops or slow speeds</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover-elevate" onClick={() => setInput("I can't access my email on my phone")}>
                    <CardContent className="p-4 text-left">
                      <p className="text-sm font-medium">Email Problems</p>
                      <p className="text-xs text-muted-foreground">Can't send, receive, or sync</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover-elevate" onClick={() => setInput("My computer is running very slowly")}>
                    <CardContent className="p-4 text-left">
                      <p className="text-sm font-medium">Slow Computer</p>
                      <p className="text-xs text-muted-foreground">Performance issues</p>
                    </CardContent>
                  </Card>
                  <Card className="cursor-pointer hover-elevate" onClick={() => setInput("I think I received a phishing email")}>
                    <CardContent className="p-4 text-left">
                      <p className="text-sm font-medium">Security Concern</p>
                      <p className="text-xs text-muted-foreground">Suspicious activity</p>
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
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-2">
                        {msg.attachments.map((att, idx) => (
                          att.type.startsWith("image/") ? (
                            <img
                              key={idx}
                              src={att.dataUrl}
                              alt={att.name}
                              className="max-w-[150px] max-h-[100px] rounded object-cover"
                            />
                          ) : (
                            <div key={idx} className="flex items-center gap-1 text-xs bg-background/20 rounded px-2 py-1">
                              <FileText className="h-3 w-3" />
                              {att.name}
                            </div>
                          )
                        ))}
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content || (isLoading ? "..." : "")}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Deflection Prompt */}
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
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-2 bg-muted/50 rounded-lg">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="relative group flex items-center gap-2 bg-background rounded px-2 py-1 text-sm"
                    data-testid={`attachment-preview-${att.id}`}
                  >
                    {att.type.startsWith("image/") ? (
                      <img
                        src={att.dataUrl}
                        alt={att.name}
                        className="w-8 h-8 object-cover rounded"
                      />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="max-w-[100px] truncate text-xs">{att.name}</span>
                    <span className="text-xs text-muted-foreground">({formatFileSize(att.size)})</span>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="p-0.5 hover:bg-destructive/20 rounded"
                      data-testid={`button-remove-attachment-${att.id}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.txt"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-file-upload"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                title="Attach files or images"
                data-testid="button-attach-file"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
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
                onClick={sendMessage}
                disabled={(!input.trim() && attachments.length === 0) || isLoading}
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
              Press Enter to send, Shift+Enter for new line. Attach screenshots for better help.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
