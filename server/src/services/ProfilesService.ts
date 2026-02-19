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
      name: service.name,
      version: "unknown",
      podCount: 0,
      appGroup: "__standalone__",
    };

    const isPodCountInSync = actualInfo.podCount === (service.podCount || 1); // Default desired pod count is 1
    const isVersionInSync = actualInfo.version === service.version;

    const status =
      isVersionInSync && isPodCountInSync ? "In Sync" : "Out of Sync";

    const appGroup = actualInfo.appGroup || "__standalone__";

    return {
      name: service.name,
      desiredVersion: service.version,
      desiredPodCount: service.podCount || 1,
      actualVersion: actualInfo.version,
      actualPodCount: actualInfo.podCount,
      appGroup,
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
