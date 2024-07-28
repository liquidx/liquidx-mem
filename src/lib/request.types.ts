import type { Mem } from './common/mems';

export interface MemListRequest {
	userId: string;
	secretWord?: string;
	isArchived?: boolean;
	all?: boolean;
	matchAllTags?: string[];
	matchAnyTags?: string[];
	searchQuery?: string;
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

export interface MemAnnotateResponse {
	mem: Mem;
	memId: string;
}

export interface MemFlagRequest {
	new?: boolean;
	seen?: boolean;
}
