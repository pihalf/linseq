export interface LinearState {
  name: string;
  type: string;
  color: string;
}

export interface LinearLabel {
  name: string;
  color: string;
}

export interface LinearUser {
  id: string;
  name: string;
  email: string;
}

export interface LinearProject {
  name: string;
}

export interface LinearCycle {
  name: string | null;
  number: number;
  startsAt: string;
  endsAt: string;
}

export interface LinearAttachment {
  url: string;
  title: string;
  sourceType: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  state: LinearState;
  priority: number;
  priorityLabel: string;
  assignee: LinearUser | null;
  labels: LinearLabel[];
  project: LinearProject | null;
  cycle: LinearCycle | null;
  dueDate: string | null;
  attachments: LinearAttachment[];
  url: string;
  updatedAt: string;
}

export interface LinearTeam {
  id: string;
  name: string;
  key: string;
}

export interface LinearWorkflowState {
  id: string;
  name: string;
  type: string;
  color: string;
}

export interface LinearViewer {
  id: string;
  name: string;
  email: string;
}

export interface PluginSettings {
  linearApiKey: string;
  defaultTeam: string;
  showStatusInBlocks: boolean;
}
