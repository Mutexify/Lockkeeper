import { CosmosClient } from "@azure/cosmos";
import {
  EventGridPartialEvent,
  InvocationContext,
  app,
  output,
} from "@azure/functions";
import "dotenv/config";
import { slotData } from "../Lockkeeper/types";

async function prepareCosmosContainer() {
  const cosmos_endpoint = process.env.COSMOS_ENDPOINT;
  const cosmos_key = process.env.COSMOS_KEY;
  const client = new CosmosClient({
    endpoint: cosmos_endpoint,
    key: cosmos_key,
  });
  const { database } = await client.databases.createIfNotExists({
    id: "mutexio",
  });
  const { container } = await database.containers.createIfNotExists({
    id: "slots",
  });
  return container;
}

const serviceBusOutput = output.serviceBusQueue({
  queueName: process.env.SERVICEBUS_RESULT_QUEUE_NAME,
  connection: "SERVICEBUS_CONNECTION_STRING",
});

export async function Lockkeeper(
  message: slotData,
  context: InvocationContext
): Promise<EventGridPartialEvent> {
  context.log("Trigger service bus queue function processed message:", message);

  const container = await prepareCosmosContainer();
  const updated = await container.item(message.id).patch({
    operations: [
      {
        op: "replace",
        path: "/blocked",
        value: message.blocked,
      },
    ],
  });
  const resultMessage = updated.resource;
  context.log("Updated message in DB, result: ", resultMessage);
  context.extraOutputs.set(serviceBusOutput, resultMessage);

  const timeStamp = new Date().toISOString();
  return {
    id: "message-id",
    subject: "lock-result",
    dataVersion: "1.0",
    eventType: "event-type",
    data: { result: updated.resource },
    eventTime: timeStamp,
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
