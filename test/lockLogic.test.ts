import { Container } from "@azure/cosmos";
import { getItemOfId, patchItemOfId } from "../src/Lockkeeper/cosmosWrapper";
import { maybeUpdateLock } from "../src/Lockkeeper/lockLogic";

jest.mock("../src/Lockkeeper/cosmosWrapper", () => ({
  ...jest.requireActual("../src/Lockkeeper/cosmosWrapper"),
  getItemOfId: jest.fn(),
  patchItemOfId: jest.fn(),
  prepareCosmosContainer: jest.fn().mockResolvedValue({} as Container),
}));

describe("maybeUpdateLock", () => {
  it("should return not_found when item does not exist", async () => {
    (getItemOfId as jest.Mock).mockResolvedValue({ statusCode: 404 });

    const result = await maybeUpdateLock({
      id: "1",
      blocked: "mariusz.pudzianowski@gmail.com",
    });

    expect(result).toEqual({ result: "not_found", slotData: null });
  });

  it("should return failure when item is already blocked", async () => {
    (getItemOfId as jest.Mock).mockResolvedValue({
      statusCode: 200,
      resource: { id: "1", blocked: "adam.malysz@gmail.com" },
    });

    const result = await maybeUpdateLock({
      id: "1",
      blocked: "mariusz.pudzianowski@gmail.com",
    });

    expect(result.result).toEqual("failure");
    expect(result.slotData).toEqual({
      id: "1",
      blocked: "adam.malysz@gmail.com",
    });
  });

  it("should return success when item is not blocked and needs to be blocked", async () => {
    (getItemOfId as jest.Mock).mockResolvedValue({
      statusCode: 200,
      resource: { id: "1", blocked: null },
    });
    (patchItemOfId as jest.Mock).mockResolvedValue({
      statusCode: 200,
      resource: { id: "1", blocked: "mariusz.pudzianowski@gmail.com" },
    });

    const result = await maybeUpdateLock({
      id: "1",
      blocked: "mariusz.pudzianowski@gmail.com",
    });

    expect(result.result).toEqual("success");
    expect(result.slotData).toEqual({
      id: "1",
      blocked: "mariusz.pudzianowski@gmail.com",
    });
  });
});
