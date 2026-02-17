import { KubernetesClient, KubernetesConfig } from "../../clients/KubernetesClient";

interface SelfSubjectAccessReview {
  apiVersion: string;
  kind: string;
  spec: {
    resourceAttributes: {
      namespace: string;
      verb: string;
      resource: string;
    };
  };
}

interface AccessReviewResponse {
  status: {
    allowed: boolean;
  };
}

/**
 * Handles Kubernetes RBAC and permission checks
 */
export class AuthorizationService extends KubernetesClient {
  constructor(config: KubernetesConfig) {
    super(config);
  }

  /**
   * Check if the current user/service account has permission to perform an action
   */
  async checkPermission(
    namespace: string,
    resource: string,
    verb: string
  ): Promise<boolean> {
    const reviewRequest: SelfSubjectAccessReview = {
      apiVersion: "authorization.k8s.io/v1",
      kind: "SelfSubjectAccessReview",
      spec: {
        resourceAttributes: {
          namespace,
          verb,
          resource,
        },
      },
    };

    const response = await this.request<AccessReviewResponse>(
      "/apis/authorization.k8s.io/v1/selfsubjectaccessreviews",
      {
        method: "POST",
        body: reviewRequest,
      }
    );

    return response.status.allowed === true;
  }

  /**
   * Authenticate user via oc CLI login
   */
  async authenticateUser(): Promise<void> {
    const command = `oc login --token=${this.config.token} --server=${this.config.clusterUrl}`;
    const result = await this.executeOcCommand(command);
    console.log("User authenticated successfully:", result);
  }
}