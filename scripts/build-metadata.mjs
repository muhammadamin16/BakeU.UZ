import { readPublicConfig } from "../src/api/config.js";

export function publicBuildMetadata(env) {
  const config = readPublicConfig(env);
  const result = { schemaVersion: 2, phoneAccounts: config.phoneAccounts, api: config.api, miniAppAPI: config.miniAppAPI };
  const revision = env.RAILWAY_GIT_COMMIT_SHA;
  if (typeof revision === "string" && /^[0-9a-f]{40}$/i.test(revision)) result.commit = revision.toLowerCase();
  return result;
}
