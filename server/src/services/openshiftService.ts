import axios from "axios";
import { exec } from "child_process";
import WebSocketManager from "../websockets/websocketServer";

export const checkUserPermissions = async (
  namespace: string,
  saToken: string,
  clusterUrl: string,
  resource: string,
  verb: string
): Promise<boolean> => {
  const response = await fetch(
    `${clusterUrl}/apis/authorization.k8s.io/v1/selfsubjectaccessreviews`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${saToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiVersion: "authorization.k8s.io/v1",
        kind: "SelfSubjectAccessReview",
        spec: {
          resourceAttributes: {
            namespace,
            verb,
            resource,
          },
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to check permissions: ${response.statusText}`);
  }

  const data = await response.json();
  return data.status.allowed === true;
};

export const getServicesActualVersions = async (
  namespace: string,
  saToken: string,
  clusterUrl: string
): Promise<
  Record<
    string,
    {
      version: string;
      podCount: number;
    }
  >
> => {
  console.log("Fetching actual versions for namespace:", namespace);

  // Fetch pods in the namespace
  const podResponse = await fetch(
    `${clusterUrl}/api/v1/namespaces/${namespace}/pods`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${saToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!podResponse.ok) {
    throw new Error(`Failed to fetch pods: ${podResponse.statusText}`);
  }

  const podData = await podResponse.json();
  const versions: Record<
    string,
    {
      version: string;
      podCount: number;
    }
  > = {};

  const unterminatedPods = podData.items.filter(
    (pod: {
      metadata: { deletionTimestamp: any };
      status: { phase: string };
    }) =>
      !pod.metadata.deletionTimestamp && pod.status.phase !== "Terminating"
  );

  // Process pod data
  unterminatedPods.forEach((pod: any) => {
    const serviceName =
      pod.metadata.labels?.["app"] ||
      pod.metadata.labels?.["controller.devfile.io/devworkspace_name"] ||
      pod.metadata.labels?.["controller.devfile.io/devworkspace_id"] ||
      pod.metadata.name;

    const image = pod.spec.containers[0]?.image || "unknown";
    const version = image.includes("@sha256:")
      ? "digest-based"
      : image.includes(":")
      ? image.split(":")[1]
      : "latest";

    const podCount = (versions[serviceName]?.podCount || 0) + 1;

    versions[serviceName] = {
      version,
      podCount,
    };
  });

  // Fetch deployments to handle services with zero pods
  const deploymentResponse = await fetch(
    `${clusterUrl}/apis/apps/v1/namespaces/${namespace}/deployments`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${saToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!deploymentResponse.ok) {
    throw new Error(
      `Failed to fetch deployments: ${deploymentResponse.statusText}`
    );
  }

  const deploymentData = await deploymentResponse.json();

  deploymentData.items.forEach((deployment: any) => {
    const serviceName =
      deployment.metadata.labels?.["app"] || deployment.metadata.name;

    if (!versions[serviceName]) {
      const containers = deployment.spec.template.spec.containers || [];
      const image = containers[0]?.image || "unknown";
      const version = image.includes("@sha256:")
        ? "digest-based"
        : image.includes(":")
        ? image.split(":")[1]
        : "latest";

      // Fallback to 0 pod count for deployments without running pods
      versions[serviceName] = {
        version,
        podCount: 0,
      };
    }
  });

  console.log("Computed service versions and pod counts:", versions);
  return versions;
};

export const setupNamespaceAccessWithUserAuth = async (
  namespace: string,
  serviceAccountName: string,
  userToken: string,
  clusterUrl: string
): Promise<string> => {
  try {
    await authenticateUser(userToken, clusterUrl);

    await createServiceAccount(
      namespace,
      serviceAccountName,
      userToken,
      clusterUrl
    );

    const saToken = await createServiceAccountTokenWithUserAuth(
      namespace,
      serviceAccountName
    );

    return saToken;
  } catch (error) {
    console.error("Error setting up namespace access:", error);
    throw error;
  }
};

export const authenticateUser = async (
  userToken: string,
  clusterUrl: string
): Promise<void> => {
  return new Promise((resolve, reject) => {
    exec(
      `oc login --token=${userToken} --server=${clusterUrl}`,
      (err, stdout, stderr) => {
        if (err) {
          console.error("Error during oc login:", stderr);
          return reject(new Error(stderr));
        }
        console.log("User authenticated successfully:", stdout);
        resolve();
      }
    );
  });
};

export const createServiceAccount = async (
  namespace: string,
  serviceAccountName: string,
  userToken: string,
  clusterUrl: string
): Promise<void> => {
  const exists = await checkServiceAccountExists(
    namespace,
    serviceAccountName,
    userToken,
    clusterUrl
  );
  if (exists) {
    console.log(`ServiceAccount "${serviceAccountName}" already exists.`);
    return;
  }

  const response = await fetch(
    `${clusterUrl}/api/v1/namespaces/${namespace}/serviceaccounts`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        apiVersion: "v1",
        kind: "ServiceAccount",
        metadata: {
          name: serviceAccountName,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create ServiceAccount: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  console.log(`ServiceAccount "${serviceAccountName}" created successfully.`);
};

// Helper method to check if the ServiceAccount exists
const checkServiceAccountExists = async (
  namespace: string,
  serviceAccountName: string,
  userToken: string,
  clusterUrl: string
): Promise<boolean> => {
  const response = await fetch(
    `${clusterUrl}/api/v1/namespaces/${namespace}/serviceaccounts/${serviceAccountName}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (response.ok) {
    return true;
  } else if (response.status === 404) {
    return false;
  } else {
    const errorText = await response.text();
    throw new Error(
      `Failed to check ServiceAccount existence: ${response.status} ${response.statusText} - ${errorText}`
    );
  }
};

export const createServiceAccountTokenWithUserAuth = async (
  namespace: string,
  serviceAccountName: string
): Promise<string> => {
  return new Promise((resolve, reject) => {
    exec(
      `oc create token ${serviceAccountName} -n ${namespace}`,
      (err, stdout, stderr) => {
        if (err) {
          console.error("Error creating token:", stderr);
          return reject(new Error(stderr));
        }
        console.log("Token created successfully!");
        resolve(stdout.trim());
      }
    );
  });
};

export const syncService = async (
  namespace: string,
  serviceName: string,
  desiredVersion: string,
  desiredPodCount: number,
  saToken: string,
  clusterUrl: string,
  websocketManager: WebSocketManager
) => {
  try {
    const deploymentUrl = `${clusterUrl}/apis/apps/v1/namespaces/${namespace}/deployments/${serviceName}`;

    // Fetch current deployment
    const currentDeployment = await axios.get(deploymentUrl, {
      headers: {
        Authorization: `Bearer ${saToken}`,
        "Content-Type": "application/json",
      },
    });

    const currentImage =
      currentDeployment.data.spec.template.spec.containers[0].image;
    const currentPodCount = currentDeployment.data.spec.replicas;

    // Sync version if needed
    if (currentImage !== `${serviceName}:${desiredVersion}`) {
      console.log(`Syncing version for ${serviceName} to ${desiredVersion}`);
      const patchImage = [
        {
          op: "replace",
          path: "/spec/template/spec/containers/0/image",
          value: `${serviceName}:${desiredVersion}`,
        },
      ];

      await axios.patch(deploymentUrl, patchImage, {
        headers: {
          Authorization: `Bearer ${saToken}`,
          "Content-Type": "application/json-patch+json",
        },
      });

      console.log(`Version synced for ${serviceName}`);
    }

    // Sync pod count if needed
    if (currentPodCount !== desiredPodCount) {
      console.log(`Syncing pod count for ${serviceName} to ${desiredPodCount}`);
      const patchReplicas = [
        {
          op: "replace",
          path: "/spec/replicas",
          value: desiredPodCount,
        },
      ];

      await axios.patch(deploymentUrl, patchReplicas, {
        headers: {
          Authorization: `Bearer ${saToken}`,
          "Content-Type": "application/json-patch+json",
        },
      });

      console.log(`Pod count synced for ${serviceName}`);
    }

    websocketManager.broadcast("SYNC_COMPLETE", {
      serviceName,
      namespace,
      status: "success",
    });

    websocketManager.broadcast("SERVICE_SYNCED", {
      namespace,
      serviceName,
      actualVersion: desiredVersion,
      actualPodCount: desiredPodCount,
    });

    console.log(`Service ${serviceName} synced successfully`);
  } catch (error) {
    websocketManager.broadcast("SYNC_COMPLETE", {
      serviceName,
      namespace,
      status: "error",
      error: error.message,
    });
    console.error("Error in syncService:", error.message);
    throw error;
  }
};

// Sync a service to the desired image version
// export const syncService = async (
//   namespace: string,
//   serviceName: string,
//   desiredImage: string,
//   saToken: string,
//   clusterUrl: string
// ): Promise<void> => {
//   console.log(`Syncing service ${serviceName} in namespace ${namespace} to image ${desiredImage}`);

//   // Fetch the deployment
//   const deploymentUrl = `${clusterUrl}/apis/apps/v1/namespaces/${namespace}/deployments/${serviceName}`;
//   const response = await fetch(deploymentUrl, {
//     method: "GET",
//     headers: {
//       Authorization: `Bearer ${saToken}`,
//       "Content-Type": "application/json",
//     },
//   });

//   if (!response.ok) {
//     throw new Error(`Failed to fetch deployment for ${serviceName}: ${response.statusText}`);
//   }

//   const deployment = await response.json();

//   // Update the container image in the deployment spec
//   const containers = deployment.spec.template.spec.containers.map((container: any) => {
//     if (container.name === serviceName) {
//       container.image = desiredImage;
//     }
//     return container;
//   });

//   deployment.spec.template.spec.containers = containers;

//   // Patch the deployment with the updated image
//   const patchResponse = await fetch(deploymentUrl, {
//     method: "PATCH",
//     headers: {
//       Authorization: `Bearer ${saToken}`,
//       "Content-Type": "application/merge-patch+json",
//     },
//     body: JSON.stringify({
//       spec: {
//         template: {
//           spec: {
//             containers,
//           },
//         },
//       },
//     }),
//   });

//   if (!patchResponse.ok) {
//     throw new Error(`Failed to sync service ${serviceName}: ${patchResponse.statusText}`);
//   }

//   console.log(`Service ${serviceName} successfully synced to image ${desiredImage}`);
// };

export const listPods = async (
  namespace: string,
  userToken: string,
  clusterUrl: string
): Promise<any[]> => {
  const response = await fetch(
    `${clusterUrl}/api/v1/namespaces/${namespace}/pods`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list pods: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items;
};

// Get all Deployments in a namespace
export const getDeployments = async (
  namespace: string,
  userToken: string,
  clusterUrl: string
): Promise<any[]> => {
  const response = await fetch(
    `${clusterUrl}/apis/apps/v1/namespaces/${namespace}/deployments`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to get deployments: ${response.statusText}`);
  }

  const data = await response.json();
  return data.items;
};

// Scale a Deployment
export const scaleDeployment = async (
  namespace: string,
  deploymentName: string,
  replicas: number,
  userToken: string,
  clusterUrl: string
): Promise<void> => {
  const response = await fetch(
    `${clusterUrl}/apis/apps/v1/namespaces/${namespace}/deployments/${deploymentName}/scale`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/merge-patch+json",
      },
      body: JSON.stringify({
        apiVersion: "apps/v1",
        kind: "Scale",
        metadata: { name: deploymentName, namespace: namespace },
        spec: { replicas },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to scale deployment: ${response.statusText}`);
  }

  console.log(`Deployment ${deploymentName} scaled to ${replicas} replicas.`);
};
