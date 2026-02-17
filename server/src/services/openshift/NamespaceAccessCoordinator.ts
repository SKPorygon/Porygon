import { KubernetesConfig } from "../../clients/KubernetesClient";
import { AuthorizationService } from "./AuthorizationService";
import { ServiceAccountManager } from "./ServiceAccountManager";
import { RBACManager } from "./RBACManager";

/**
 * Coordinates the setup of namespace access with proper RBAC
 */
export class NamespaceAccessCoordinator {
  private authService: AuthorizationService;
  private serviceAccountManager: ServiceAccountManager;
  private rbacManager: RBACManager;

  constructor(userToken: string, clusterUrl: string) {
    const userConfig: KubernetesConfig = { token: userToken, clusterUrl };
    
    this.authService = new AuthorizationService(userConfig);
    this.serviceAccountManager = new ServiceAccountManager(userConfig);
    this.rbacManager = new RBACManager(userConfig);
  }

  /**
   * Set up complete namespace access for a service account
   * Returns the service account token
   */
  async setupAccess(
    namespace: string,
    serviceAccountName: string
  ): Promise<string> {
    try {
      // 1. Authenticate the user
      await this.authService.authenticateUser();

      // 2. Ensure service account exists
      await this.serviceAccountManager.ensureExists(namespace, serviceAccountName);

      // 3. Set up RBAC permissions
      await this.rbacManager.ensurePorygonRBAC(namespace, serviceAccountName);

      // 4. Create and return service account token
      const saToken = await this.serviceAccountManager.createToken(
        namespace,
        serviceAccountName
      );

      return saToken;
    } catch (error) {
      console.error("Error setting up namespace access:", error);
      throw error;
    }
  }
}