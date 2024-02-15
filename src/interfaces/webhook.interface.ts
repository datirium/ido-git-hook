export interface GitInfo {
    path: string;
    repo: string;
    owner: string;
    before: string;
    after: string;
}

export type VersionChange = 'minor' | 'major' | 'new';

export interface Change {
    type: VersionChange;
    json: any;
    text: string;
}

export interface AttachedLab {
    url: string;
    PAT: string;
    webhookId?: number;
    labId: string;
}
