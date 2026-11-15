import {Config} from '@remotion/cli/config';

// This PC runs out of Chrome memory on photo scenes above 1 parallel frame.
Config.setConcurrency(1);
