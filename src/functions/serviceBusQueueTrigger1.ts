import {
  EventGridPartialEvent,
  InvocationContext,
  app,
  output,
} from "@azure/functions";

export async function serviceBusQueueTrigger1(
  message: Record<string, unknown>,
  context: InvocationContext
): Promise<EventGridPartialEvent> {
  context.log("Service bus queue function processed message:", message);
  const timeStamp = new Date().toISOString();
  return {
    id: "message-id",
    subject: "subject-name",
    dataVersion: "1.0",
    eventType: "event-type",
    data: message,
    eventTime: timeStamp,
  };
}

app.serviceBusQueue("serviceBusQueueTrigger1", {
  connection: "Locknot_SERVICEBUS",
  queueName: "LockRequests",
  return: output.eventGrid({
    topicEndpointUri: "EVENT_GRID_TOPIC_ENDPOINT",
    topicKeySetting: "EVENT_GRID_ACCESS_KEY",
  }),
  handler: serviceBusQueueTrigger1,
});
