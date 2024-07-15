import type { Mem } from './common/mems';

export interface MemListResponse {
	status: string;
	mems?: Mem[];
}
