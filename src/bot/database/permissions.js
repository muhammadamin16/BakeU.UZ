import {
  closeSync, constants, fchownSync, fstatSync,
  lstatSync, openSync, readFileSync,
} from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const applicationData = resolve(fileURLToPath(new URL("../data", import.meta.url)));
export class SQLitePermissionError extends Error {
  constructor(reason) {
    super("SQLite storage preparation failed. Check DATABASE_PATH, the existing /data volume and its ownership. No database is replaced or deleted; do not recreate the volume or use chmod 777.");
    this.name = "SQLitePermissionError";
    this.reason = reason;
  }
}
function statIfPresent(path) {
  try { return lstatSync(path); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}
function childOf(path, root) {
  const rest = relative(root, path);
  return rest !== "" && rest !== ".." && !rest.startsWith(".." + sep) && !isAbsolute(rest);
}
function safeFile(stat) { return stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1; }
function prepareDirectory(path, root, uid, gid) {
  const descriptors = [];
  const directoryFlags = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_DIRECTORY;
  try {
    let parent = openSync("/", directoryFlags); descriptors.push(parent);
    // Anchor validation with held FDs. Only the literal /data mount directory
    // can be chowned; neither descendants nor existing SQLite files are changed.
    for (const part of root.split(sep).filter(Boolean)) {
      const child = `/proc/self/fd/${parent}/${part}`;
      const stat = statIfPresent(child);
      if (!stat || !stat.isDirectory() || stat.isSymbolicLink()) throw new SQLitePermissionError("unsafe_path");
      parent = openSync(child, directoryFlags); descriptors.push(parent);
    }
    const mount = parent;
    let parentExists = true;
    for (const part of relative(root, dirname(path)).split(sep).filter(Boolean)) {
      const child = `/proc/self/fd/${parent}/${part}`;
      const stat = statIfPresent(child);
      if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) throw new SQLitePermissionError("unsafe_path");
      // Missing descendants are created later by SQLite startup AS NODE.
      if (!stat) { parentExists = false; break; }
      parent = openSync(child, directoryFlags); descriptors.push(parent);
    }
    const database = `/proc/self/fd/${parent}/${basename(path)}`;
    const files = parentExists ? [database, database + "-wal", database + "-shm", database + "-journal"] : [];
    for (const file of files) {
      const stat = statIfPresent(file);
      if (stat && !safeFile(stat)) throw new SQLitePermissionError("unsafe_path");
    }
    if (root === "/data") {
      const stat = fstatSync(mount);
      if (stat.uid !== uid || stat.gid !== gid) fchownSync(mount, uid, gid);
    }
  } finally { for (const fd of descriptors.reverse()) closeSync(fd); }
}

// Called by the real index.js before SQLite/network startup, not just a Docker
// ENTRYPOINT: Railway's custom `npm run miniapp` must take the same path.
export function prepareSQLitePermissions(databasePath) {
  if (process.platform !== "linux") return;
  if (process.env.BAKEU_SQLITE_BOOTSTRAP === "true") process.umask(0o077);
  if (process.getuid() !== 0) return;
  if (process.env.BAKEU_SQLITE_BOOTSTRAP !== "true") throw new SQLitePermissionError("root_bootstrap_not_enabled");
  try {
    const node = readFileSync("/etc/passwd", "utf8").split("\n").map((line) => line.split(":"))
      .find((fields) => fields[0] === "node");
    const uid = Number(node?.[2]), gid = Number(node?.[3]);
    if (!Number.isInteger(uid) || uid <= 0 || !Number.isInteger(gid) || gid <= 0) throw new SQLitePermissionError("node_user_unavailable");
    if (databasePath !== ":memory:") {
      const path = resolve(databasePath);
      const root = ["/data", applicationData].find((base) => childOf(path, base));
      if (!root) throw new SQLitePermissionError("unsupported_root_path");
      prepareDirectory(path, root, uid, gid);
    }
    process.umask(0o077);
    process.initgroups("node", gid);
    process.setgid(gid);
    process.setuid(uid);
    if (process.getuid() !== uid || process.getgid() !== gid || process.getgroups().includes(0)) throw new SQLitePermissionError("privilege_drop_failed");
  } catch (error) {
    if (error instanceof SQLitePermissionError) throw error;
    throw new SQLitePermissionError("storage_preparation_failed");
  }
}
