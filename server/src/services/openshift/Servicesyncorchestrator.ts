import WebSocketManager from "../../websockets/websocketServer";
import { DeploymentService } from "./DeploymentService";
import { ImageParser } from "../../utils/ImageParser";
import { KubernetesConfig } from "../../clients/KubernetesClient";
import { PostSyncHealthGuard } from "./PostSyncHealthGuard";

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
  private config: KubernetesConfig;

  constructor(
    config: KubernetesConfig,
    private websocketManager: WebSocketManager
  ) {
    this.config = config;
    this.deploymentService = new DeploymentService(config);
  }

  /**
   * Sync a service to the desired version and pod count
   */
  async syncService(request: SyncRequest): Promise<void> {
    const { namespace, serviceName, desiredVersion, desiredPodCount } = request;

    // [SYNC_DEBUG] temporary - remove after debugging
    console.log("[SYNC_DEBUG] ServiceSyncOrchestrator.syncService start:", {
      namespace,
      serviceName,
      desiredVersion,
      desiredPodCount,
    });

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

      console.log("[SYNC_DEBUG] image check:", {
        currentImage,
        desiredImage,
        willPatchImage: currentImage !== desiredImage,
      });

      if (currentImage !== desiredImage) {
        console.log("[SYNC_DEBUG] patching image...");
        await this.syncImage(
          namespace,
          serviceName,
          containerIndex,
          currentImage,
          desiredImage
        );
        console.log("[SYNC_DEBUG] image patch done");
      } else {
        console.log("[SYNC_DEBUG] skipping image patch (already same)");
      }

      // Sync replicas if needed (use != to handle 0 vs 1 and undefined; 0 is valid current)
      const currentPodCount = deployment.spec.replicas;
      const replicasDiffer = currentPodCount !== desiredPodCount;
      console.log("[SYNC_DEBUG] replicas check:", {
        currentPodCount,
        desiredPodCount,
        willPatchReplicas: replicasDiffer,
      });

      if (replicasDiffer) {
        console.log("[SYNC_DEBUG] patching replicas...");
        await this.syncReplicas(
          namespace,
          serviceName,
          currentPodCount ?? 0,
          desiredPodCount
        );
        console.log("[SYNC_DEBUG] replicas patch done");
      } else {
        console.log("[SYNC_DEBUG] skipping replicas patch (already same)");
      }

      this.websocketManager.broadcast("SYNC_COMPLETE", {
        serviceName,
        namespace,
        status: "success",
      });

      // Post-sync health check
      try {
        const healthGuard = new PostSyncHealthGuard(
          this.config,
          this.websocketManager
        );
        const healthReport = await healthGuard.checkHealth(
          namespace,
          serviceName,
          desiredPodCount,
          {
            pollIntervalMs: 2000,
            timeoutMs: 300_000, // 5 minutes
          }
        );

        if (healthReport.severity === "ok") {
          this.websocketManager.broadcast("POST_SYNC_HEALTH_OK", {
            namespace,
            serviceName,
            report: healthReport,
          });
        } else {
          this.websocketManager.broadcast("POST_SYNC_HEALTH_ALERT", {
            namespace,
            serviceName,
            report: healthReport,
          });
        }
      } catch (healthError: any) {
        console.warn(`Health check failed for ${serviceName}:`, healthError);
        // Don't fail the sync if health check fails
        this.websocketManager.broadcast("POST_SYNC_HEALTH_ALERT", {
          namespace,
          serviceName,
          report: {
            namespace,
            serviceName,
            severity: "error" as const,
            summary: `Health check error: ${healthError?.message ?? String(healthError)}`,
            issues: [
              {
                type: "HealthCheckError",
                message: healthError?.message ?? String(healthError),
              },
            ],
            suggestedActions: [],
            timestamps: {
              detectedAt: new Date().toISOString(),
            },
          },
        });
      }

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