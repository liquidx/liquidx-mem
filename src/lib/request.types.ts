import type { Mem } from './common/mems';

export interface MemListRequest {
	userId: string;
	secretWord?: string;
	isArchived?: boolean;
	allOfTags?: string[];
	oneOfTags?: string[];
	pageSize?: number;
	page?: number;
}

export interface MemListResponse {
	status: string;
	mems?: Mem[];
}

export interface MemAddResponse {
	mem?: Mem;
	error?: string;
}

export interface SettingsWriteRequest {
	key: string;
	settings: any;
}
export interface SettingsReadResponse {
	key: string;
	settings: any;
}
