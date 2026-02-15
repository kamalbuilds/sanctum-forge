import { config } from "../config.js";
import { logger } from "../utils/logger.js";

const moltbookLogger = logger.child("Moltbook");

export interface MoltbookAuthor {
  id: string;
  name: string;
}

export interface MoltbookPost {
  id: string;
  content: string;
  title?: string;
  type?: string;
  submolt?: string | { id: string; name: string };
  author: MoltbookAuthor;
  createdAt: string;
  comments?: MoltbookComment[];
}

export interface MoltbookComment {
  id: string;
  postId: string;
  content: string;
  author: MoltbookAuthor;
  createdAt: string;
}

interface MoltbookCreateResponse {
  success: boolean;
  post: MoltbookPost;
  verification_required?: boolean;
  verification?: {
    code: string;
    challenge: string;
    expires_at: string;
    instructions: string;
  };
}

interface QueuedRequest {
  execute: () => Promise<unknown>;
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

class MoltbookClient {
  private baseUrl: string;
  private apiKey: string;
  private submolt: string;
  private lastPostTime: number = 0;
  private lastCommentTime: number = 0;
  private postCooldown: number = 2 * 60 * 1000;
  private commentCooldown: number = 35 * 1000;
  private queue: QueuedRequest[] = [];
  private processing: boolean = false;

  constructor() {
    this.baseUrl = config.moltbook.apiUrl;
    this.apiKey = config.moltbook.apiKey;
    this.submolt = config.moltbook.submolt;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`;

    moltbookLogger.debug(`${method} ${url}`);

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "Unknown error");
      moltbookLogger.error(`API error: ${response.status}`, errorBody);
      throw new Error(`Moltbook API error: ${response.status} ${response.statusText} - ${errorBody}`);
    }

    return (await response.json()) as T;
  }

  private async enqueue<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({
        execute: execute as () => Promise<unknown>,
        resolve: resolve as (value: unknown) => void,
        reject,
      });
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      try {
        const result = await item.execute();
        item.resolve(result);
      } catch (err) {
        item.reject(err);
      }
    }
    this.processing = false;
  }

  private async solveVerification(code: string, challenge: string): Promise<void> {
    try {
      // Step 1: Clean the obfuscated text — remove non-alpha noise, lowercase
      let cleaned = challenge
        .replace(/[\]\[^/~<+\-]/g, " ")
        .replace(/[A-Z]/g, (c) => c.toLowerCase())
        .replace(/\s+/g, " ")
        .trim();

      // Step 2: Deduplicate repeated letters (e.g., "twoo" -> "two", "neootoonns" -> "newtoons" -> "newtons")
      cleaned = cleaned.replace(/\b\w+\b/g, (word) => {
        return word.replace(/(.)\1+/g, "$1");
      });

      moltbookLogger.debug(`Verification challenge (cleaned): ${cleaned}`);

      // Try LLM-based solving first for accuracy
      try {
        const { llm } = await import("../utils/llm.js");
        const llmAnswer = await llm(
          "You are a math solver. You will be given a word problem. Respond with ONLY the numeric answer as a decimal with 2 decimal places (e.g., '50.00'). Nothing else.",
          `Solve this math problem: ${cleaned}`,
          64
        );
        const numericAnswer = llmAnswer.trim().replace(/[^0-9.-]/g, "");
        if (numericAnswer && !isNaN(parseFloat(numericAnswer))) {
          moltbookLogger.debug(`LLM answer: ${numericAnswer}`);
          await this.request("POST", "/verify", {
            verification_code: code,
            answer: parseFloat(numericAnswer).toFixed(2),
          });
          moltbookLogger.info("Verification solved (LLM)");
          return;
        }
      } catch {
        moltbookLogger.debug("LLM verification fallback, using local solver");
      }

      // Fallback: local word-to-number solver
      const wordToNum: Record<string, number> = {
        zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5,
        six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
        eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
        sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
        twenty: 20, thirty: 30, forty: 40, fifty: 50,
        sixty: 60, seventy: 70, eighty: 80, ninety: 90,
        hundred: 100, thousand: 1000,
      };

      const unitWords = new Set(["newtons", "neutons", "netons", "meters", "kilograms", "seconds", "grams", "joules", "watts", "volts", "amps", "hertz", "pascals", "liters", "miles", "kilometers", "pounds", "ounces", "feet", "inches"]);

      const numbers: number[] = [];
      const words = cleaned.split(" ");
      let current = 0;
      let hasNumber = false;

      for (const word of words) {
        const clean = word.replace(/[^a-z0-9.]/g, "");
        if (wordToNum[clean] !== undefined) {
          const val = wordToNum[clean];
          if (val === 100) current = (current || 1) * 100;
          else if (val === 1000) current = (current || 1) * 1000;
          else current += val;
          hasNumber = true;
        } else if (hasNumber && unitWords.has(clean)) {
          numbers.push(current);
          current = 0;
          hasNumber = false;
        } else if (/^\d+(\.\d+)?$/.test(clean)) {
          current += parseFloat(clean);
          hasNumber = true;
        }
      }
      if (hasNumber) numbers.push(current);

      let answer = 0;
      if (cleaned.includes("total") || cleaned.includes("sum") || cleaned.includes("combined") || cleaned.includes("together")) {
        answer = numbers.reduce((a, b) => a + b, 0);
      } else if (cleaned.includes("difference") || cleaned.includes("subtract") || cleaned.includes("minus")) {
        answer = numbers.length >= 2 ? numbers[0] - numbers[1] : numbers[0];
      } else if (cleaned.includes("product") || cleaned.includes("multiply") || cleaned.includes("times")) {
        answer = numbers.reduce((a, b) => a * b, 1);
      } else if (cleaned.includes("divide") || cleaned.includes("ratio") || cleaned.includes("quotient")) {
        answer = numbers.length >= 2 ? numbers[0] / numbers[1] : numbers[0];
      } else {
        answer = numbers.reduce((a, b) => a + b, 0);
      }

      moltbookLogger.debug(`Local solver answer: ${answer.toFixed(2)} from numbers: [${numbers.join(", ")}]`);

      await this.request("POST", "/verify", {
        verification_code: code,
        answer: answer.toFixed(2),
      });

      moltbookLogger.info("Verification solved (local)");
    } catch (err) {
      moltbookLogger.warn("Verification failed", err instanceof Error ? err.message : "");
    }
  }

  async createPost(content: string, submolt?: string): Promise<MoltbookPost | null> {
    submolt = submolt || this.submolt;
    const now = Date.now();
    const timeSinceLastPost = now - this.lastPostTime;

    if (timeSinceLastPost < this.postCooldown) {
      const waitTime = this.postCooldown - timeSinceLastPost;
      moltbookLogger.info(`Rate limited: waiting ${Math.ceil(waitTime / 1000)}s before posting`);
      await this.delay(waitTime);
    }

    return this.enqueue(async () => {
      try {
        const title = content.slice(0, 100).replace(/\n/g, " ");
        const body: Record<string, unknown> = { title, content };
        if (submolt) body.submolt = submolt;

        const resp = await this.request<MoltbookCreateResponse>("POST", "/posts", body);
        this.lastPostTime = Date.now();

        if (resp.verification_required && resp.verification) {
          await this.solveVerification(resp.verification.code, resp.verification.challenge);
        }

        moltbookLogger.info(`Post created: ${resp.post.id}`);
        return resp.post;
      } catch (err) {
        moltbookLogger.error("Failed to create post", err);
        return null;
      }
    });
  }

  async createComment(postId: string, content: string): Promise<MoltbookComment | null> {
    const now = Date.now();
    const timeSinceLastComment = now - this.lastCommentTime;

    if (timeSinceLastComment < this.commentCooldown) {
      const waitTime = this.commentCooldown - timeSinceLastComment;
      moltbookLogger.info(`Rate limited: waiting ${Math.ceil(waitTime / 1000)}s before commenting`);
      await this.delay(waitTime);
    }

    return this.enqueue(async () => {
      try {
        const raw = await this.request<{ comment?: MoltbookComment; id?: string; success?: boolean } & MoltbookComment>(
          "POST",
          `/posts/${postId}/comments`,
          { content }
        );
        // Handle both { comment: {...} } wrapper and direct comment response
        const comment = raw.comment || raw;
        this.lastCommentTime = Date.now();
        moltbookLogger.info(`Comment created on post ${postId}: ${comment.id || "ok"}`);
        return comment as MoltbookComment;
      } catch (err) {
        moltbookLogger.error("Failed to create comment", err);
        return null;
      }
    });
  }

  async getPost(postId: string): Promise<MoltbookPost | null> {
    try {
      return await this.request<MoltbookPost>("GET", `/posts/${postId}`);
    } catch {
      return null;
    }
  }

  async searchPosts(query: string): Promise<MoltbookPost[]> {
    try {
      const raw = await this.request<{ results?: MoltbookPost[]; posts?: MoltbookPost[] }>(
        "GET",
        `/search?q=${encodeURIComponent(query)}`
      );
      // Moltbook API returns { results: [...] } but handle both formats
      const posts = raw.results || raw.posts || [];
      return this.normalizePosts(posts);
    } catch {
      return [];
    }
  }

  async getRecentPosts(submolt?: string, limit: number = 20): Promise<MoltbookPost[]> {
    try {
      const path = submolt
        ? `/posts?submolt=${encodeURIComponent(submolt)}&limit=${limit}`
        : `/posts?limit=${limit}`;
      const raw = await this.request<{ results?: MoltbookPost[]; posts?: MoltbookPost[] }>("GET", path);
      const posts = raw.results || raw.posts || [];
      return this.normalizePosts(posts);
    } catch {
      return [];
    }
  }

  private normalizePosts(posts: MoltbookPost[]): MoltbookPost[] {
    return posts.map((post) => {
      // Handle author being a string (old format) or object (new format)
      if (typeof post.author === "string") {
        post.author = { id: post.author, name: post.author };
      }
      // Normalize comment authors too
      if (post.comments) {
        post.comments = post.comments.map((c) => {
          if (typeof c.author === "string") {
            c.author = { id: c.author, name: c.author };
          }
          return c;
        });
      }
      return post;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const moltbookClient = new MoltbookClient();
