"use client";

import { useState, useEffect } from "react";
import { useCoAgent } from "@copilotkit/react-core";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Undo2 } from "lucide-react";
import { attempt, isEmpty, isError, omit } from "lodash";

type ConnectionType = "stdio" | "sse";

interface StdioConfig {
  command: string;
  args: string[];
  transport: "stdio";
  env?: Record<string, string>;
}

interface SSEConfig {
  url: string;
  transport: "sse";
}

type ServerConfig = StdioConfig | SSEConfig;

// Define a generic type for our state
interface AgentState {
  mcp_config: Record<string, ServerConfig>;
  modelSdk: string;
  model: string;
  apiKey: string;
}

// Local storage key for saving agent state
const STORAGE_KEY = "mcp-agent-state";

const MODEL_LIST = [
  {
    value: "openai",
    label: "OpenAI",
    models: ["gpt-4o", "gpt-4o-mini"],
  },
  {
    value: "anthropic",
    label: "Anthropic",
    models: ["claude-3-7-sonnet-latest", "claude-3-5-haiku-latest"],
  },
  {
    value: "mistralai",
    label: "Mistralai",
    models: ["codestral-latest", "mistral-saba-latest", "mistral-embed"],
  },
];

const ExternalLink = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-3 h-3 ml-1"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
    />
  </svg>
);

// // 添加内置服务
// const builtInMcpServer = {
//   supos: {
//     command: "npx",
//     args: ["-y", "mcp-server-supos"],
//     transport: "stdio",
//   },
// };

export function MCPConfigForm() {
  // Use our localStorage hook for persistent storage
  const [savedConfigs, setSavedConfigs] = useLocalStorage<
    Record<string, ServerConfig>
  >(STORAGE_KEY, {});
  const [modelCompany, setModelCompany] = useState<string>("openai");
  const [model, setModel] = useState<string>("");

  // Initialize agent state with the data from localStorage
  const { state: agentState, setState: setAgentState } = useCoAgent<AgentState>(
    {
      name: "sample_agent",
      initialState: {
        modelSdk: modelCompany,
        mcp_config: {
          // ...builtInMcpServer,
          ...savedConfigs,
        },
      },
    }
  );

  // Simple getter for configs
  const configs = agentState?.mcp_config || {};

  // Simple setter wrapper for configs
  const setConfigs = (newConfigs: Record<string, ServerConfig>) => {
    setAgentState({ ...agentState, mcp_config: newConfigs });
    setSavedConfigs(newConfigs);
  };

  const [serverName, setServerName] = useState("");
  const [connectionType, setConnectionType] = useState<ConnectionType>("stdio");
  const [command, setCommand] = useState("");
  const [args, setArgs] = useState("");
  const [env, setEnv] = useState("");
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAddServerForm, setShowAddServerForm] = useState(false);
  const [showExampleConfigs, setShowExampleConfigs] = useState(false);
  const [modelType, setModelType] = useState("select");
  const [editServer, setEditServer] = useState<string>("");

  // Calculate server statistics
  const totalServers = Object.keys(configs).length;
  const stdioServers = Object.values(configs).filter(
    (config) => config.transport === "stdio"
  ).length;
  const sseServers = Object.values(configs).filter(
    (config) => config.transport === "sse"
  ).length;

  const modelList = MODEL_LIST.filter((item) => item.value === modelCompany)[0]
    .models;

  // Set loading to false when state is loaded
  useEffect(() => {
    if (agentState) {
      setIsLoading(false);
    }
  }, [agentState]);

  const addConfig = () => {
    if (!serverName) return;
    let envJson = attempt(JSON.parse, env || "{}");
    if (isError(envJson) || isEmpty(envJson)) {
      envJson = null;
    }

    const newConfig =
      connectionType === "stdio"
        ? {
            command,
            args: args.split(" ").filter((arg) => arg.trim() !== ""),
            transport: "stdio" as const,
            ...(envJson ? { env: envJson } : {}),
          }
        : {
            url,
            transport: "sse" as const,
          };

    setConfigs({
      ...configs,
      [serverName]: newConfig,
    });

    // Reset form
    setServerName("");
    setCommand("");
    setArgs("");
    setEnv("");
    setUrl("");
    setShowAddServerForm(false);
  };

  const editConfig = () => {
    if (!serverName) return;
    let envJson = attempt(JSON.parse, env || "{}");
    if (isError(envJson) || isEmpty(envJson)) {
      envJson = null;
    }

    const newConfig =
      connectionType === "stdio"
        ? {
            command,
            args: args.split(" ").filter((arg) => arg.trim() !== ""),
            transport: "stdio" as const,
            ...(envJson ? { env: envJson } : {}),
          }
        : {
            url,
            transport: "sse" as const,
          };
    const newConfigs = omit(configs, [editServer]); // 删除旧的配置
    setConfigs({
      ...newConfigs,
      [serverName]: newConfig,
    });

    // Reset form
    setServerName("");
    setCommand("");
    setArgs("");
    setEnv("");
    setUrl("");
    setEditServer("");
    setShowAddServerForm(false);
  };

  const removeConfig = (name: string) => {
    const newConfigs = { ...configs };
    delete newConfigs[name];
    setConfigs(newConfigs);
  };

  const handleCancel = () => {
    if (editServer) {
      setServerName("");
      setCommand("");
      setArgs("");
      setEnv("");
      setUrl("");
      setEditServer("");
      setConnectionType("stdio");
    }
    setShowAddServerForm(false);
  };

  if (isLoading) {
    return <div className="p-4">Loading configuration...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-1">
          <div className="flex items-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6 mr-2 text-gray-700"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            </svg>
            <h1 className="text-3xl sm:text-5xl font-semibold">
              Open MCP Client
            </h1>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-gray-600">
              Manage and configure your MCP servers
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com/CopilotKit/mcp-client-langgraph"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span className="mr-1">GitHub Repo</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
              <a
                href="https://docs.copilotkit.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span className="mr-1">Documentation</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-4 gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <select
              value={modelCompany}
              name="modelCompany"
              onChange={(e) => {
                setModelCompany(e.target.value);
                const newModelList = MODEL_LIST.filter(
                  (item) => item.value === e.target.value
                )[0].models;
                setModel(newModelList[0]); // set default model
                setAgentState({
                  ...agentState,
                  modelSdk: e.target.value,
                  model: newModelList[0],
                });
                setModelType("select");
              }}
              className="w-full sm:w-auto px-3 pe-7 py-1.5 border rounded-md text-sm cursor-pointer min-w-48"
              style={{
                appearance: "none",
                background: `url(${process.env.NEXT_PUBLIC_ASSET_PREFIX}/chevron-down.png) 96% center no-repeat #fff`,
                backgroundSize: "18px",
              }}
            >
              {MODEL_LIST.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {modelType === "custom" ? (
              <div className="relative">
                <input
                  type="text"
                  className="w-full sm:w-auto px-3 pe-6 pe-7 py-1.5 border rounded-md text-sm bg-white"
                  onChange={(e) => {
                    setAgentState({ ...agentState, model: e.target.value });
                  }}
                />
                <Undo2
                  style={{ width: "18px" }}
                  className="absolute top-1 right-2 cursor-pointer"
                  onClick={() => {
                    setModelType("select");
                    setModel(modelList[0]);
                    setAgentState({ ...agentState, model: modelList[0] });
                  }}
                />
              </div>
            ) : (
              <select
                value={model}
                name="model"
                onChange={(e) => {
                  if (e.target.value === "custom") {
                    setModelType("custom");
                    return;
                  }
                  setAgentState({ ...agentState, model: e.target.value });
                  setModel(e.target.value);
                }}
                className="w-full sm:w-auto px-3 pe-7 py-1.5 border rounded-md text-sm cursor-pointer min-w-48"
                style={{
                  appearance: "none",
                  background: `url(${process.env.NEXT_PUBLIC_ASSET_PREFIX}/chevron-down.png) 96% center no-repeat #fff`,
                  backgroundSize: "18px",
                }}
              >
                {modelList.map((modelName) => (
                  <option key={modelName} value={modelName}>
                    {modelName}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
            )}
            <div>
              API Key:{" "}
              <input
                type="password"
                className="w-full sm:w-auto px-3 pe-7 py-1.5 border rounded-md text-sm bg-white min-w-64"
                onChange={(e) => {
                  // 加密
                  const encryptedApiKey = btoa(e.target.value || "");
                  setAgentState({ ...agentState, apiKey: encryptedApiKey });
                }}
              />
            </div>
          </div>
          <button
            onClick={() => setShowAddServerForm(true)}
            className="w-full sm:w-auto px-3 py-1.5 bg-gray-800 text-white rounded-md text-sm font-medium hover:bg-gray-700 flex items-center gap-1 justify-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add Server
          </button>
        </div>
      </div>

      {/* Server Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border rounded-md p-4">
          <div className="text-sm text-gray-500">Total Servers</div>
          <div className="text-3xl font-bold">{totalServers}</div>
        </div>
        <div className="bg-white border rounded-md p-4">
          <div className="text-sm text-gray-500">Stdio Servers</div>
          <div className="text-3xl font-bold">{stdioServers}</div>
        </div>
        <div className="bg-white border rounded-md p-4">
          <div className="text-sm text-gray-500">SSE Servers</div>
          <div className="text-3xl font-bold">{sseServers}</div>
        </div>
      </div>

      {/* Example Configs Button */}
      <div className="mb-4">
        <button
          onClick={() => setShowExampleConfigs(!showExampleConfigs)}
          className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <span>Example Configurations</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-4 h-4 ml-1 transition-transform ${
              showExampleConfigs ? "rotate-180" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>

      {/* Server List */}
      <div className="bg-white border rounded-md p-6">
        <h2 className="text-lg font-semibold mb-4">Server List</h2>

        {totalServers === 0 ? (
          <div className="text-gray-500 text-center py-10">
            No servers configured. Click &quot;Add Server&quot; to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(configs).map(([name, config]: [string, ServerConfig]) => (
              <div
                key={name}
                className="border rounded-md overflow-hidden bg-white shadow-sm"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{name}</h3>
                      <div className="inline-flex items-center px-2 py-0.5 bg-gray-100 text-xs rounded mt-1">
                        {config.transport === "stdio" ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3 h-3 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3 h-3 mr-1"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                            />
                          </svg>
                        )}
                        {config.transport}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeConfig(name)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                      <button
                        onClick={() => {
                          setEditServer(name);
                          setServerName(name);
                          setConnectionType(config.transport);
                          if (config.transport === "stdio") {
                            setCommand(config.command);
                            setArgs(config.args.join(" "));
                            setEnv(
                              config.env ? JSON.stringify(config.env) : ""
                            );
                          } else {
                            setUrl(config.url || "");
                          }
                          setShowAddServerForm(true);
                        }}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-4 h-4"
                        >
                          <path d="m18 5-2.414-2.414A2 2 0 0 0 14.172 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2" />
                          <path d="M21.378 12.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z" />
                          <path d="M8 18h1" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600">
                    {config.transport === "stdio" ? (
                      <>
                        <p>Command: {config.command}</p>
                        <p className="truncate">
                          Args: {config.args.join(" ")}
                        </p>
                        {config.env && (
                          <div className="truncate">
                            Env:
                            <pre>{JSON.stringify(config.env, null, 2)}</pre>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="truncate">URL: {config.url}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Composio & mcp.run reference */}
        <div className="mt-10 pt-4 border-t text-center text-sm text-gray-500">
          More MCP servers available on the web, e.g.{" "}
          <a
            href="https://mcp.composio.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:text-gray-900 inline-flex items-center mr-2"
          >
            mcp.composio.dev
            <ExternalLink />
          </a>
          and{" "}
          <a
            href="https://www.mcp.run/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:text-gray-900 inline-flex items-center"
          >
            mcp.run
            <ExternalLink />
          </a>
        </div>
      </div>

      {/* Add Server Modal */}
      {showAddServerForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold flex items-center">
                {editServer ? (
                  "Edit Server"
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-5 h-5 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    Add New Server
                  </>
                )}
              </h2>
              <button
                onClick={handleCancel}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  value={serverName}
                  onChange={(e) => setServerName(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  placeholder="e.g., api-service, data-processor"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Connection Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConnectionType("stdio")}
                    className={`px-3 py-2 border rounded-md text-center flex items-center justify-center ${
                      connectionType === "stdio"
                        ? "bg-gray-200 border-gray-400 text-gray-800"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Standard IO
                  </button>
                  <button
                    type="button"
                    onClick={() => setConnectionType("sse")}
                    className={`px-3 py-2 border rounded-md text-center flex items-center justify-center ${
                      connectionType === "sse"
                        ? "bg-gray-200 border-gray-400 text-gray-800"
                        : "bg-white text-gray-700"
                    }`}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 mr-1"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                    SSE
                  </button>
                </div>
              </div>

              {connectionType === "stdio" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Command
                    </label>
                    <input
                      type="text"
                      value={command}
                      onChange={(e) => setCommand(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="e.g., uvx, node, npx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Arguments
                    </label>
                    <input
                      type="text"
                      value={args}
                      onChange={(e) => setArgs(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder="e.g., mcp-server-supos"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Env
                    </label>
                    <input
                      type="text"
                      value={env}
                      onChange={(e) => setEnv(e.target.value)}
                      className="w-full px-3 py-2 border rounded-md text-sm"
                      placeholder='e.g., {"API_KEY":"your_api_key"}'
                    />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">URL</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                    placeholder="e.g., http://localhost:8000/events"
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border text-gray-700 rounded-md hover:bg-gray-50 text-sm font-medium flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  Cancel
                </button>
                <button
                  onClick={editServer ? editConfig : addConfig}
                  className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 text-sm font-medium flex items-center"
                >
                  {/* <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-4 h-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg> */}
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
