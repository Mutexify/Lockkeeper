import { CosmosClient } from "@azure/cosmos";
import {
  EventGridPartialEvent,
  InvocationContext,
  app,
  output,
} from "@azure/functions";
import "dotenv/config";

const cosmos_endpoint = process.env.COSMOS_ENDPOINT;
const cosmos_key = process.env.COSMOS_KEY;
if (!cosmos_endpoint || !cosmos_key) {
  throw new Error("Cosmos DB credentials missing");
}
const client = new CosmosClient({ endpoint: cosmos_endpoint, key: cosmos_key });

async function prepareContainer() {
  const { database } = await client.databases.createIfNotExists({
    id: "mutexio",
  });
  const { container } = await database.containers.createIfNotExists({
    id: "slots",
  });
  return container;
}

export async function Lockkeeper(
  message: Record<string, unknown>,
  context: InvocationContext
): Promise<EventGridPartialEvent> {
  const container = await prepareContainer();
  const items = await container.items.readAll().fetchAll();

  context.log("Service bus queue function processed message:", message);
  const timeStamp = new Date().toISOString();
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
  connection: "Locknot_SERVICEBUS",
  queueName: "LockRequests",
  return: output.eventGrid({
    topicEndpointUri: "EVENT_GRID_TOPIC_ENDPOINT",
    topicKeySetting: "EVENT_GRID_ACCESS_KEY",
  }),
  handler: Lockkeeper,
});
