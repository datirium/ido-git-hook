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
export interface Cwl{
    description:{
        author: string,
        description: string,
        label: string,
        longName: string,
        message: string,
        url: string
    },
    inputs: any,
    metadata: any,
    outputs: any,
    servicetags: any,
    
    git: {
        path:string,
        remote: string,
        sha: string
    },
    packed: any,
    upstreams: any
}
