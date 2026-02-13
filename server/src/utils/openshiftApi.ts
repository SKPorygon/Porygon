interface ServiceData {
  name: string;
  version: string;
  podCount: number;
}

export const fetchServiceData = async (
  namespace: string,
  saToken: string,
  clusterUrl: string
): Promise<ServiceData[]> => {
  console.log(`Fetching services for namespace: ${namespace}`);

  try {
    // Fetch pods from the OpenShift API
    const podsResponse = await fetch(
      `${clusterUrl}/api/v1/namespaces/${namespace}/pods`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${saToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!podsResponse.ok) {
      throw new Error(
        `Failed to fetch pods: ${podsResponse.statusText} (Status: ${podsResponse.status})`
      );
    }

    const podData = await podsResponse.json();
    const serviceMap: Record<string, { version: string; podCount: number }> =
      {};

    const unterminatedPods = podData.items.filter(
      (pod: {
        metadata: { deletionTimestamp: any };
        status: { phase: string };
      }) =>
        !pod.metadata.deletionTimestamp && pod.status.phase !== "Terminating"
    );
    
    // Process pod data to extract service information
    unterminatedPods.forEach((pod: any) => {
      const serviceName =
        pod.metadata.labels?.["app"] || pod.metadata.labels?.["name"];
      const image = pod.spec.containers[0]?.image || "unknown";
      const version = image.includes(":") ? image.split(":").pop() : "latest";

      if (!serviceMap[serviceName]) {
        serviceMap[serviceName] = { version, podCount: 0 };
      }

      serviceMap[serviceName].podCount += 1; // Count pods for the service
    });

    // Fetch deployments for additional data (e.g., services with no pods)
    const deploymentsResponse = await fetch(
      `${clusterUrl}/apis/apps/v1/namespaces/${namespace}/deployments`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${saToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!deploymentsResponse.ok) {
      throw new Error(
        `Failed to fetch deployments: ${deploymentsResponse.statusText} (Status: ${deploymentsResponse.status})`
      );
    }

    const deploymentData = await deploymentsResponse.json();

    deploymentData.items.forEach((deployment: any) => {
      const serviceName =
        deployment.metadata.labels?.["app"] || deployment.metadata.name;
      const containers = deployment.spec.template.spec.containers || [];
      const image = containers[0]?.image || "unknown";
      const version = image.includes(":") ? image.split(":").pop() : "latest";

      if (!serviceMap[serviceName]) {
        // Services without running pods are added with 0 pod count
        serviceMap[serviceName] = { version, podCount: 0 };
      }
    });

    // Convert the serviceMap object into an array
    const services: ServiceData[] = Object.entries(serviceMap).map(
      ([name, data]) => ({
        name,
        version: data.version,
        podCount: data.podCount,
      })
    );

    console.log("Fetched services:", services);
    return services;
  } catch (error) {
    console.error("Error fetching service data from OpenShift:", error);
    throw new Error("Failed to fetch service data from OpenShift");
  }
};

export const filterTerminatingPods = (pods: any[]) => {
  return pods.filter(
    (pod: {
      metadata: { deletionTimestamp: any };
      status: { phase: string };
    }) =>
      !pod.metadata.deletionTimestamp && pod.status.phase !== "Terminating"
  );
};
