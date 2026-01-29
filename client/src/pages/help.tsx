import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  HelpCircle,
  Ticket,
  Bot,
  Cloud,
  LayoutDashboard,
  Search,
  CheckCircle,
  AlertCircle,
  Clock,
  MessageSquare,
  Zap,
  BookOpen,
  Mail,
  Phone,
} from "lucide-react";

const gettingStartedSteps = [
  {
    step: 1,
    title: "Navigate to the Dashboard",
    description: "Start by viewing the Dashboard to see an overview of all tickets, including statistics on open, pending, and resolved issues.",
  },
  {
    step: 2,
    title: "Create Your First Ticket",
    description: "Click 'New Ticket' in the sidebar to submit a support request. Fill in the subject, description, and requester email.",
  },
  {
    step: 3,
    title: "Let AI Analyze Your Ticket",
    description: "After creating a ticket, our AI automatically categorizes it, predicts priority, and suggests resolution steps.",
  },
  {
    step: 4,
    title: "Use AI Troubleshooting Chat",
    description: "Open any ticket and click 'Start Troubleshooting Chat' to get personalized, step-by-step guidance from our AI assistant.",
  },
];

const faqItems = [
  {
    question: "How does the AI categorization work?",
    answer: "When you create a ticket, our AI analyzes the subject and description to automatically determine the most appropriate category (Hardware, Software, Network, Security, or Other) and priority level. This helps route tickets to the right team faster.",
  },
  {
    question: "What is the AI Troubleshooting Chat?",
    answer: "The AI Troubleshooting Chat is an interactive assistant available on each ticket's detail page. It understands your specific issue and provides step-by-step troubleshooting guidance in plain, easy-to-follow language. You can ask follow-up questions for more help.",
  },
  {
    question: "How do I connect to ServiceNow?",
    answer: "Navigate to the ServiceNow page from the sidebar. You'll need your ServiceNow instance URL and authentication credentials (either username/password for Basic auth, or OAuth client credentials). Once configured, you can sync tickets bidirectionally.",
  },
  {
    question: "Can I import existing incidents from ServiceNow?",
    answer: "Yes! On the ServiceNow page, click 'Pull Incidents' to import existing incidents from your ServiceNow instance. They'll be converted to local tickets that you can manage and track.",
  },
  {
    question: "What do the different ticket statuses mean?",
    answer: "Open: New ticket awaiting attention. In Progress: Being actively worked on. Pending: Waiting for user response or external action. Resolved: Issue has been fixed. Closed: Ticket is complete and archived.",
  },
  {
    question: "How do I update a ticket's status?",
    answer: "Open the ticket detail page and use the status dropdown to change between Open, In Progress, Pending, Resolved, or Closed. If connected to ServiceNow, the status will automatically sync.",
  },
  {
    question: "What if the AI suggestions aren't helpful?",
    answer: "You can always use the AI Troubleshooting Chat to ask more specific questions. The chat assistant can provide alternative solutions and adapt based on what you've already tried.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. All data is stored securely and communications are encrypted. ServiceNow integrations use industry-standard authentication methods (Basic Auth or OAuth 2.0).",
  },
];

const featureGuides = [
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description: "Your command center for IT support operations",
    details: [
      "View total ticket counts by status (Open, In Progress, Pending, Resolved)",
      "See recent tickets at a glance",
      "Monitor ServiceNow connection status",
      "Track AI-generated insights and category distribution",
    ],
  },
  {
    icon: Ticket,
    title: "Ticket Management",
    description: "Create, track, and resolve support tickets efficiently",
    details: [
      "Create new tickets with subject, description, and requester email",
      "View all tickets in a sortable, searchable list",
      "Update ticket status, priority, and category",
      "Delete tickets when no longer needed",
      "See full ticket history and AI suggestions",
    ],
  },
  {
    icon: Bot,
    title: "AI Features",
    description: "Intelligent automation to speed up resolution",
    details: [
      "Automatic category prediction based on ticket content",
      "Priority assessment to help triage urgent issues",
      "Resolution suggestions based on similar past issues",
      "Interactive troubleshooting chat with step-by-step guidance",
      "Context-aware responses that understand your specific ticket",
    ],
  },
  {
    icon: Cloud,
    title: "ServiceNow Integration",
    description: "Seamless connection with your ServiceNow instance",
    details: [
      "Two-way sync between local tickets and ServiceNow incidents",
      "Import existing incidents from ServiceNow",
      "Create ServiceNow incidents directly from tickets",
      "Automatic status synchronization when updating tickets",
      "Support for both Basic and OAuth authentication",
    ],
  },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaq = faqItems.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-8">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <HelpCircle className="h-10 w-10 text-primary" />
          <h1 className="text-3xl font-bold" data-testid="text-help-title">
            Smart IT Copilot Help Center
          </h1>
        </div>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Everything you need to know about using Smart IT Copilot to manage IT
          support tickets efficiently with AI-powered assistance.
        </p>
      </div>

      <div className="relative max-w-md mx-auto">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search help topics..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-help-search"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Getting Started
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {gettingStartedSteps.map((item) => (
              <div
                key={item.step}
                className="flex gap-4 p-4 rounded-lg border bg-muted/30"
                data-testid={`card-getting-started-${item.step}`}
              >
                <div className="flex-shrink-0">
                  <Badge
                    variant="secondary"
                    className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold"
                  >
                    {item.step}
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-primary" />
          Feature Guides
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {featureGuides.map((feature) => (
            <Card key={feature.title} data-testid={`card-feature-${feature.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <feature.icon className="h-5 w-5 text-primary" />
                  {feature.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {feature.details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFaq.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No matching questions found. Try a different search term.</p>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {filteredFaq.map((item, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  data-testid={`faq-item-${index}`}
                >
                  <AccordionTrigger className="text-left">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Ticket Status Reference
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="flex items-center gap-2 p-3 rounded-lg border">
              <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                Open
              </Badge>
              <span className="text-sm text-muted-foreground">New ticket</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border">
              <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
                In Progress
              </Badge>
              <span className="text-sm text-muted-foreground">Being worked on</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border">
              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                Pending
              </Badge>
              <span className="text-sm text-muted-foreground">Awaiting response</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border">
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                Resolved
              </Badge>
              <span className="text-sm text-muted-foreground">Issue fixed</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg border">
              <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                Closed
              </Badge>
              <span className="text-sm text-muted-foreground">Completed</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            Need More Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
              <Mail className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold">Email Support</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Get help from our support team
                </p>
                <Button variant="outline" size="sm" data-testid="button-email-support">
                  support@smartitcopilot.com
                </Button>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
              <Phone className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-semibold">Phone Support</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Available Mon-Fri, 9am-5pm EST
                </p>
                <Button variant="outline" size="sm" data-testid="button-phone-support">
                  1-800-IT-HELP
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>Smart IT Copilot v1.0 | Last updated: January 2026</p>
      </div>
    </div>
  );
}
