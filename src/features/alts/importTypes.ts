import type { AltWithData, ServerAltInfo } from '../../store/types';

export interface ImportEntry {
  username: string;
  premium: boolean;
  UID: string | null;
  email?: string;
  password: string;
  ranks: Record<string, string>;
  gkits: Record<string, string[]>;
}

export interface ImportFileParseResult {
  entries: ImportEntry[];
  srcProfile: string | null;
}

export type ImportTabMode = 'file' | 'profile' | 'shared';

export interface AltImportResult {
  added: number;
  updated: number;
  skipped: string[];
}
