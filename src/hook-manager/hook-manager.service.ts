import { Injectable } from '@nestjs/common';
import { Octokit } from '@octokit/core';
import { CwlService } from 'src/cwl/cwl.service';
import Log from '../lib/logger';
import { Change, Cwl, GitHubPost, GitInfo, GithubPost4PR } from '../interfaces';
import {
    toolUpdated,
    checkWorkflowVersion,
    saveChange,
    getFullPath,
    getWorkflowJSON,
    expandEmbedded,
} from '../lib';
import { dirname } from 'path';
import { FireconectionService } from 'src/fireconection/fireconection.service';

import { Stream } from 'stream';
@Injectable()
export class HookManagerService {
    constructor(

        private cwlService: CwlService,
        private fireService: FireconectionService
    ) {

    }

    async pr_merged(body: GithubPost4PR) {
        const response: any = {};
        const changes: { [key: string]: Change } = {};
        const url = body.repository.html_url;
        const PR_NUM = body.number ? body.number : body.pull_request.number
        // console.log(`PR${PR_NUM} being merged into: ${url}`);
        // Find this repository and get the user that has access to that repo
        // const PAT = await this._repoService.findPATbyRepo(url);

        // If there is an authorized user use them, if not just start up octokit
        let octoKit: Octokit = new Octokit({});
        // if (PAT === '') {
        //     octoKit = new Octokit({});
        //     Log.debug(`Login info not found for ${url}`);
        // } else {
        //     octoKit = new Octokit({ auth: PAT });
        // }

        // get modified files
        const [repo_owner, repo_url] = body.repository.full_name.split('/');
        const git_diff_options = { owner: repo_owner, repo: repo_url, pull_number: PR_NUM, per_page: 100 } // include query param for amountof file to display? (max 100)

        const pr_files = (await octoKit.request(
            'GET /repos/{owner}/{repo}/pulls/{pull_number}/files',
            git_diff_options
        ));
        let changedFileNames = []
        let removedFileNames = []
        // console.log('response from getting pr files: ', pr_files);
        /* need better logic for what kind of file change should trigger what kind of tracking 
        does a removed cwl mean remove all instances from mongo?
        does rename mean rename all instances in mongo? different names mean different paths so cwl's won't be tracked to old versions if renamed
        */
        for (const pr_file of pr_files.data) {
            if (pr_file.status === "removed") {
                removedFileNames.push(pr_file.filename);
            }
            else {
                // other possibilities are "renamed" "modified" "added"
                changedFileNames.push(pr_file.filename);
            }
        }

        const modifiedFiles: string[] = changedFileNames;
        // Log.info(`modified file names: ${modifiedFiles.join(', ')}`)
        // split into modified tools and modified workflows
        const workflowList: string[] = modifiedFiles.filter((file) => file.includes('workflows/'));
        const toolList: string[] = modifiedFiles.filter((file) => file.includes('tools/'));
        // Log.info(`Tools to update: ${toolList.join(', ')}`);
        // Log.info(`Workflows to update: ${workflowList.join(', ')}`);
        const cwls: Cwl[] = []
        for (const file of workflowList) {
            let newJSON: any;
            let newText: any;
            const { json, text, sha } = await getWorkflowJSON(octoKit, repo_owner, repo_url, file);
            newJSON = json;
            
            
            let cwl = await this.cwlService.CreateCwlObject(newJSON, file, body, octoKit, repo_url, repo_owner);
            cwls.push(cwl);
        }
        this.fireService.setCollection(cwls);
        
        // copied flow from processwebHook
        const owner = body.repository.owner.login; // should be username of github user/org that owns repo
        const repo = body.repository.name;
        const remote = body.repository.html_url;
        // Log.info(`owner: ${owner}, repo: ${repo}, remote: ${remote}, before: ${body.pull_request.base.sha}, and after: ${body.pull_request.head.sha} for gitInfo: `);
        response.checks = []; // This is just for tests
        // List of tools that have been updated to check for in CWLs
        const toolsUpdatedList: { [key: string]: { oldId: string; newId: string } } = {};

        return response;

    }
}
