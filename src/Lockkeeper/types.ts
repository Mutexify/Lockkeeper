export interface SlotData {
  id: string;
  blocked: string | false;
}

export type LockResult = "success" | "failure" | "error" | "not_found";

export type LockResultData = {
  slotData: SlotData;
  result: LockResult;
};
