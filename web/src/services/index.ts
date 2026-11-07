import { mockSource } from './mock';
import type { DataSource } from './types';

export type { DataSource, SwipeResult } from './types';

/** Demo modu (/demo) yalnızca yerel örnek veriyle çalışır; canlı uygulama src/live altındadır. */
export const dataSource: DataSource = mockSource;
