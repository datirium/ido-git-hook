import { forwardRef, Inject, Injectable } from '@nestjs/common';


import { Octokit } from '@octokit/core';

import * as zlib from 'zlib';
import { resolve, dirname } from 'path';
import { FireconectionService } from 'src/fireconection/fireconection.service';
import Log from '../lib/logger';
import { getFullPath, getWorkflowJSON, expandEmbedded } from '../lib';
import { VersionChange, GitHubPost, GithubPost4PR } from '../interfaces';
import { Cwl } from '../interfaces';


// eslint-disable-next-line @typescript-eslint/no-var-requires
// const YAML = require('json-to-pretty-yaml');

@Injectable()
export class CwlService {
    constructor(
        private fireService: FireconectionService
    ) { }
    /**
     * 
     * @param newJSON getting json form of workflow
     * @param path path to the specific workflow
     * @param webHookBody  pr body from webhook
     * @param octoKit octokit object
     * @param repo the repository in github
     * @param owner owner of repository in github
     * @returns Cwl object
     */
    public async CreateCwlObject(newJSON: any, path: any, webHookBody: GithubPost4PR, octoKit: Octokit, repo: string, owner: string): Promise<Cwl> {
        const creator = !!newJSON['s:creator'] ? newJSON['s:creator'] : [];
        const fullUrl = getFullPath(path, webHookBody.repository.html_url);
        const pathRoot = dirname(path);
        //just for testing
        const tempURL = fullUrl.replace('galio12', 'datirium');
        //get all the tools used in that workflow
        const updatedToolList: string[] = Object.keys(newJSON.steps)
            .map((k) => newJSON.steps[k].run)
            .filter((i) => typeof i === 'string')
            .map((tool) => getFullPath(tool, webHookBody.repository.html_url));

        //TODO: check if tools exists in the database if not send an error

        //TODO: not all files have service tags
        let serviceTags: string | string[] = newJSON['sd:serviceTag'] || [];
        if (!Array.isArray(serviceTags)) {
            serviceTags = [serviceTags];
        }
        if (!serviceTags.length) {
            console.log('hi');
            //get document data and then map it to the servicetags 
            // replace galio for datirium just for the testing
            serviceTags = Object.values(await this.fireService.FindWorkflowByURL(tempURL))
            .map((key: any) => key.servicetags).flat();
            


        }
        else {
            for (const tag of serviceTags) {
                serviceTags = [...await this.fireService.Get_servicetagID_byName(tag)]
            }
        }
        // Json Object
        const sdMetaData = [];
        //get metadata from the file
        const metadataToParse = newJSON['sd:metadata'] ? newJSON['sd:metadata'] : [];
        for (const link of metadataToParse) {
            //create the correct path to metadata directory
            const updatedLink = resolve('/', pathRoot, link).slice(1);
            //get json and text from metadata file
            const { json, text } = await getWorkflowJSON(octoKit, owner, repo, updatedLink);
            sdMetaData.push(json);
        }
        //get upstreams object
        let upstreams = newJSON['sd:upstream'];
        //create an array contain full url for the workflow upstream
        upstreams = [].concat(...Object.keys(upstreams)
            .map(key => upstreams[key]))
            .map(value => value.includes('http') ? value : 'https://github.com/datirium/workflows/workflows/' + value);

        let final_id = []
        for (const stream of upstreams) {
            //create an array of ides based on the workflow url


            final_id = [...final_id, ...Object.keys(await this.fireService.FindWorkflowByURL(stream))];
        }



        let updatedCWL: Cwl = {
            description: {
                author: creator.map((i) => i['s:legalName']).join(', '),
                description: newJSON.doc,
                label: newJSON['s:name'],
                longName: newJSON['s:alternateName'],
                url: fullUrl,
                message: ''
            },
            metadata: sdMetaData,
            inputs: newJSON.inputs,
            outputs: newJSON.outputs,
            git: {
                path,
                remote: fullUrl,
                sha: ''
            },
            packed: '',
            servicetags: serviceTags,
            upstreams: final_id
        }
        updatedCWL.git.sha = webHookBody.after ? webHookBody.after : webHookBody.pull_request.head.sha;
        // should the message br the PR title or the commit message on the most recent commit?
        updatedCWL.description.message = webHookBody.pull_request.title// webHookBody.head_commit.message;
        let expanded: any;
        try {
            expanded = await expandEmbedded(newJSON, webHookBody.repository.html_url, pathRoot, owner, repo, octoKit);
        } catch (err) {
            Log.error('Error expanding: ');
            return;
        }
        this._removeMetadata(expanded);
        updatedCWL.packed = zlib.gzipSync(JSON.stringify(expanded)).toString('base64');
        return updatedCWL;
    }

    /**
     * Remove the metadata from the cwl before packing
     * @param dataObj CWL
     * @param excludeKeysGlobal Wich keys to exclude
     */
    private _removeMetadata(dataObj, excludeKeysGlobal = ['$namespaces', '$schemas', 'doc']) {
        const excludeKeysSchemas = [];
        if (
            dataObj['$namespaces'] &&
            !Array.isArray(dataObj['$namespaces']) &&
            Object.keys(dataObj['$namespaces']).length > 0
        ) {
            Object.keys(dataObj['$namespaces']).forEach((namespace) => {
                if (!excludeKeysSchemas.includes(namespace + ':'))
                    excludeKeysSchemas.push(namespace + ':');
            });
        }

        const removeMetadataR = (dataObj, excludeKeysG, excludeKeysL) => {
            if (typeof dataObj !== 'object' || !dataObj) {
                return;
            }

            if (Array.isArray(dataObj)) {
                dataObj.forEach((item) => removeMetadataR(item, excludeKeysG, excludeKeysL));
            } else {
                Object.keys(dataObj).forEach((key) => {
                    excludeKeysL.forEach((itemPrefixToExclude) => {
                        if (key.startsWith(itemPrefixToExclude)) {
                            delete dataObj[key];
                        }
                    });
                    excludeKeysG.forEach((itemPrefixToExclude) => {
                        if (key === itemPrefixToExclude) {
                            delete dataObj[key];
                        }
                    });
                    if (dataObj[key]) {
                        removeMetadataR(dataObj[key], excludeKeysG, excludeKeysL);
                    }
                });
            }
        };
        removeMetadataR(dataObj, excludeKeysGlobal, excludeKeysSchemas);
    }
}
