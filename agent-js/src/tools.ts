import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { DatabaseManager } from "./db";

export function getDefaultTools() {
  const getTopicHistoryDataByDB = tool(
    async (args: any) => {
      const db = DatabaseManager.getInstance();
      const history = await db.getHistory(
        args.topic,
        args.limit,
        args.startTime ? new Date(args.startTime) : undefined,
        args.endTime ? new Date(args.endTime) : undefined
      );
      return JSON.stringify(history);
    },
    {
      name: "get-topic-history-data-by-db",
      description: "Retrieve historical data for a specific topic",
      schema: z.object({
        topic: z
          .string()
          .describe(
            "The topic to retrieve historical data for, e.g., 'home/temperature'"
          ),
        limit: z
          .number()
          .optional()
          .describe(
            "The maximum number of historical records to retrieve. Defaults to 10 if not specified."
          ),
        startTime: z
          .string()
          .optional()
          .describe(
            `Start time in ISO 8601 format, e.g., 2025-04-13T00:00:00Z. If not specified, defaults to one week before the current time: ${new Date(
              new Date().getTime() - 7 * 24 * 60 * 60 * 1000
            ).toISOString()}`
          ),
        endTime: z
          .string()
          .optional()
          .describe(
            `End time in ISO 8601 format, e.g., 2025-04-20T23:59:59Z. If not specified, defaults to the current time: ${new Date().toISOString()}`
          ),
      }),
    }
  );
  const getAllTopicHistoryDataByDB = tool(
    async (args: any) => {
      const db = DatabaseManager.getInstance();
      const history = await db.getAllHistory(
        args.limit,
        args.startTime ? new Date(args.startTime) : undefined,
        args.endTime ? new Date(args.endTime) : undefined
      );
      return {
        content: [{ type: "text", text: JSON.stringify(history) }],
      };
    },
    {
      name: "get-all-topic-history-data-by-db",
      description: "Retrieve historical data for all topics",
      schema: z.object({
        limit: z
          .number()
          .optional()
          .describe(
            "The maximum number of historical records to retrieve. Defaults to 10 if not specified."
          ),
        startTime: z
          .string()
          .optional()
          .describe(
            `Start time in ISO 8601 format, e.g., 2025-04-13T00:00:00Z. If not specified, defaults to one week before the current time: ${new Date(
              new Date().getTime() - 7 * 24 * 60 * 60 * 1000
            ).toISOString()}`
          ),
        endTime: z
          .string()
          .optional()
          .describe(
            `End time in ISO 8601 format, e.g., 2025-04-20T23:59:59Z. If not specified, defaults to the current time: ${new Date().toISOString()}`
          ),
      }),
    }
  );
  const getDBStorageStats = tool(
    async () => {
      const db = DatabaseManager.getInstance();
      const stats = await db.getStorageStats();
      return {
        content: [{ type: "text", text: JSON.stringify(stats) }],
      };
    },
    {
      name: "get-db-storage-stats",
      description:
        "Retrieve storage statistics of the database storing historical data",
      schema: z.object({}),
    }
  );

  const setRetentionPolicy = tool(
    async (args) => {
      const db = DatabaseManager.getInstance();
      await db.setRetentionPolicy(args);
      const policy = await db.getRetentionPolicy();
      return {
        content: [{ type: "text", text: JSON.stringify(policy) }],
      };
    },
    {
      name: "set-retention-policy",
      description:
        "Set the retention policy for historical data, e.g., retain for 7 days, check interval 1 day, and return the latest policy",
      schema: z.object({
        days: z.number().optional().describe("Retention days"),
        checkInterval: z
          .number()
          .optional()
          .describe("Check interval (converted to milliseconds)"),
      }),
    }
  );
  const getRetentionPolicy = tool(
    async () => {
      const db = DatabaseManager.getInstance();
      const policy = await db.getRetentionPolicy();
      return {
        content: [{ type: "text", text: JSON.stringify(policy) }],
      };
    },
    {
      name: "get-retention-policy",
      description:
        "Retrieve the retention policy for historical data, e.g., retain for 7 days, check interval 1 day",
      schema: z.object({}),
    }
  );

  return [
    getTopicHistoryDataByDB,
    getAllTopicHistoryDataByDB,
    getDBStorageStats,
    setRetentionPolicy,
    getRetentionPolicy,
  ];
}
