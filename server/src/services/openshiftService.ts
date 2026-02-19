import WebSocketManager from "../websockets/websocketServer";
import { KubernetesConfig } from "../clients/KubernetesClient";
import { AuthorizationService } from "../services/openshift/AuthorizationService";
import {
  DeploymentService,
  DeploymentInfo,
} from "../services/openshift/DeploymentService";
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
  ): Promise<Record<string, DeploymentInfo>> {
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