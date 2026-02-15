import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { logger } from "../utils/logger.js";

const storageLogger = logger.child("Storage");

const DATA_DIR = join(process.cwd(), "data");

export class JsonStorage<T> {
  private filePath: string;
  private cache: T | null = null;

  constructor(filename: string) {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }
    this.filePath = join(DATA_DIR, filename);
  }

  load(defaultValue: T): T {
    if (this.cache) return this.cache;

    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, "utf-8");
        this.cache = JSON.parse(raw) as T;
        storageLogger.debug(`Loaded ${this.filePath}`);
        return this.cache;
      }
    } catch (err) {
      storageLogger.error(`Failed to load ${this.filePath}`, err);
    }

    this.cache = defaultValue;
    this.save(defaultValue);
    return defaultValue;
  }

  save(data: T): void {
    try {
      this.cache = data;
      writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
    } catch (err) {
      storageLogger.error(`Failed to save ${this.filePath}`, err);
    }
  }

  get(): T | null {
    return this.cache;
  }
}
