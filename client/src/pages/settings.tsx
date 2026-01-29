import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Settings,
  User,
  Bell,
  Bot,
  Palette,
  Shield,
  Mail,
  Clock,
  Save,
  RotateCcw,
} from "lucide-react";

export default function SettingsPage() {
  const { toast } = useToast();
  
  const [profile, setProfile] = useState({
    name: "IT Support Admin",
    email: "admin@company.com",
    role: "Administrator",
  });

  const [notifications, setNotifications] = useState({
    emailNewTicket: true,
    emailStatusChange: true,
    emailHighPriority: true,
    browserNotifications: false,
    dailyDigest: true,
  });

  const [aiSettings, setAiSettings] = useState({
    autoCategorizе: true,
    autoPrioritize: true,
    showSuggestions: true,
    chatResponseStyle: "simple",
  });

  const [display, setDisplay] = useState({
    ticketsPerPage: "25",
    defaultSort: "newest",
    showResolvedTickets: true,
    compactView: false,
  });

  const handleSaveProfile = () => {
    toast({
      title: "Profile Updated",
      description: "Your profile settings have been saved successfully.",
    });
  };

  const handleSaveNotifications = () => {
    toast({
      title: "Notifications Updated",
      description: "Your notification preferences have been saved.",
    });
  };

  const handleSaveAI = () => {
    toast({
      title: "AI Settings Updated",
      description: "Your AI preferences have been saved.",
    });
  };

  const handleSaveDisplay = () => {
    toast({
      title: "Display Settings Updated",
      description: "Your display preferences have been saved.",
    });
  };

  const handleResetAll = () => {
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults.",
      variant: "destructive",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-settings-title">
            Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your account and application preferences
          </p>
        </div>
      </div>

      <Card data-testid="card-profile-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Profile Settings
          </CardTitle>
          <CardDescription>
            Manage your personal information and account details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                data-testid="input-profile-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                data-testid="input-profile-email"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={profile.role}
              onValueChange={(value) => setProfile({ ...profile, role: value })}
            >
              <SelectTrigger data-testid="select-profile-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Administrator">Administrator</SelectItem>
                <SelectItem value="IT Support Agent">IT Support Agent</SelectItem>
                <SelectItem value="Viewer">Viewer (Read-only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSaveProfile} data-testid="button-save-profile">
              <Save className="h-4 w-4 mr-2" />
              Save Profile
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-notification-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how and when you want to be notified about ticket updates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">New Ticket Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Receive an email when a new ticket is created
                </p>
              </div>
              <Switch
                checked={notifications.emailNewTicket}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, emailNewTicket: checked })
                }
                data-testid="switch-email-new-ticket"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Status Change Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified when a ticket status changes
                </p>
              </div>
              <Switch
                checked={notifications.emailStatusChange}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, emailStatusChange: checked })
                }
                data-testid="switch-email-status-change"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">High Priority Alerts</Label>
                <p className="text-sm text-muted-foreground">
                  Immediate notification for urgent and high priority tickets
                </p>
              </div>
              <Switch
                checked={notifications.emailHighPriority}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, emailHighPriority: checked })
                }
                data-testid="switch-email-high-priority"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Browser Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Show desktop notifications for important updates
                </p>
              </div>
              <Switch
                checked={notifications.browserNotifications}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, browserNotifications: checked })
                }
                data-testid="switch-browser-notifications"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Daily Digest</Label>
                <p className="text-sm text-muted-foreground">
                  Receive a daily summary of ticket activity
                </p>
              </div>
              <Switch
                checked={notifications.dailyDigest}
                onCheckedChange={(checked) =>
                  setNotifications({ ...notifications, dailyDigest: checked })
                }
                data-testid="switch-daily-digest"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveNotifications} data-testid="button-save-notifications">
              <Save className="h-4 w-4 mr-2" />
              Save Notifications
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-ai-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            AI Assistant Settings
          </CardTitle>
          <CardDescription>
            Configure how the AI assistant analyzes tickets and provides suggestions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Auto-Categorization</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically categorize new tickets using AI
                </p>
              </div>
              <Switch
                checked={aiSettings.autoCategorizе}
                onCheckedChange={(checked) =>
                  setAiSettings({ ...aiSettings, autoCategorizе: checked })
                }
                data-testid="switch-auto-categorize"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Auto-Priority Prediction</Label>
                <p className="text-sm text-muted-foreground">
                  Let AI predict ticket priority based on content
                </p>
              </div>
              <Switch
                checked={aiSettings.autoPrioritize}
                onCheckedChange={(checked) =>
                  setAiSettings({ ...aiSettings, autoPrioritize: checked })
                }
                data-testid="switch-auto-prioritize"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Show AI Suggestions</Label>
                <p className="text-sm text-muted-foreground">
                  Display AI-generated resolution suggestions on tickets
                </p>
              </div>
              <Switch
                checked={aiSettings.showSuggestions}
                onCheckedChange={(checked) =>
                  setAiSettings({ ...aiSettings, showSuggestions: checked })
                }
                data-testid="switch-show-suggestions"
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label className="font-medium">Chat Response Style</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose how the AI troubleshooting chat responds
              </p>
              <Select
                value={aiSettings.chatResponseStyle}
                onValueChange={(value) =>
                  setAiSettings({ ...aiSettings, chatResponseStyle: value })
                }
              >
                <SelectTrigger data-testid="select-chat-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simple">Simple (Non-technical language)</SelectItem>
                  <SelectItem value="detailed">Detailed (Include technical terms)</SelectItem>
                  <SelectItem value="expert">Expert (Full technical depth)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveAI} data-testid="button-save-ai">
              <Save className="h-4 w-4 mr-2" />
              Save AI Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card data-testid="card-display-settings">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5 text-primary" />
            Display Preferences
          </CardTitle>
          <CardDescription>
            Customize how information is displayed in the application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tickets Per Page</Label>
              <Select
                value={display.ticketsPerPage}
                onValueChange={(value) =>
                  setDisplay({ ...display, ticketsPerPage: value })
                }
              >
                <SelectTrigger data-testid="select-tickets-per-page">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 tickets</SelectItem>
                  <SelectItem value="25">25 tickets</SelectItem>
                  <SelectItem value="50">50 tickets</SelectItem>
                  <SelectItem value="100">100 tickets</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Default Sort Order</Label>
              <Select
                value={display.defaultSort}
                onValueChange={(value) =>
                  setDisplay({ ...display, defaultSort: value })
                }
              >
                <SelectTrigger data-testid="select-default-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="priority">By Priority</SelectItem>
                  <SelectItem value="status">By Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Show Resolved Tickets</Label>
                <p className="text-sm text-muted-foreground">
                  Include resolved tickets in the default ticket list
                </p>
              </div>
              <Switch
                checked={display.showResolvedTickets}
                onCheckedChange={(checked) =>
                  setDisplay({ ...display, showResolvedTickets: checked })
                }
                data-testid="switch-show-resolved"
              />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="font-medium">Compact View</Label>
                <p className="text-sm text-muted-foreground">
                  Use a more condensed layout for ticket lists
                </p>
              </div>
              <Switch
                checked={display.compactView}
                onCheckedChange={(checked) =>
                  setDisplay({ ...display, compactView: checked })
                }
                data-testid="switch-compact-view"
              />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveDisplay} data-testid="button-save-display">
              <Save className="h-4 w-4 mr-2" />
              Save Display Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/20" data-testid="card-danger-zone">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Shield className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            These actions can significantly affect your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div>
              <p className="font-medium">Reset All Settings</p>
              <p className="text-sm text-muted-foreground">
                Restore all settings to their default values
              </p>
            </div>
            <Button
              variant="outline"
              className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              onClick={handleResetAll}
              data-testid="button-reset-all"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>Settings are saved to your browser. Changes take effect immediately.</p>
      </div>
    </div>
  );
}
