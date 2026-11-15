import {Config} from '@remotion/cli/config';

// This PC runs out of Chrome memory above 1 parallel frame; the cloud runner can do more.
Config.setConcurrency(Number(process.env.RENDER_CONCURRENCY || 1));
