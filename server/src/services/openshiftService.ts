import axios from "axios";
import { exec } from "child_process";
import WebSocketManager from "../websockets/websocketServer";

const PORYGON_ROLE_NAME = "porygon-deployment-editor";
const PORYGON_ROLEBINDING_NAME = "porygon-deployment-editor-binding";

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

const extractTagFromImage = (image: string): string => {
  // drop digest
  const withoutDigest = image.split("@")[0];

  const lastSlash = withoutDigest.lastIndexOf("/");
  const lastColon = withoutDigest.lastIndexOf(":");

  const hasTag = lastColon > lastSlash;
  if (!hasTag) return "latest";

  return withoutDigest.slice(lastColon + 1);
};

export const getServicesActualVersions = async (
  namespace: string,
  saToken: string,
  clusterUrl: string
): Promise<Record<string, { version: string; podCount: number }>> => {
  console.log("Fetching actual versions for namespace:", namespace);

  // Fetch deployments (source of truth)
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
    throw new Error(`Failed to fetch deployments: ${deploymentResponse.statusText}`);
  }

  const deploymentData = await deploymentResponse.json();

  const versions: Record<string, { version: string; podCount: number }> = {};

  for (const deployment of deploymentData.items ?? []) {
    const deploymentName = deployment?.metadata?.name;
    if (!deploymentName) continue;

    const containers = deployment?.spec?.template?.spec?.containers ?? [];
    const image = containers?.[0]?.image || "unknown";

    const version = image === "unknown" ? "unknown" : extractTagFromImage(image);

    // Prefer readyReplicas (actual running+ready pods)
    const ready = deployment?.status?.readyReplicas;
    const available = deployment?.status?.availableReplicas;

    const podCount =
      typeof ready === "number"
        ? ready
        : typeof available === "number"
        ? available
        : 0;

    versions[deploymentName] = { version, podCount };
  }

  console.log("Computed deployment versions and pod counts:", versions);
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

    // ✅ NEW: give SA permissions to patch deployments + scale
    await ensurePorygonRbac(namespace, serviceAccountName, userToken, clusterUrl);

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

/**
 * Ensure the ServiceAccount has just enough permissions to sync Deployments.
 * This is REQUIRED for PATCH on deployments and scaling.
 *
 * Uses the *userToken* (not the SA token) because at this point the SA has no permissions yet.
 */
export const ensurePorygonRbac = async (
  namespace: string,
  serviceAccountName: string,
  userToken: string,
  clusterUrl: string
): Promise<void> => {
  await ensureRoleExists(namespace, userToken, clusterUrl);
  await ensureRoleBindingExists(namespace, serviceAccountName, userToken, clusterUrl);
};

const desiredRole = (namespace: string) => ({
  apiVersion: "rbac.authorization.k8s.io/v1",
  kind: "Role",
  metadata: {
    name: PORYGON_ROLE_NAME,
    namespace,
  },
  rules: [
    {
      apiGroups: ["apps"],
      resources: ["deployments"],
      verbs: ["get", "list", "watch", "patch", "update"],
    },
    {
      apiGroups: ["apps"],
      resources: ["deployments/scale"],
      verbs: ["get", "update", "patch"],
    },
    // ✅ needed for getServicesActualVersions
    {
      apiGroups: [""],
      resources: ["pods"],
      verbs: ["get", "list", "watch"],
    },
  ],
});

const ensureRoleExists = async (
  namespace: string,
  userToken: string,
  clusterUrl: string
): Promise<void> => {
  const roleObj = desiredRole(namespace);

  const roleUrl = `${clusterUrl}/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/roles/${PORYGON_ROLE_NAME}`;

  const getResp = await fetch(roleUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
  });

  if (getResp.status === 404) {
    // Create role
    const createUrl = `${clusterUrl}/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/roles`;
    const createResp = await fetch(createUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(roleObj),
    });

    if (!createResp.ok) {
      const t = await createResp.text();
      throw new Error(
        `Failed to create Role "${PORYGON_ROLE_NAME}": ${createResp.status} ${createResp.statusText} - ${t}`
      );
    }

    console.log(
      `Role "${PORYGON_ROLE_NAME}" created successfully in namespace "${namespace}".`
    );
    return;
  }

  if (!getResp.ok) {
    const t = await getResp.text();
    throw new Error(
      `Failed to check Role existence: ${getResp.status} ${getResp.statusText} - ${t}`
    );
  }

  // ✅ Role exists → replace it (idempotent)
  const putResp = await fetch(roleUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(roleObj),
  });

  if (!putResp.ok) {
    const t = await putResp.text();
    throw new Error(
      `Failed to update Role "${PORYGON_ROLE_NAME}": ${putResp.status} ${putResp.statusText} - ${t}`
    );
  }

  console.log(
    `Role "${PORYGON_ROLE_NAME}" is up to date in namespace "${namespace}".`
  );
};


const ensureRoleBindingExists = async (
  namespace: string,
  serviceAccountName: string,
  userToken: string,
  clusterUrl: string
): Promise<void> => {
  const getUrl = `${clusterUrl}/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/${PORYGON_ROLEBINDING_NAME}`;
  const getResp = await fetch(getUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
  });

  if (getResp.ok) return;

  if (getResp.status !== 404) {
    const t = await getResp.text();
    throw new Error(
      `Failed to check RoleBinding existence: ${getResp.status} ${getResp.statusText} - ${t}`
    );
  }

  const createUrl = `${clusterUrl}/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings`;
  const createResp = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${userToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      apiVersion: "rbac.authorization.k8s.io/v1",
      kind: "RoleBinding",
      metadata: {
        name: PORYGON_ROLEBINDING_NAME,
        namespace,
      },
      subjects: [
        {
          kind: "ServiceAccount",
          name: serviceAccountName,
          namespace,
        },
      ],
      roleRef: {
        apiGroup: "rbac.authorization.k8s.io",
        kind: "Role",
        name: PORYGON_ROLE_NAME,
      },
    }),
  });

  if (!createResp.ok) {
    const t = await createResp.text();
    throw new Error(
      `Failed to create RoleBinding "${PORYGON_ROLEBINDING_NAME}": ${createResp.status} ${createResp.statusText} - ${t}`
    );
  }

  console.log(
    `RoleBinding "${PORYGON_ROLEBINDING_NAME}" created successfully for SA "${serviceAccountName}" in namespace "${namespace}".`
  );
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

type ParsedImage = {
  hasDigest: boolean;
  digest?: string; // sha256:...
  repoPart: string; // without tag/digest, e.g. quay.io/org/app
  tag?: string; // e.g. 1.0.0
  hasTag: boolean;
};

const parseContainerImage = (image: string): ParsedImage => {
  const [withoutDigest, digest] = image.split("@");
  const hasDigest = image.includes("@") && !!digest;

  const lastSlash = withoutDigest.lastIndexOf("/");
  const lastColon = withoutDigest.lastIndexOf(":");

  // If last ":" is after last "/", it's a tag separator (not a registry port)
  const hasTag = lastColon > lastSlash;

  const repoPart = hasTag ? withoutDigest.slice(0, lastColon) : withoutDigest;
  const tag = hasTag ? withoutDigest.slice(lastColon + 1) : undefined;

  return { hasDigest, digest, repoPart, tag, hasTag };
};

/**
 * Replace only the tag while preserving repo/registry path.
 * If current image has a digest, we drop it and use tag-based image (simplest stable behavior).
 */
const withReplacedTag = (currentImage: string, newTag: string): string => {
  const parsed = parseContainerImage(currentImage);
  return `${parsed.repoPart}:${newTag}`;
};

const findContainerIndexByName = (
  containers: Array<{ name: string; image: string }>,
  containerName: string
): number => containers.findIndex((c) => c.name === containerName);


export const syncService = async (
  namespace: string,
  serviceName: string,
  desiredVersion: string,
  desiredPodCount: number,
  saToken: string,
  clusterUrl: string,
  websocketManager: WebSocketManager
) => {
  websocketManager.broadcast("SYNC_STARTED", { namespace, serviceName });

  try {
    const deploymentUrl = `${clusterUrl}/apis/apps/v1/namespaces/${namespace}/deployments/${serviceName}`;

    const currentDeployment = await axios.get(deploymentUrl, {
      headers: {
        Authorization: `Bearer ${saToken}`,
        "Content-Type": "application/json",
      },
    });

    const containers =
      currentDeployment.data?.spec?.template?.spec?.containers ?? [];

    if (!Array.isArray(containers) || containers.length === 0) {
      throw new Error(`Deployment "${serviceName}" has no containers.`);
    }

    let containerIndex = findContainerIndexByName(containers, serviceName);
    if (containerIndex === -1) {
      console.warn(
        `Container "${serviceName}" not found in deployment "${serviceName}". Falling back to containers[0].`
      );
      containerIndex = 0;
    }

    const currentImage = containers[containerIndex].image as string;
    const desiredImage = withReplacedTag(currentImage, desiredVersion);

    const currentPodCount = currentDeployment.data?.spec?.replicas;

    if (currentImage !== desiredImage) {
      websocketManager.broadcast("SYNC_STEP", {
        namespace,
        serviceName,
        step: "PATCHING_IMAGE",
        from: currentImage,
        to: desiredImage,
      });

      const patchImage = [
        {
          op: "replace",
          path: `/spec/template/spec/containers/${containerIndex}/image`,
          value: desiredImage,
        },
      ];

      await axios.patch(deploymentUrl, patchImage, {
        headers: {
          Authorization: `Bearer ${saToken}`,
          "Content-Type": "application/json-patch+json",
        },
      });
    }

    if (typeof currentPodCount === "number" && currentPodCount !== desiredPodCount) {
      websocketManager.broadcast("SYNC_STEP", {
        namespace,
        serviceName,
        step: "PATCHING_REPLICAS",
        from: currentPodCount,
        to: desiredPodCount,
      });

      const patchReplicas = [
        { op: "replace", path: "/spec/replicas", value: desiredPodCount },
      ];

      await axios.patch(deploymentUrl, patchReplicas, {
        headers: {
          Authorization: `Bearer ${saToken}`,
          "Content-Type": "application/json-patch+json",
        },
      });
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
  } catch (error: any) {
    websocketManager.broadcast("SYNC_COMPLETE", {
      serviceName,
      namespace,
      status: "error",
      error: error?.message ?? String(error),
    });
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
