import {
  EventGridPartialEvent,
  InvocationContext,
  app,
  output,
} from "@azure/functions";
import "dotenv/config";
import { maybeUpdateLock } from "../Lockkeeper/lockLogic";
import { SlotData } from "../Lockkeeper/types";

const serviceBusOutput = output.serviceBusQueue({
  queueName: process.env.SERVICEBUS_RESULT_QUEUE_NAME,
  connection: "SERVICEBUS_CONNECTION_STRING",
});

export async function Lockkeeper(
  message: SlotData,
  context: InvocationContext
): Promise<EventGridPartialEvent> {
  context.log("Trigger service bus queue function processed message:", message);
  const resultMessage = await maybeUpdateLock(message);
  context.log("Updated message in DB, result: ", resultMessage);

  context.extraOutputs.set(serviceBusOutput, resultMessage);
  return {
    id: "message-id",
    subject: "lock-result",
    dataVersion: "1.0",
    eventType: "event-type",
    data: resultMessage,
    eventTime: new Date().toISOString(),
  };
}

app.serviceBusQueue("lockkeeper", {
  connection: "SERVICEBUS_CONNECTION_STRING",
  queueName: process.env.SERVICEBUS_TRIGGER_QUEUE_NAME,
  return: output.eventGrid({
    topicEndpointUri: "EVENT_GRID_TOPIC_ENDPOINT",
    topicKeySetting: "EVENT_GRID_ACCESS_KEY",
  }),
  extraOutputs: [serviceBusOutput],
  handler: Lockkeeper,
});
