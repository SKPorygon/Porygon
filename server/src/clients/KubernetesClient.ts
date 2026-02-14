import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export interface KubernetesConfig {
  clusterUrl: string;
  token: string;
}

/**
 * Base client for Kubernetes API operations
 */
export class KubernetesClient {
  constructor(protected config: KubernetesConfig) {}

  /**
   * Make a generic API request to the Kubernetes cluster
   */
  protected async request<T>(
    path: string,
    options: {
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: any;
      contentType?: string;
    }
  ): Promise<T> {
    const url = `${this.config.clusterUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.token}`,
      "Content-Type": options.contentType || "application/json",
    };

    const response = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Kubernetes API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return response.json();
  }

  /**
   * Check if a resource exists (returns true if 200, false if 404, throws on other errors)
   */
  protected async resourceExists(path: string): Promise<boolean> {
    const url = `${this.config.clusterUrl}${path}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) return true;
    if (response.status === 404) return false;

    const errorText = await response.text();
    throw new Error(
      `Failed to check resource existence: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  /**
   * Execute oc CLI command (for operations not easily done via API)
   */
  protected async executeOcCommand(command: string): Promise<string> {
    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr && !stdout) {
        throw new Error(stderr);
      }
      return stdout.trim();
    } catch (error: any) {
      console.error("Error executing oc command:", error.stderr || error.message);
      throw new Error(error.stderr || error.message);
    }
  }
}