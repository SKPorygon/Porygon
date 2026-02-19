import { KubernetesClient, KubernetesConfig } from "../../clients/KubernetesClient";

interface ServiceAccountSpec {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
  };
}

/**
 * Manages Kubernetes Service Accounts
 */
export class ServiceAccountManager extends KubernetesClient {
  constructor(config: KubernetesConfig) {
    super(config);
  }

  /**
   * Check if a service account exists in a namespace
   */
  async exists(namespace: string, name: string): Promise<boolean> {
    const path = `/api/v1/namespaces/${namespace}/serviceaccounts/${name}`;
    return this.resourceExists(path);
  }

  /**
   * Create a service account if it doesn't exist
   */
  async ensureExists(namespace: string, name: string): Promise<void> {
    const alreadyExists = await this.exists(namespace, name);
    
    if (alreadyExists) {
      console.log(`ServiceAccount "${name}" already exists in namespace "${namespace}".`);
      return;
    }

    const serviceAccount: ServiceAccountSpec = {
      apiVersion: "v1",
      kind: "ServiceAccount",
      metadata: { name },
    };

    await this.request(
      `/api/v1/namespaces/${namespace}/serviceaccounts`,
      {
        method: "POST",
        body: serviceAccount,
      }
    );

    console.log(`ServiceAccount "${name}" created successfully in namespace "${namespace}".`);
  }

  /**
   * Create a token for a service account using oc CLI
   */
  async createToken(namespace: string, name: string): Promise<string> {
    const command = `oc create token ${name} -n ${namespace}`;
    const token = await this.executeOcCommand(command);
    console.log(`Token created successfully for ServiceAccount "${name}".`);
    return token;
  }
}