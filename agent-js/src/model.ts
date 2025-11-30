/**
 * This module provides a function to get a model based on the configuration.
 */
import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AgentState } from "./state";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { ChatMistralAI } from "@langchain/mistralai";
// import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
// import { HttpsProxyAgent } from "https-proxy-agent";

// todo test agentProxy
// const agentProxy = new HttpsProxyAgent("http://127.0.0.1:7890");

function getModel(state: AgentState): BaseChatModel {
  /**
   * Get a model based on the environment variable.
   */
  const stateModel = state.model;
  const stateModelSdk = state.modelSdk;
  // 解密
  const stateApiKey = atob(state.apiKey || "");
  const model = process.env.MODEL || stateModel;

  console.log(
    `Using stateModelSdk: ${stateModelSdk}, stateApiKey: ${stateApiKey}, stateModel: ${stateModel}`
  );

  if (stateModelSdk === "openai") {
    return new ChatOpenAI({
      temperature: 0,
      model: model || "gpt-4o",
      apiKey: stateApiKey || undefined,
    },
      // {
      //   httpAgent: agentProxy,
      // }
    );
  }
  if (stateModelSdk === "anthropic") {
    return new ChatAnthropic({
      temperature: 0,
      modelName: model || "claude-3-7-sonnet-latest",
      apiKey: stateApiKey || undefined,
    });
  }
  if (stateModelSdk === "mistralai") {
    return new ChatMistralAI({
      temperature: 0,
      modelName: model || "codestral-latest",
      apiKey: stateApiKey || undefined,
    });
  }
  // if (stateModelSdk === "google_genai") {
  //   return new ChatGoogleGenerativeAI({
  //     temperature: 0,
  //     model: "gemini-1.5-pro",
  //     apiKey: process.env.GOOGLE_API_KEY || undefined,
  //   });
  // }

  throw new Error("Invalid model specified");
}

export { getModel };
