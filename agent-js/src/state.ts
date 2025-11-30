import { Annotation } from "@langchain/langgraph";
import { CopilotKitStateAnnotation } from "@copilotkit/sdk-js/langgraph";
import { Connection } from "@langchain/mcp-adapters";

// Define the AgentState annotation, extending MessagesState
export const AgentStateAnnotation = Annotation.Root({
  model: Annotation<string>,
  modelSdk: Annotation<string>,
  apiKey: Annotation<string>,
  mcp_config: Annotation<Connection>,
  ...CopilotKitStateAnnotation.spec,
});

export type AgentState = typeof AgentStateAnnotation.State;
