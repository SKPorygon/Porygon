import { IProfile } from "../models/Profile";
import { OpenShiftService } from "./openshiftService";

export const createFullyUpdatedProfile = async (profile: IProfile) => {
  const actualData = await OpenShiftService.getServicesActualVersions(
    profile.namespace,
    profile.saToken,
    profile.clusterUrl
  );

  const enrichedServices = profile.services.map((service) => {
    const actualInfo = actualData[service.name] || {
      version: "unknown",
      podCount: 0,
      appGroup: service.name,
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
      appGroup: actualInfo.appGroup ?? service.name,
    };
  });

  return {
    ...profile,
    services: enrichedServices,
  };
};
