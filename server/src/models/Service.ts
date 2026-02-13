export interface IService {
    name: string;
    version: string;
    underTest: boolean;
    podCount: number;
    note?: string;
    testGroupId?: string;
    previousVersion?: string;
  }
  