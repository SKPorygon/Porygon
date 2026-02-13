import { IProfile } from "../models/Profile";
import { getServicesActualVersions } from "./openshiftService";

export const createFullyUpdatedProfile = async (profile: IProfile) => {
  const actualData = await getServicesActualVersions(
    profile.namespace,
    profile.saToken,
    profile.clusterUrl
  );

  const enrichedServices = profile.services.map((service) => {
    const actualInfo = actualData[service.name] || {
      version: "unknown",
      podCount: 0,
    };

    const isPodCountInSync = actualInfo.podCount === (service.podCount || 1); // Default desired pod count is 1
    const isVersionInSync = actualInfo.version === service.version;

    const status =
      isVersionInSync && isPodCountInSync ? "In Sync" : "Out of Sync";

    return {
      name: service.name,
      desiredVersion: service.version,
      desiredPodCount: service.podCount || 1,
      actualVersion: actualInfo.version,
      actualPodCount: actualInfo.podCount,
      underTest: service.underTest,
      testGroupId: service.testGroupId,
      note: service.note,
      status,
    };
  });

  return {
    ...profile,
    services: enrichedServices,
  };
};
