/** 
 * represents the data in a pull_request event that github sends 
 * 
 * For comparing closed PR's to merged PR's: https://gist.github.com/patcon/11215810
 */
export interface PullRequest{
    /** there are two reference to pr number. including both in case 1 is ever not there */
    number: number;
    /** when the PR was created */
    created_at: string; 
    /** when pr was last changed (comments, commits, anything) */
    changed_at?: string;
    /** when pr was closed. merges ARE closes */
    closed_at?: string;
    /** when pr was merged. null if pr was closed and not merged */
    merged_at?: string;
    /** if the PR is closed, this indicates if the PR was merged or just closed */
    merged?: boolean;
    title: string;
    merge_commit_sha: string; // will be the sha kept on the cwl doc when pr merges
    /** reference to head of PR */
    head: {
        label: string;
        sha: string;
    }
    /** 
     * reference to base of PR 
     * should be to master, but if not, we can add rules for how inter connected PR's will update cwl's
     */
    base: {
        label: string; // should be "datirium:master" or "{GIT_REPO}:{MAIN_BRANCH}" for custom repos with hooks enabled
        sha: string;
    }
    /** including to log. reference with PR modifications may be included her and easier gotten than by parsing git diff of PR */
    _links: {
        commits: Object; //may be of for GitCommit
    }
    // use to verify amount of added/removed/modified files gotten from git diff
    changed_files?: number;
    /** for getting git diff to parse added/removed/modified file paths */
    diff_url: string;
}

/** for representing a github webhook body that was sent for a pull_request */
export interface GithubPost4PR{
    /** 
     * PR based webhook bodies will say what kind of PR action the most recent event involved
     *  ("opened", "synchronize", "closed")
     */
    action: string;
    
    /** the PR number for this PR */
    number: number;

    /** content of the PR event */
    pull_request: PullRequest;

    /** 
     * github sha of the commit before the most recent (only exists if the PR event is for the 2nd commit in a PR) 
     * 
     * the sha for before that we want is the base of the pr, not the before (last commit in pr)
     */
    before?: string; 
    
    /** 
     * github sha of the most recent commit in the pr (only exists if the PR already has at least 1 previous commit)
     * 
     * not sure if this sha is what we want.
     *  i think the merge has a different sha than the PR's most recent commit, especially since we squash and merge PR's
     */
    after?: string;

    repository: {
        /** NOT the name of the repo */
        name: string;
        full_name: string;
        private: true;
        owner: {
            /** login name of repo owner */
            login: string;
        };
        html_url: string;
    };

    // PR events don't include this data in the webhook body
    /*pusher: {
        name: string;
        email: string;
    };
    commits: GitCommit[];
    head_commit: GitCommit;*/

    /**
     * 
     */
    sender: any; 
}
export interface GitHubPost {
    ref: string;
    before: string;
    after: string;
    repository: {
        name: string;
        full_name: string;
        private: true;
        owner: {
            name: string;
            email: string;
        };
        html_url: string;
    };
    pusher: {
        name: string;
        email: string;
    };
    commits: GitCommit[];
    head_commit: GitCommit;
}

interface GitCommit {
    id: string;
    message: string;
    timestamp: string;
    author: {
        name: string;
        email: string;
        username: string;
    };
    committer: {
        name: string;
        email: string;
        username: string;
    };
    added: string[];
    removed: string[];
    modified: string[];
}
