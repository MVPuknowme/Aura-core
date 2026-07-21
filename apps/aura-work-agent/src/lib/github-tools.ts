import { tool, type RunContext } from "@openai/agents";
import { z } from "zod";

export interface AuraAgentContext {
  actorId: string;
  actorName: string;
  explicitWriteApproval: boolean;
  operatorAuthorized: boolean;
}

const repositorySchema = z
  .string()
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Use owner/repository format");

function allowedRepositories(): Set<string> {
  const configured = process.env.GITHUB_ALLOWED_REPOS ?? "MVPuknowme/Aura-core";
  return new Set(
    configured
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

function requireAllowedRepository(repository: string): string {
  const normalized = repository.trim();
  if (!allowedRepositories().has(normalized.toLowerCase())) {
    throw new Error(`Repository is not allowlisted: ${normalized}`);
  }
  return normalized;
}

async function githubRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN is not configured");
  }

  const response = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "skygrid-aura-work-agent",
      "X-GitHub-Api-Version": "2022-11-28",
      ...init.headers,
    },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${body.slice(0, 600)}`);
  }

  return (body ? JSON.parse(body) : {}) as T;
}

export const githubRepositoryOverview = tool({
  name: "github_repository_overview",
  description:
    "Read repository metadata for an allowlisted GitHub repository. Use this before making recommendations about repository work.",
  parameters: z.object({ repository: repositorySchema }),
  execute: async (
    { repository },
    _runContext?: RunContext<AuraAgentContext>,
  ): Promise<string> => {
    const allowed = requireAllowedRepository(repository);
    const data = await githubRequest<{
      full_name: string;
      description: string | null;
      default_branch: string;
      open_issues_count: number;
      visibility: string;
      archived: boolean;
      html_url: string;
    }>(`/repos/${allowed}`);

    return JSON.stringify({
      repository: data.full_name,
      description: data.description,
      defaultBranch: data.default_branch,
      openIssueCount: data.open_issues_count,
      visibility: data.visibility,
      archived: data.archived,
      url: data.html_url,
    });
  },
});

export const githubListOpenIssues = tool({
  name: "github_list_open_issues",
  description:
    "List the newest open issues in an allowlisted GitHub repository. Pull requests are excluded.",
  parameters: z.object({
    repository: repositorySchema,
    limit: z.number().int().min(1).max(20).default(10),
  }),
  execute: async (
    { repository, limit },
    _runContext?: RunContext<AuraAgentContext>,
  ): Promise<string> => {
    const allowed = requireAllowedRepository(repository);
    const items = await githubRequest<
      Array<{
        number: number;
        title: string;
        state: string;
        html_url: string;
        pull_request?: unknown;
        labels: Array<{ name?: string }>;
      }>
    >(`/repos/${allowed}/issues?state=open&sort=updated&direction=desc&per_page=30`);

    return JSON.stringify(
      items
        .filter((item) => !item.pull_request)
        .slice(0, limit)
        .map((item) => ({
          number: item.number,
          title: item.title,
          state: item.state,
          labels: item.labels.map((label) => label.name).filter(Boolean),
          url: item.html_url,
        })),
    );
  },
});

export const githubCreateIssue = tool({
  name: "github_create_issue",
  description:
    "Create a GitHub issue in an allowlisted repository. This is a write action and always requires explicit operator approval.",
  parameters: z.object({
    repository: repositorySchema,
    title: z.string().min(3).max(160),
    body: z.string().min(1).max(20_000),
    labels: z.array(z.string().min(1).max(50)).max(10).default([]),
  }),
  needsApproval: true,
  execute: async (
    { repository, title, body, labels },
    runContext?: RunContext<AuraAgentContext>,
  ): Promise<string> => {
    if (!runContext?.context.operatorAuthorized || !runContext.context.explicitWriteApproval) {
      throw new Error("Operator authorization and explicit write approval are required");
    }

    const allowed = requireAllowedRepository(repository);
    const issue = await githubRequest<{
      number: number;
      title: string;
      html_url: string;
    }>(`/repos/${allowed}/issues`, {
      method: "POST",
      body: JSON.stringify({ title, body, labels }),
    });

    return JSON.stringify({
      created: true,
      number: issue.number,
      title: issue.title,
      url: issue.html_url,
    });
  },
});

export const githubCommentOnIssue = tool({
  name: "github_comment_on_issue",
  description:
    "Add a comment to an issue or pull request in an allowlisted repository. This is a write action and always requires explicit operator approval.",
  parameters: z.object({
    repository: repositorySchema,
    issueNumber: z.number().int().positive(),
    body: z.string().min(1).max(20_000),
  }),
  needsApproval: true,
  execute: async (
    { repository, issueNumber, body },
    runContext?: RunContext<AuraAgentContext>,
  ): Promise<string> => {
    if (!runContext?.context.operatorAuthorized || !runContext.context.explicitWriteApproval) {
      throw new Error("Operator authorization and explicit write approval are required");
    }

    const allowed = requireAllowedRepository(repository);
    const comment = await githubRequest<{ html_url: string }>(
      `/repos/${allowed}/issues/${issueNumber}/comments`,
      {
        method: "POST",
        body: JSON.stringify({ body }),
      },
    );

    return JSON.stringify({ created: true, url: comment.html_url });
  },
});
