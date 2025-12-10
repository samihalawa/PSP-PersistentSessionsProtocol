import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface ChromeProfile {
  name: string;
  path: string;
  directory: string; // "Default", "Profile 1"
}

export async function scanProfiles(): Promise<ChromeProfile[]> {
  const platform = os.platform();
  let userDataDir = '';

  if (platform === 'darwin') {
    userDataDir = path.join(os.homedir(), 'Library/Application Support/Google/Chrome');
  } else if (platform === 'win32') {
    userDataDir = path.join(os.homedir(), 'AppData', 'Local', 'Google', 'Chrome', 'User Data');
  } else {
    userDataDir = path.join(os.homedir(), '.config', 'google-chrome');
  }

  if (!await fs.pathExists(userDataDir)) {
    return [];
  }

  const localStatePath = path.join(userDataDir, 'Local State');
  const profiles: ChromeProfile[] = [];

  // Always check Default
  if (await fs.pathExists(path.join(userDataDir, 'Default'))) {
     profiles.push({
        name: 'Default',
        path: userDataDir,
        directory: 'Default'
     });
  }

  if (await fs.pathExists(localStatePath)) {
    try {
      const localState = await fs.readJson(localStatePath);
      const infoCache = localState.profile?.info_cache;

      if (infoCache) {
        // Clear default if we are going to re-add it from cache with better name
        // actually let's just use the cache
        const cacheProfiles: ChromeProfile[] = [];
        for (const [dirName, data] of Object.entries(infoCache)) {
           const pData = data as any;
           cacheProfiles.push({
             name: pData.name || dirName,
             path: userDataDir,
             directory: dirName
           });
        }
        return cacheProfiles;
      }
    } catch (e) {
      // ignore
    }
  }

  return profiles;
}
