export interface SlotData {
  id: string;
  blocked: boolean;
}

export type LockResult = "success" | "failure" | "error" | "not_found";

export type LockResultData = {
  slotData: SlotData;
  result: LockResult;
};
