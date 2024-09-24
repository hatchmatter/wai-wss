import { Queue } from 'bullmq';
import { redis } from '@/lib/redis';

export const callQueue = new Queue('call', { connection: redis });
