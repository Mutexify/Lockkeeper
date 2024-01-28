import { Container } from "@azure/cosmos";
import {
  getItemOfId,
  patchItemOfId,
  prepareCosmosContainer,
  slotDataFromDBResponse,
} from "./cosmosWrapper";
import { LockResultData, SlotData } from "./types";

export async function maybeUpdateLock(
  slotData: SlotData
): Promise<LockResultData> {
  const container = await prepareCosmosContainer();
  const item = await getItemOfId(container, slotData.id);

  if (item.statusCode === 404) {
    return notFound();
  } else if (
    item.statusCode === 200 &&
    item.resource.blocked === true &&
    slotData.blocked === true
  ) {
    return failure(item.resource);
  } else if (item.statusCode === 200) {
    return await patchItem(container, slotData);
  }
}

function notFound(): LockResultData {
  return {
    result: "not_found",
    slotData: null,
  };
}

function failure(resource: any): LockResultData {
  return {
    result: "failure",
    slotData: slotDataFromDBResponse(resource),
  };
}

async function patchItem(
  container: Container,
  slotData: SlotData
): Promise<LockResultData> {
  const updated = await patchItemOfId(container, slotData.id, {
    operations: [
      {
        op: "replace",
        path: "/blocked",
        value: slotData.blocked,
      },
    ],
  });

  if (
    updated.statusCode === 200 &&
    updated.resource.blocked === slotData.blocked
  ) {
    return {
      result: "success",
      slotData: slotDataFromDBResponse(updated.resource),
    };
  }

  return {
    result: "error",
    slotData: !updated.resource
      ? slotDataFromDBResponse(updated.resource)
      : null,
  };
}
