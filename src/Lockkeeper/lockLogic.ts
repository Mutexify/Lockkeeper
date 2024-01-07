import { prepareCosmosContainer } from "./helpers";
import { LockResultData, SlotData } from "./types";

export async function maybeUpdateLock(
  slotData: SlotData
): Promise<LockResultData> {
  const container = await prepareCosmosContainer();
  const updated = await container.item(slotData.id).patch({
    operations: [
      {
        op: "replace",
        path: "/blocked",
        value: slotData.blocked,
      },
    ],
  });

  const resultMessage: LockResultData = {
    result: "success",
    slotData: { id: updated.resource.id, blocked: updated.resource.blocked },
  };

  return resultMessage;
}
