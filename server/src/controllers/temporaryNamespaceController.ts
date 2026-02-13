import { Request, Response } from "express";
import { Profile } from "../models/Profile";
import { TestingProfile } from "../models/TestingProfile";
import WebSocketManager from "src/websockets/websocketServer";

export const createTemporaryNamespace = async (req: Request, res: Response, websocketManager: WebSocketManager) => {
  try {
    const { name, services, expirationTime, clusterUrl, saToken } = req.body;

    // Validate input
    if (!name || !services || !expirationTime || !clusterUrl || !saToken) {
      return res.status(400).json({
        error: "Missing required fields: name, services, expirationTime, clusterUrl, or saToken",
      });
    }

    // Generate a unique namespace name
    const namespaceName = `temp-${name.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

    // Kubernetes namespace manifest
    const namespaceManifest = {
      apiVersion: "v1",
      kind: "Namespace",
      metadata: {
        name: namespaceName,
        annotations: {
          "porygon.io/expiration": `${Date.now() + expirationTime * 60 * 60 * 1000}`, // Expiration timestamp
        },
      },
    };

    // Step 1: Create Namespace
    const namespaceResponse = await fetch(`${clusterUrl}/api/v1/namespaces`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${saToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(namespaceManifest),
    });

    if (!namespaceResponse.ok) {
      const errorResponse = await namespaceResponse.text();
      console.error("Failed to create namespace:", errorResponse);
      return res.status(namespaceResponse.status).json({
        error: `Failed to create namespace: ${errorResponse}`,
      });
    }

    // Step 2: Deploy Services in the Namespace
    const createdServices = [];
    for (const service of services) {
      const deploymentManifest = generateDeploymentManifest(service, namespaceName);

      const deploymentResponse = await fetch(
        `${clusterUrl}/apis/apps/v1/namespaces/${namespaceName}/deployments`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${saToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(deploymentManifest),
        }
      );

      if (!deploymentResponse.ok) {
        const errorResponse = await deploymentResponse.text();
        console.error("Failed to deploy service:", errorResponse);
        return res.status(deploymentResponse.status).json({
          error: `Failed to deploy service ${service.name}: ${errorResponse}`,
        });
      }

      createdServices.push(service);
    }

    // Step 3: Save the Testing Profile and Temporary Profile in the Database
    const testingProfile = new TestingProfile({
      name,
      services,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await testingProfile.save();

    const profile = new Profile({
      name: namespaceName,
      namespace: namespaceName,
      testingProfiles: [testingProfile],
      services: createdServices,
      temporary: true, // Mark as temporary
      expirationTime,
      clusterUrl,
    });
    await profile.save();

    return res.status(201).json({
      message: "Temporary namespace created successfully",
      profile,
    });
  } catch (error) {
    console.error("Error creating temporary namespace:", error);
    return res.status(500).json({ error: "Failed to create temporary namespace" });
  }
};

// Helper function to generate Kubernetes Deployment manifest
const generateDeploymentManifest = (service: any, namespace: string) => ({
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: {
    name: service.name,
    namespace,
  },
  spec: {
    replicas: service.podCount || 1,
    selector: {
      matchLabels: { app: service.name },
    },
    template: {
      metadata: {
        labels: { app: service.name },
      },
      spec: {
        containers: [
          {
            name: service.name,
            image: `${service.name}:${service.desiredVersion}`,
            ports: [{ containerPort: 80 }],
          },
        ],
      },
    },
  },
});
