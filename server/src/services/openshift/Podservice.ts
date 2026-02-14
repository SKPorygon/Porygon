import { KubernetesClient, KubernetesConfig } from "../../clients/KubernetesClient";

interface PodList {
  items: any[];
}

/**
 * Manages Kubernetes Pods
 */
export class PodService extends KubernetesClient {
  constructor(config: KubernetesConfig) {
    super(config);
  }

  /**
   * List all pods in a namespace
   */
  async list(namespace: string): Promise<any[]> {
    const response = await this.request<PodList>(
      `/api/v1/namespaces/${namespace}/pods`,
      { method: "GET" }
    );
    return response.items;
  }
}