import { resolveSvnFileUrl, svnGetFile } from "../utils/svn.js";

export interface SvnClient {
  getFile(filePath: string): Promise<string | null>;
}

export function createSvnClient(
  repositoryUrl: string,
  username?: string,
  password?: string
): SvnClient {
  return {
    getFile: (filePath) =>
      svnGetFile(resolveSvnFileUrl(repositoryUrl, filePath), {
        username,
        password,
      }),
  };
}
