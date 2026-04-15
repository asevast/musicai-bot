import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import { Worker } from 'bullmq';
import { loadEnv } from '@musicai/config';
import { prisma } from '@musicai/database';
import { LyriaClient } from '@musicai/vertex-ai';
import { QUEUES, QUEUE_OPTIONS, WORKER_CONFIG } from '@musicai/queues';
import { SynthJobProcessor } from './processors/synth-job.processor';
import { NotifyProcessor } from './processors/notify.processor';

const env = loadEnv();
