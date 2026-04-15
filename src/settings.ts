import { SettingSchemaDesc } from "@logseq/libs/dist/LSPlugin";

export const settingsSchema: SettingSchemaDesc[] = [
  {
    key: "linearApiKey",
    type: "string",
    title: "Linear API Key",
    description:
      "Your personal Linear API key. Generate one at https://linear.app/settings/api",
    default: "",
  },
  {
    key: "defaultTeam",
    type: "string",
    title: "Default Team Key",
    description:
      'Team key used when creating new issues (e.g. "ENG", "OPS", "DESIGN").',
    default: "",
  },
  {
    key: "showStatusInBlocks",
    type: "boolean",
    title: "Show Status in Blocks",
    description:
      "When inserting Linear issues, include status and priority as block properties.",
    default: true,
  },
];
