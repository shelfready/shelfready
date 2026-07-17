import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, normalize } from "node:path";
import { AwsClient } from "aws4fetch";

/**
 * Artifact storage behind one seam (ADR-0004): S3-compatible for
 * Cloudflare R2 in production, filesystem for dev/tests (and staging
 * until R2 credentials exist — issue #16).
 */
export interface ArtifactStore {
  put(key: string, body: string, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: string; contentType: string } | null>;
}

export class FsStore implements ArtifactStore {
  constructor(private root = process.env.ARTIFACTS_DIR ?? ".artifacts") {}

  private path(key: string): string {
    const path = normalize(join(this.root, key));
    if (!path.startsWith(normalize(this.root))) throw new Error("bad key");
    return path;
  }

  async put(key: string, body: string, contentType: string): Promise<void> {
    const path = this.path(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body, "utf8");
    await writeFile(`${path}.meta`, contentType, "utf8");
  }

  async get(key: string) {
    try {
      const path = this.path(key);
      const [body, contentType] = await Promise.all([
        readFile(path, "utf8"),
        readFile(`${path}.meta`, "utf8"),
      ]);
      return { body, contentType };
    } catch {
      return null;
    }
  }
}

/** S3-compatible store (Cloudflare R2). Envs: R2_ENDPOINT, R2_BUCKET,
 * R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY. */
export class S3Store implements ArtifactStore {
  private client: AwsClient;
  private base: string;

  constructor() {
    const { R2_ENDPOINT, R2_BUCKET, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY } =
      process.env;
    if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error("R2_* env vars are not fully set");
    }
    this.client = new AwsClient({
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto",
    });
    this.base = `${R2_ENDPOINT.replace(/\/$/, "")}/${R2_BUCKET}`;
  }

  async put(key: string, body: string, contentType: string): Promise<void> {
    const res = await this.client.fetch(`${this.base}/${key}`, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body,
    });
    if (!res.ok) throw new Error(`artifact put ${key}: HTTP ${res.status}`);
  }

  async get(key: string) {
    const res = await this.client.fetch(`${this.base}/${key}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`artifact get ${key}: HTTP ${res.status}`);
    return {
      body: await res.text(),
      contentType: res.headers.get("content-type") ?? "text/plain",
    };
  }
}

let _store: ArtifactStore | undefined;

export function getArtifactStore(): ArtifactStore {
  return (_store ??=
    process.env.ARTIFACT_STORE === "s3" ? new S3Store() : new FsStore());
}

/** Test seam. */
export function setArtifactStore(store: ArtifactStore | undefined) {
  _store = store;
}
