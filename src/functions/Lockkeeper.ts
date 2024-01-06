import { CosmosClient } from "@azure/cosmos";
import {
  EventGridPartialEvent,
  InvocationContext,
  app,
  output,
} from "@azure/functions";
import { ServiceBusMessage } from "@azure/service-bus";
import "dotenv/config";

async function prepareContainer() {
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
  message: Record<string, unknown>,
  context: InvocationContext
): Promise<EventGridPartialEvent> {
  const container = await prepareContainer();

  const items = await container.items.readAll().fetchAll();

  context.log("Trigger service bus queue function processed message:", message);
  const timeStamp = new Date().toISOString();

  const resultMessage: ServiceBusMessage = {
    contentType: "application/json",
    body: { result: "successBlocked" },
    timeToLive: 2 * 60 * 1000,
  };

  context.extraOutputs.set(serviceBusOutput, resultMessage);

  return {
    id: "message-id",
    subject: "subject-name",
    dataVersion: "1.0",
    eventType: "event-type",
    data: { message, items_from_db: items.resources },
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
