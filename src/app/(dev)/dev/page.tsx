/**
 * Development Tools Index
 * Central hub for all development and testing utilities
 */

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Database, MessageSquare } from "lucide-react";
import Link from "next/link";

export default function DevToolsPage() {
  const tools = [
    {
      title: "Toast Preview",
      description:
        "Preview and test all toast notification variants, durations, and actions",
      icon: MessageSquare,
      href: "/dev/toast-preview",
      badge: "New",
    },
    {
      title: "Database Health",
      description: "Check database connection and schema status",
      icon: Database,
      href: "/dev/db-health",
      badge: null,
    },
  ];

  return (
    <div className="container p-6 mx-auto max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Development Tools</h1>
        <p className="text-muted-foreground">
          Utilities for testing and debugging the application
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Card key={tool.href} className="relative">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tool.title}</CardTitle>
                      {tool.badge && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {tool.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={tool.href}>
                  <Button variant="outline" className="w-full">
                    Open Tool
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="p-4 mt-8 border border-dashed rounded-lg">
        <p className="text-sm text-muted-foreground">
          💡 <strong>Note:</strong> These tools are for development only and
          should not be accessible in production.
        </p>
      </div>
    </div>
  );
}
