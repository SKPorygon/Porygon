import WebSocketManager from "../../websockets/websocketServer";
import { DeploymentService } from "./DeploymentService";
import { ImageParser } from "../../utils/ImageParser";
import { KubernetesConfig } from "../../clients/KubernetesClient";

export interface SyncRequest {
  namespace: string;
  serviceName: string;
  desiredVersion: string;
  desiredPodCount: number;
}

/**
 * Orchestrates the synchronization of services (deployments) to desired state
 */
export class ServiceSyncOrchestrator {
  private deploymentService: DeploymentService;

  constructor(
    config: KubernetesConfig,
    private websocketManager: WebSocketManager
  ) {
    this.deploymentService = new DeploymentService(config);
  }

  /**
   * Sync a service to the desired version and pod count
   */
  async syncService(request: SyncRequest): Promise<void> {
    const { namespace, serviceName, desiredVersion, desiredPodCount } = request;

    this.websocketManager.broadcast("SYNC_STARTED", { namespace, serviceName });

    try {
      const deployment = await this.deploymentService.get(namespace, serviceName);
      const containers = deployment?.spec?.template?.spec?.containers ?? [];

      if (!Array.isArray(containers) || containers.length === 0) {
        throw new Error(`Deployment "${serviceName}" has no containers.`);
      }

      // Find the target container
      let containerIndex = this.deploymentService.findContainerIndex(
        containers,
        serviceName
      );

      if (containerIndex === -1) {
        console.warn(
          `Container "${serviceName}" not found in deployment. Using first container.`
        );
        containerIndex = 0;
      }

      // Sync image if needed
      const currentImage = containers[containerIndex].image;
      const desiredImage = ImageParser.replaceTag(currentImage, desiredVersion);

      if (currentImage !== desiredImage) {
        await this.syncImage(
          namespace,
          serviceName,
          containerIndex,
          currentImage,
          desiredImage
        );
      }

      // Sync replicas if needed
      const currentPodCount = deployment.spec.replicas;
      if (currentPodCount && currentPodCount !== desiredPodCount) {
        await this.syncReplicas(
          namespace,
          serviceName,
          currentPodCount,
          desiredPodCount
        );
      }

      this.websocketManager.broadcast("SYNC_COMPLETE", {
        serviceName,
        namespace,
        status: "success",
      });

      this.websocketManager.broadcast("SERVICE_SYNCED", {
        namespace,
        serviceName,
        actualVersion: desiredVersion,
        actualPodCount: desiredPodCount,
      });
    } catch (error: any) {
      this.websocketManager.broadcast("SYNC_COMPLETE", {
        serviceName,
        namespace,
        status: "error",
        error: error?.message ?? String(error),
      });
      throw error;
    }
  }

  /**
   * Sync the container image
   */
  private async syncImage(
    namespace: string,
    serviceName: string,
    containerIndex: number,
    currentImage: string,
    desiredImage: string
  ): Promise<void> {
    this.websocketManager.broadcast("SYNC_STEP", {
      namespace,
      serviceName,
      step: "PATCHING_IMAGE",
      from: currentImage,
      to: desiredImage,
    });

    await this.deploymentService.updateImage(
      namespace,
      serviceName,
      containerIndex,
      desiredImage
    );
  }

  /**
   * Sync the replica count
   */
  private async syncReplicas(
    namespace: string,
    serviceName: string,
    currentPodCount: number,
    desiredPodCount: number
  ): Promise<void> {
    this.websocketManager.broadcast("SYNC_STEP", {
      namespace,
      serviceName,
      step: "PATCHING_REPLICAS",
      from: currentPodCount,
      to: desiredPodCount,
    });

    await this.deploymentService.scale(namespace, serviceName, desiredPodCount);
  }
}