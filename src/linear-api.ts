import type {
  LinearIssue,
  LinearTeam,
  LinearViewer,
  LinearWorkflowState,
} from "./types";

const LINEAR_API = "https://api.linear.app/graphql";

function getApiKey(): string {
  const key = logseq.settings?.linearApiKey as string | undefined;
  if (!key) {
    throw new Error(
      "Linear API key not configured. Set it in plugin settings.",
    );
  }
  return key;
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const apiKey = getApiKey();
  console.log("[linear]", "GraphQL request:", query.slice(0, 80).replace(/\s+/g, " "));

  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Linear API error (${res.status}): ${text}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(`Linear GraphQL error: ${json.errors[0].message}`);
  }

  return json.data as T;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function fetchViewer(): Promise<LinearViewer> {
  const data = await gql<{ viewer: LinearViewer }>(`
    query {
      viewer { id name email }
    }
  `);
  return data.viewer;
}

/** Raw issue shape from GraphQL (labels/attachments wrapped in { nodes: [...] }). */
interface RawIssue extends Omit<LinearIssue, "labels" | "cycle" | "attachments"> {
  labels: { nodes: { name: string; color: string }[] } | null;
  attachments: { nodes: { url: string; title: string; sourceType: string }[] } | null;
  cycle: LinearIssue["cycle"] | null;
}

function normalizeIssue(raw: RawIssue): LinearIssue {
  return {
    ...raw,
    labels: raw.labels?.nodes ?? [],
    attachments: raw.attachments?.nodes ?? [],
  };
}

export async function fetchIssue(identifier: string): Promise<LinearIssue> {
  const data = await gql<{ issue: RawIssue }>(
    `
    query ($id: String!) {
      issue(id: $id) {
        id identifier title url updatedAt dueDate
        priority priorityLabel
        state { name type color }
        assignee { id name email }
        labels { nodes { name color } }
        project { name }
        cycle { name number startsAt endsAt }
        attachments { nodes { url title sourceType } }
      }
    }
    `,
    { id: identifier },
  );

  return normalizeIssue(data.issue);
}

export async function fetchMyIssues(first = 25): Promise<LinearIssue[]> {
  const data = await gql<{
    viewer: { assignedIssues: { nodes: RawIssue[] } };
  }>(
    `
    query ($first: Int!) {
      viewer {
        assignedIssues(
          first: $first
          orderBy: updatedAt
          filter: { state: { type: { nin: ["completed", "canceled"] } } }
        ) {
          nodes {
            id identifier title url updatedAt dueDate
            priority priorityLabel
            state { name type color }
            assignee { id name email }
            labels { nodes { name color } }
            project { name }
            cycle { name number startsAt endsAt }
            attachments { nodes { url title sourceType } }
          }
        }
      }
    }
    `,
    { first },
  );

  return data.viewer.assignedIssues.nodes.map(normalizeIssue);
}

export async function searchIssues(
  query: string,
  first = 15,
): Promise<LinearIssue[]> {
  const data = await gql<{
    issueSearch: { nodes: RawIssue[] };
  }>(
    `
    query ($query: String!, $first: Int!) {
      issueSearch(query: $query, first: $first) {
        nodes {
          id identifier title url updatedAt
          priority priorityLabel
          state { name type color }
          assignee { id name email }
          labels { nodes { name color } }
          project { name }
        }
      }
    }
    `,
    { query, first },
  );

  return data.issueSearch.nodes.map(normalizeIssue);
}

export async function fetchTeams(): Promise<LinearTeam[]> {
  const data = await gql<{ teams: { nodes: LinearTeam[] } }>(`
    query {
      teams { nodes { id name key } }
    }
  `);
  return data.teams.nodes;
}

export async function fetchWorkflowStates(
  teamId: string,
): Promise<LinearWorkflowState[]> {
  const data = await gql<{
    workflowStates: { nodes: LinearWorkflowState[] };
  }>(
    `
    query ($teamId: ID!) {
      workflowStates(filter: { team: { id: { eq: $teamId } } }) {
        nodes { id name type color }
      }
    }
    `,
    { teamId },
  );
  return data.workflowStates.nodes;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createIssue(
  teamKey: string,
  title: string,
  description?: string,
): Promise<LinearIssue> {
  const teams = await fetchTeams();
  const team = teams.find(
    (t) => t.key.toLowerCase() === teamKey.toLowerCase(),
  );
  if (!team) {
    throw new Error(
      `Team "${teamKey}" not found. Available: ${teams.map((t) => t.key).join(", ")}`,
    );
  }

  const data = await gql<{
    issueCreate: { success: boolean; issue: RawIssue };
  }>(
    `
    mutation ($teamId: String!, $title: String!, $description: String) {
      issueCreate(input: { teamId: $teamId, title: $title, description: $description }) {
        success
        issue {
          id identifier title url updatedAt
          priority priorityLabel
          state { name type color }
          assignee { id name email }
          labels { nodes { name color } }
          project { name }
        }
      }
    }
    `,
    { teamId: team.id, title, description: description ?? null },
  );

  if (!data.issueCreate.success) {
    throw new Error("Failed to create issue");
  }

  return normalizeIssue(data.issueCreate.issue);
}

export async function updateIssueState(
  issueId: string,
  stateId: string,
): Promise<boolean> {
  const data = await gql<{ issueUpdate: { success: boolean } }>(
    `
    mutation ($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) {
        success
      }
    }
    `,
    { id: issueId, stateId },
  );
  return data.issueUpdate.success;
}

export async function createComment(
  issueId: string,
  body: string,
): Promise<boolean> {
  const data = await gql<{ commentCreate: { success: boolean } }>(
    `
    mutation ($issueId: String!, $body: String!) {
      commentCreate(input: { issueId: $issueId, body: $body }) {
        success
      }
    }
    `,
    { issueId, body },
  );
  return data.commentCreate.success;
}
