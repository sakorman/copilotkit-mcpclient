import mqtt from "mqtt";
import { DatabaseManager } from ".";

export function cacheAllTopicHistoryData(connectUrl:string) {
    const db = DatabaseManager.getInstance();
  
    const options = {
      clean: true,
      connectTimeout: 4000,
      clientId: "emqx_topic_all_history",
      rejectUnauthorized: false,
      reconnectPeriod: 0, // 重连次数
    };
  
    if (!connectUrl) {
      return;
    }
  
    const client = mqtt.connect(connectUrl, options);
  
    client.on("connect", function () {
      client.subscribe("#", function (err) {
        console.log("err", err);
      });
    });
  
    client.on("message", async function (topic, message) {
      const messageStr = message.toString();
      // 保存到数据库
      try {
        await db.saveMessage(topic, messageStr);
      } catch (error) {
        console.error("Error saving message to database:", error);
      }
    });
  
    client.on("error", function (error) {
      console.log("****emqx_topic_all_history****: error", error);
    });
    client.on("close", function () {
      console.log("****emqx_topic_all_history****: close");
      // 断联时重连
      client.reconnect();
    })
  }