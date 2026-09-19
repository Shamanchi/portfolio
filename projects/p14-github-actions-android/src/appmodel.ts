export interface AppModel {
  applicationId: string;
  minSdk: number;
  compileSdk: number;
  targetSdk: number;
  usesNetwork: boolean;
  permissions: string[];
  releaseMinify: boolean;
  name: string;
}

export const DEFAULT_APP: AppModel = {
  name: "Run Notes",
  applicationId: "dev.shamanchi.runnotes",
  minSdk: 26,
  compileSdk: 35,
  targetSdk: 35,
  usesNetwork: true,
  permissions: ["android.permission.INTERNET"],
  releaseMinify: true,
};

export function renderManifest(app: AppModel, versionName: string, versionCode: number): string {
  const permissionBlock = app.permissions.map((permission) => `    <uses-permission android:name="${permission}" />`).join("\n");
  return `<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${app.applicationId}"
    android:versionCode="${versionCode}"
    android:versionName="${versionName}">

${permissionBlock}
    <application
        android:label="${app.name}"
        android:usesCleartextTraffic="false" />
</manifest>
`;
}