// import { Readable } from "stream";
// import { TextDecoder } from "util";
import WebSocketManager from "../websockets/websocketServer";
import { fetchServiceData } from "../utils/openshiftApi"; // Assuming you have a file for OpenShift API calls

interface MonitoredNamespace {
  [namespace: string]: any[];
}

const monitoredNamespaces: MonitoredNamespace = {};

export const monitorOpenShiftChanges = async (
  namespace: string,
  saToken: string,
  clusterUrl: string,
  websocketManager: WebSocketManager
) => {
  try {
    const updatedServices = await fetchServiceData(
      namespace,
      saToken,
      clusterUrl
    );

    const lastState = monitoredNamespaces[namespace] || [];
    const hasChanges =
      JSON.stringify(updatedServices) !== JSON.stringify(lastState);

    if (hasChanges) {
      console.log(`Changes detected in namespace: ${namespace}`);
      monitoredNamespaces[namespace] = updatedServices;

      websocketManager.broadcast("SERVICE_UPDATED", {
        namespace,
        services: updatedServices,
      });
    } else {
      console.log(`No changes detected in namespace: ${namespace}`);
    }

    setTimeout(
      () =>
        monitorOpenShiftChanges(
          namespace,
          saToken,
          clusterUrl,
          websocketManager
        ),
      30000
    );
  } catch (error) {
    console.error(
      `Error monitoring changes for namespace ${namespace}:`,
      error
    );

    setTimeout(
      () =>
        monitorOpenShiftChanges(
          namespace,
          saToken,
          clusterUrl,
          websocketManager
        ),
      30000
    );
  }
};








// export const monitorOpenShiftChangesWithWatch = async (
//   saToken: string,
//   clusterUrl: string,
//   websocketManager: WebSocketManager
// ) => {
//   try {
//     const url = `${clusterUrl}/api/v1/pods`;
//     const headers = { Authorization: `Bearer ${saToken}` };
//     console.log("start iteration")
//     const response = await fetch(
//         `${clusterUrl}/api/v1/pods?watch=true`,
//         // `${clusterUrl}/api/v1/namespaces/albalakyoav-dev/pods`,
//         {
//           method: "GET",
//           headers: {
//             Authorization: `Bearer ${saToken}`,
//             "Content-Type": "application/json",
//           },
//         }
//       );

//       console.log("response.body: " + response.body)

//     if (!response.body) throw new Error("Failed to open watch connection.");

//     const decoder = new TextDecoder("utf-8");

//     const nodeStream = Readable.from(response.body as any);

//     nodeStream.on("data", (chunk: Buffer) => {
//       const decoded = decoder.decode(chunk, { stream: true });
//       const lines = decoded.split("\n").filter(Boolean);

//       for (const line of lines) {
//         try {
//           const event = JSON.parse(line);
//           console.log("Received event:", event);

//           // Example: Broadcast to WebSocket clients
//           websocketManager.broadcast("SERVICE_UPDATED", event);
//         } catch (error) {
//           console.error("Error processing line:", error);
//         }
//       }
//     });

//     nodeStream.on("end", () => {
//       console.log("Stream ended. Retrying...");
//       setTimeout(() => monitorOpenShiftChangesWithWatch(saToken, clusterUrl, websocketManager), 10000); // Retry after 10 seconds
//     });

//     nodeStream.on("error", (error) => {
//       console.error("Stream error:", error);
//       setTimeout(() => monitorOpenShiftChangesWithWatch(saToken, clusterUrl, websocketManager), 10000); // Retry after 10 seconds
//     });
//   } catch (error) {
//     console.error("Error monitoring OpenShift changes with watch:", error);
//     setTimeout(() => monitorOpenShiftChangesWithWatch(saToken, clusterUrl, websocketManager), 30000); // Retry after 30 seconds
//   }
// };
