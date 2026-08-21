import path from "node:path";

function enoent(target: string): NodeJS.ErrnoException {
  const error = new Error(`ENOENT: no such file or directory, '${target}'`) as NodeJS.ErrnoException;
  error.code = "ENOENT";
  return error;
}

function eexist(target: string): NodeJS.ErrnoException {
  const error = new Error(`EEXIST: file already exists, mkdir '${target}'`) as NodeJS.ErrnoException;
  error.code = "EEXIST";
  return error;
}

function normalize(target: string): string {
  return path.resolve(target);
}

function parentChain(target: string): string[] {
  const out: string[] = [];
  let current = normalize(target);
  while (true) {
    out.push(current);
    const parent = path.dirname(current);
    if (parent === current) return out;
    current = parent;
  }
}

class FakeNodeFs {
  private files = new Map<string, string>();
  private dirs = new Set<string>();
  private failRenameDestination?: (destination: string) => boolean;

  reset(): void {
    this.files.clear();
    this.dirs.clear();
    this.failRenameDestination = undefined;
  }

  seedFile(target: string, content: string): void {
    const abs = normalize(target);
    this.ensureDir(path.dirname(abs));
    this.files.set(abs, content);
  }

  failNextRenameTo(predicate: (destination: string) => boolean): void {
    this.failRenameDestination = predicate;
  }


  readSeededFile(target: string): string | undefined {
    return this.files.get(normalize(target));
  }

  snapshotFiles(): Map<string, string> {
    return new Map(this.files);
  }

  existsSync = (target: string): boolean => {
    const abs = normalize(target);
    return this.files.has(abs) || this.dirs.has(abs);
  };

  realpathNative = (target: string): string => normalize(target);

  mkdir = async (target: string, options?: { recursive?: boolean }): Promise<string | undefined> => {
    const abs = normalize(target);
    if (this.files.has(abs)) throw eexist(abs);
    if (!options?.recursive && this.dirs.has(abs)) throw eexist(abs);
    if (options?.recursive) {
      this.ensureDir(abs);
      return undefined;
    }
    const parent = path.dirname(abs);
    if (!this.dirs.has(parent)) throw enoent(parent);
    this.dirs.add(abs);
    return undefined;
  };

  readFile = async (target: string, _encoding?: unknown): Promise<string> => {
    const abs = normalize(target);
    const content = this.files.get(abs);
    if (content === undefined) throw enoent(abs);
    return content;
  };

  writeFile = async (
    target: string,
    data: string | Uint8Array,
    options?: string | { flag?: string },
  ): Promise<void> => {
    const abs = normalize(target);
    const text = typeof data === "string" ? data : Buffer.from(data).toString("utf8");
    this.ensureDir(path.dirname(abs));
    const flag = typeof options === "object" ? options.flag : undefined;
    if (flag === "a") this.files.set(abs, (this.files.get(abs) ?? "") + text);
    else this.files.set(abs, text);
  };

  rename = async (source: string, destination: string): Promise<void> => {
    const src = normalize(source);
    const dst = normalize(destination);
    if (this.failRenameDestination?.(dst)) {
      this.failRenameDestination = undefined;
      throw new Error(`injected rename failure for ${dst}`);
    }
    const content = this.files.get(src);
    if (content === undefined) throw enoent(src);
    this.ensureDir(path.dirname(dst));
    this.files.set(dst, content);
    this.files.delete(src);
  };

  rm = async (target: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> => {
    const abs = normalize(target);
    if (this.files.delete(abs)) return;
    if (this.dirs.has(abs)) {
      const prefix = abs.endsWith(path.sep) ? abs : abs + path.sep;
      const hasChildren = [...this.files.keys(), ...this.dirs].some((candidate) => candidate.startsWith(prefix));
      if (hasChildren && !options?.recursive) {
        const error = new Error(`ENOTEMPTY: directory not empty, rm '${abs}'`) as NodeJS.ErrnoException;
        error.code = "ENOTEMPTY";
        throw error;
      }
      for (const file of this.files.keys()) if (file.startsWith(prefix)) this.files.delete(file);
      for (const dir of this.dirs) if (dir === abs || dir.startsWith(prefix)) this.dirs.delete(dir);
      return;
    }
    if (!options?.force) throw enoent(abs);
  };

  readdir = async (target: string, options?: { recursive?: boolean }): Promise<string[]> => {
    const abs = normalize(target);
    if (!this.dirs.has(abs)) throw enoent(abs);
    const prefix = abs.endsWith(path.sep) ? abs : abs + path.sep;
    const entries = new Set<string>();
    for (const file of this.files.keys()) {
      if (!file.startsWith(prefix)) continue;
      const rel = path.relative(abs, file);
      if (options?.recursive) entries.add(rel);
      else entries.add(rel.split(path.sep)[0]!);
    }
    for (const dir of this.dirs) {
      if (dir === abs || !dir.startsWith(prefix)) continue;
      const rel = path.relative(abs, dir);
      if (options?.recursive) entries.add(rel);
      else entries.add(rel.split(path.sep)[0]!);
    }
    return [...entries].sort();
  };

  stat = async (target: string): Promise<{ isDirectory(): boolean }> => {
    const abs = normalize(target);
    if (this.dirs.has(abs)) return { isDirectory: () => true };
    if (this.files.has(abs)) return { isDirectory: () => false };
    throw enoent(abs);
  };

  private ensureDir(target: string): void {
    for (const entry of parentChain(target)) this.dirs.add(entry);
  }
}

export const fakeNodeFs = new FakeNodeFs();

export const fakeFsPromises = {
  mkdir: fakeNodeFs.mkdir,
  readFile: fakeNodeFs.readFile,
  readdir: fakeNodeFs.readdir,
  rename: fakeNodeFs.rename,
  rm: fakeNodeFs.rm,
  stat: fakeNodeFs.stat,
  writeFile: fakeNodeFs.writeFile,
};

export const fakeFsSync = {
  existsSync: fakeNodeFs.existsSync,
  realpathSync: { native: fakeNodeFs.realpathNative },
};
