import { KubernetesClient, KubernetesConfig } from "../../clients/KubernetesClient";

const PORYGON_ROLE_NAME = "porygon-deployment-editor";
const PORYGON_ROLEBINDING_NAME = "porygon-deployment-editor-binding";

interface RoleRule {
  apiGroups: string[];
  resources: string[];
  verbs: string[];
}

interface Role {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
  };
  rules: RoleRule[];
}

interface RoleBinding {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    namespace: string;
  };
  subjects: Array<{
    kind: string;
    name: string;
    namespace: string;
  }>;
  roleRef: {
    apiGroup: string;
    kind: string;
    name: string;
  };
}

/**
 * Manages RBAC Roles and RoleBindings for service accounts
 */
export class RBACManager extends KubernetesClient {
  constructor(config: KubernetesConfig) {
    super(config);
  }

  /**
   * Ensure the Porygon role and rolebinding exist for a service account
   */
  async ensurePorygonRBAC(
    namespace: string,
    serviceAccountName: string
  ): Promise<void> {
    await this.ensureRoleExists(namespace);
    await this.ensureRoleBindingExists(namespace, serviceAccountName);
  }

  /**
   * Get the desired role specification
   */
  private getRoleSpec(namespace: string): Role {
    return {
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
        {
          apiGroups: [""],
          resources: ["pods"],
          verbs: ["get", "list", "watch"],
        },
      ],
    };
  }

  /**
   * Ensure the Porygon role exists (create or update)
   */
  private async ensureRoleExists(namespace: string): Promise<void> {
    const roleSpec = this.getRoleSpec(namespace);
    const rolePath = `/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/roles/${PORYGON_ROLE_NAME}`;

    const exists = await this.resourceExists(rolePath);

    if (!exists) {
      await this.request(
        `/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/roles`,
        {
          method: "POST",
          body: roleSpec,
        }
      );
      console.log(`Role "${PORYGON_ROLE_NAME}" created in namespace "${namespace}".`);
      return;
    }

    // Role exists, update it to ensure it's current
    await this.request(rolePath, {
      method: "PUT",
      body: roleSpec,
    });
    console.log(`Role "${PORYGON_ROLE_NAME}" updated in namespace "${namespace}".`);
  }

  /**
   * Ensure the Porygon rolebinding exists
   */
  private async ensureRoleBindingExists(
    namespace: string,
    serviceAccountName: string
  ): Promise<void> {
    const bindingPath = `/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings/${PORYGON_ROLEBINDING_NAME}`;

    const exists = await this.resourceExists(bindingPath);
    if (exists) {
      console.log(`RoleBinding "${PORYGON_ROLEBINDING_NAME}" already exists.`);
      return;
    }

    const roleBinding: RoleBinding = {
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
    };

    await this.request(
      `/apis/rbac.authorization.k8s.io/v1/namespaces/${namespace}/rolebindings`,
      {
        method: "POST",
        body: roleBinding,
      }
    );

    console.log(
      `RoleBinding "${PORYGON_ROLEBINDING_NAME}" created for ServiceAccount "${serviceAccountName}".`
    );
  }
}