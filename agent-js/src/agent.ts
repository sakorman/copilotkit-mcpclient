/**
 * This is the main entry point for the agent.
 * It defines the workflow graph, state, tools, nodes and edges.
 */

import { RunnableConfig } from "@langchain/core/runnables";
import {
  MemorySaver,
  START,
  StateGraph,
  Command,
  END,
} from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { Connection, MultiServerMCPClient } from "@langchain/mcp-adapters";
import { convertActionsToDynamicStructuredTools } from "@copilotkit/sdk-js/langgraph";
import isEqual from "lodash/isEqual";
import { AgentState, AgentStateAnnotation } from "./state";
import { getModel } from "./model";
import { cacheAllTopicHistoryData } from "./db/cacheHistoryData";
import { getDefaultTools } from "./tools";

// 判断操作系统
const isWindows = process.platform === "win32";

const DEFAULT_MCP_CONFIG: Record<string, Connection> = {
  supos: {
    command: isWindows ? "npx.cmd" : "npx",
    args: ["-y", "mcp-server-supos"],
    env: {
      SUPOS_API_URL: process.env.SUPOS_API_URL || "",
      SUPOS_API_KEY: process.env.SUPOS_API_KEY || "",
      SUPOS_MQTT_URL: process.env.SUPOS_MQTT_URL || "",
    },
    transport: "stdio",
  },
};

let latestMcpConfig: any = {};
let currentClient: any = null;
let mcpTools: any = [];

async function chat_node(state: AgentState, config: RunnableConfig) {
  // 1 Define the model, lower temperature for deterministic responses
  const model = getModel(state);

  const mcpConfig: any = { ...DEFAULT_MCP_CONFIG, ...(state.mcp_config || {}) };

  console.log("****mcpConfig****", mcpConfig);

  // 比较上次的配置和当前的配置是否相同，如果不同，则重新创建连接
  if (!isEqual(latestMcpConfig, mcpConfig)) {
    latestMcpConfig = mcpConfig;

    // 设置环境变量时，把当前进程的环境变量也传递过去
    let newMcpConfig: any = {};
    Object.keys(mcpConfig).forEach((key) => {
      newMcpConfig[key] = { ...mcpConfig[key] };
      if (newMcpConfig[key].env) {
        newMcpConfig[key].env = { ...process.env, ...newMcpConfig[key].env };
      }
    });

    if (currentClient) {
      currentClient.close();
    }

    // 2 Create client
    currentClient = new MultiServerMCPClient(newMcpConfig);
    // const client = new MultiServerMCPClient({
    //   math: {
    //     transport: "stdio",
    //     command: pythonCmd,
    //     args: [path.join(process.cwd(), "examples", "math_server.py")],
    //   },
    // });

    // 3 Initialize connection to the math server
    await currentClient.initializeConnections();
    mcpTools = (await currentClient.getTools()) || [];
  }

  // 4 Create the React agent width model and tools
  const agent = createReactAgent({
    llm: model,
    tools: [
      ...getDefaultTools(),
      ...convertActionsToDynamicStructuredTools(state.copilotkit.actions),
      ...mcpTools,
    ],
  });

  // 5 Invoke the model with the system message and the messages in the state
  const response = await agent.invoke({ messages: state.messages });

  // 6 Return the response, which will be added to the state
  return [
    new Command({
      goto: END,
      update: { messages: response.messages },
    }),
  ];
}

// Define the workflow graph
const workflow = new StateGraph(AgentStateAnnotation)
  .addNode("chat_node", chat_node)
  .addEdge(START, "chat_node");

const memory = new MemorySaver();

export const graph = workflow.compile({
  checkpointer: memory,
});

// 订阅mqtt保存历史数据
cacheAllTopicHistoryData(process.env.SUPOS_MQTT_URL || "");
