import { CosmosClient } from "@azure/cosmos";
import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
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
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  const container = await prepareContainer();
  const items = await container.items.readAll().fetchAll();

  return {
    body: JSON.stringify(items.resources),
    headers: {
      "Content-Type": "application/json",
    },
  };
}

app.http("lockkeeper", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: Lockkeeper,
});
