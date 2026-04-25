import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

export interface QueueEntry {
  userId: string;
  username: string;
  rating: number;
  socketId: string;
  mode: string;
  initial: number;
  increment: number;
  enqueuedAt: number;
}

/**
 * Backed by Redis when REDIS_URL is set; falls back to in-memory when not.
 * The in-memory fallback is process-local — acceptable for a single backend
 * instance on the free tier.
 */
@Injectable()
export class QueueStore implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(QueueStore.name);
  private redis: Redis | null = null;
  private mem = new Map<string, QueueEntry[]>();

  async onModuleInit() {
    const url = process.env.REDIS_URL;
    if (!url) {
      this.logger.warn('REDIS_URL not set — using in-memory matchmaking queue');
      return;
    }
    try {
      this.redis = new Redis(url, {
        maxRetriesPerRequest: 2,
        lazyConnect: true,
        tls: url.startsWith('rediss://') ? {} : undefined,
      });
      await this.redis.connect();
      this.logger.log('Connected to Redis for matchmaking');
    } catch (err) {
      this.logger.error(`Redis connection failed: ${(err as Error).message}. Falling back to in-memory queue.`);
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => undefined);
    }
  }

  async push(mode: string, entry: QueueEntry): Promise<void> {
    if (this.redis) {
      await this.redis.rpush(this.key(mode), JSON.stringify(entry));
      return;
    }
    const list = this.mem.get(mode) ?? [];
    list.push(entry);
    this.mem.set(mode, list);
  }

  async all(mode: string): Promise<QueueEntry[]> {
    if (this.redis) {
      const items = await this.redis.lrange(this.key(mode), 0, -1);
      return items.map((s) => JSON.parse(s) as QueueEntry);
    }
    return [...(this.mem.get(mode) ?? [])];
  }

  async remove(mode: string, userId: string): Promise<void> {
    if (this.redis) {
      const items = await this.redis.lrange(this.key(mode), 0, -1);
      const keep = items.filter((s) => {
        try {
          return (JSON.parse(s) as QueueEntry).userId !== userId;
        } catch {
          return true;
        }
      });
      const key = this.key(mode);
      const multi = this.redis.multi();
      multi.del(key);
      if (keep.length) multi.rpush(key, ...keep);
      await multi.exec();
      return;
    }
    const list = this.mem.get(mode) ?? [];
    this.mem.set(mode, list.filter((e) => e.userId !== userId));
  }

  async removeAll(userId: string): Promise<void> {
    const modes = await this.modes();
    for (const m of modes) await this.remove(m, userId);
  }

  async modes(): Promise<string[]> {
    if (this.redis) {
      const keys = await this.redis.keys(this.key('*'));
      return keys.map((k) => k.replace(/^mm:/, ''));
    }
    return [...this.mem.keys()];
  }

  private key(mode: string): string {
    return `mm:${mode}`;
  }
}
