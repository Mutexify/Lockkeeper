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
    return {
      result: "not_found",
      slotData: null,
    };
  } else if (
    item.statusCode === 200 &&
    item.resource.blocked === true &&
    slotData.blocked === true
  ) {
    return {
      result: "failure",
      slotData: slotDataFromDBResponse(item.resource),
    };
  } else if (item.statusCode === 200) {
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
}
