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

/** Get app group from deployment labels (OpenShift/Kubernetes app grouping) */
function getAppGroupFromDeployment(deployment: any): string {
  const labels = deployment?.metadata?.labels ?? {};
  // app.kubernetes.io/part-of = parent application (preferred for grouping)
  const partOf = labels["app.kubernetes.io/part-of"];
  if (partOf) return partOf;
  // app.kubernetes.io/name = application name
  const appName = labels["app.kubernetes.io/name"];
  if (appName) return appName;
  // Fallback: use "app" label if it looks like a group (e.g. same for multiple deployments)
  const app = labels["app"];
  if (app) return app;
  return "";
}

export const getServicesActualVersions = async (
  namespace: string,
  saToken: string,
  clusterUrl: string
): Promise<Record<string, { version: string; podCount: number; appGroup: string }>> => {
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

  const versions: Record<string, { version: string; podCount: number; appGroup: string }> = {};

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

    const appGroup = getAppGroupFromDeployment(deployment) || deploymentName;

    versions[deploymentName] = { version, podCount, appGroup };
  }

  console.log("Computed deployment versions, pod counts and app groups:", versions);
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
import { KubernetesConfig } from "../clients/KubernetesClient";
import { AuthorizationService } from "../services/openshift/AuthorizationService";
import { DeploymentService } from "../services/openshift/DeploymentService";
import { PodService } from "../services/openshift/PodService";
import { ServiceSyncOrchestrator } from "../services/openshift/ServiceSyncOrchestrator";
import { NamespaceAccessCoordinator } from "../services/openshift/NamespaceAccessCoordinator";

/**
 * Main facade for OpenShift/Kubernetes operations
 * Provides a simplified API for common operations
 */
export class OpenShiftService {
  /**
   * Check if a user has permission to perform an action on a resource
   */
  static async checkUserPermissions(
    namespace: string,
    saToken: string,
    clusterUrl: string,
    resource: string,
    verb: string
  ): Promise<boolean> {
    const config: KubernetesConfig = { token: saToken, clusterUrl };
    const authService = new AuthorizationService(config);
    return authService.checkPermission(namespace, resource, verb);
  }

  /**
   * Get actual versions and pod counts for all services in a namespace
   */
  static async getServicesActualVersions(
    namespace: string,
    saToken: string,
    clusterUrl: string
  ): Promise<Record<string, { version: string; podCount: number }>> {
    const config: KubernetesConfig = { token: saToken, clusterUrl };
    const deploymentService = new DeploymentService(config);
    return deploymentService.getVersionsAndPodCounts(namespace);
  }

  /**
   * Set up namespace access with user authentication
   * Returns a service account token
   */
  static async setupNamespaceAccessWithUserAuth(
    namespace: string,
    serviceAccountName: string,
    userToken: string,
    clusterUrl: string
  ): Promise<string> {
    const coordinator = new NamespaceAccessCoordinator(userToken, clusterUrl);
    return coordinator.setupAccess(namespace, serviceAccountName);
  }

  /**
   * Sync a service to the desired version and pod count
   */
  static async syncService(
    namespace: string,
    serviceName: string,
    desiredVersion: string,
    desiredPodCount: number,
    saToken: string,
    clusterUrl: string,
    websocketManager: WebSocketManager
  ): Promise<void> {
    const config: KubernetesConfig = { token: saToken, clusterUrl };
    const orchestrator = new ServiceSyncOrchestrator(config, websocketManager);
    
    await orchestrator.syncService({
      namespace,
      serviceName,
      desiredVersion,
      desiredPodCount,
    });
  }

  /**
   * List all pods in a namespace
   */
  static async listPods(
    namespace: string,
    userToken: string,
    clusterUrl: string
  ): Promise<any[]> {
    const config: KubernetesConfig = { token: userToken, clusterUrl };
    const podService = new PodService(config);
    return podService.list(namespace);
  }

  /**
   * Get all deployments in a namespace
   */
  static async getDeployments(
    namespace: string,
    userToken: string,
    clusterUrl: string
  ): Promise<any[]> {
    const config: KubernetesConfig = { token: userToken, clusterUrl };
    const deploymentService = new DeploymentService(config);
    return deploymentService.list(namespace);
  }

  /**
   * Scale a deployment to a specific number of replicas
   */
  static async scaleDeployment(
    namespace: string,
    deploymentName: string,
    replicas: number,
    userToken: string,
    clusterUrl: string
  ): Promise<void> {
    const config: KubernetesConfig = { token: userToken, clusterUrl };
    const deploymentService = new DeploymentService(config);
    await deploymentService.scale(namespace, deploymentName, replicas);
  }
}