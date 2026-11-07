import { httpSource } from './http';
import { mockSource } from './mock';
import type { DataSource } from './types';

export type { DataSource, SwipeResult } from './types';

/** VITE_DATA_SOURCE=http ile canlı API kullanılır; varsayılan yerel demo verisidir. */
export const dataSource: DataSource = import.meta.env.VITE_DATA_SOURCE === 'http' ? httpSource : mockSource;
