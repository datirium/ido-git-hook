import { Octokit } from '@octokit/core';
import { isEqual } from 'underscore';
import { resolve, dirname } from 'path';
import { load as safeLoad } from 'js-yaml';

import { Change, Cwl, GithubPost4PR, VersionChange } from 'src/interfaces';
import Log from './logger';
// import { ToolService } from '../mongoConnection';

// Params that we don't care if they change
const filterParams = ['doc', 'label', 'format'];

/**
 * Get the contents of a file from a repo and convert to JSON
 * @param octoKit instance of octokit
 * @param owner owner of repo
 * @param repo repo name
 * @param path path to file in repo
 * @param ref commit
 * @returns JSON of CWL
 */
export const getWorkflowJSON = async (
    octoKit: Octokit,
    owner: string,
    repo: string,
    path: string,
    ref?: string,
): Promise<{ json: any; text: string; sha: string }> => {
    const options: any = { owner, repo, path };

    if (ref) {
        options.ref = ref;
    }

    const file = (await octoKit.request(
        'GET /repos/{owner}/{repo}/contents/{path}',
        options,
    )) as any;

    if (!file.data.content) {
        throw new Error(`Ref: ${ref} at ${path} doesn't contain anything`);
    }
    const content = Buffer.from(file.data.content, 'base64').toString();
    const json: any = safeLoad(content);
    const updatedJSON = json$Parser(json);
    return { json: updatedJSON, text: content, sha: file.data.sha };
};

/**
 * Compare Inputs, Outputs, and Steps. Really anything that needs a deep equals
 *  Removes the filter params because we don't care if those change
 * @param old Old Object
 * @param newer New Object
 * @returns if the two objects are the same
 */
export const checkParameters = (old: any, newer: any): boolean => {
    // First check if the keys are equal, because if they aren't we don't need to do anything else
    if (!isEqual(Object.keys(old), Object.keys(newer))) {
        return false;
    }

    // Remove the filtered keys from the objects
    const oldFiltered: { [key: string]: any } = {};
    Object.keys(old).forEach((key) => {
        const updated: { [key: string]: any } = {};
        Object.keys(old[key])
            .filter((param) => !filterParams.includes(param))
            .forEach((param) => {
                updated[param] = old[key][param];
            });
        oldFiltered[key] = updated;
    });

    const newFiltered: { [key: string]: any } = {};
    Object.keys(newer).forEach((key) => {
        const updated: { [key: string]: any } = {};
        Object.keys(newer[key])
            .filter((param) => !filterParams.includes(param))
            .forEach((param) => {
                updated[param] = newer[key][param];
            });
        newFiltered[key] = updated;
    });

    return isEqual(oldFiltered, newFiltered);
};

/**
 * Remove $ from JSON Keys so they can be saved to MongoDB
 * @param json Any JSON object
 * @returns JSON object with keys changed to remove $
 */
export const json$Parser = (json: any): any => {
    if (!json) {
        return json;
    }
    if (Array.isArray(json)) {
        return json.map((i) => json$Parser(i));
    }
    if (typeof json === 'object') {
        const updated: any = {};
        Object.keys(json).forEach((k) => {
            const updatedKey = k.replace('$', '\uFF04');
            updated[updatedKey] = json$Parser(json[k]);
        });
        return updated;
    }
    return json;
};

// Check to not downgrade a change type
export const saveChange = (
    file: string,
    change: VersionChange,
    changes: { [key: string]: Change },
    json: any,
    text: string,
) => {
    if (changes[file] && changes[file].type === 'major') return;
    changes[file] = {
        type: change,
        json,
        text,
    };
};

    /**
     * Remove the metadata from the cwl before packing
     * @param dataObj CWL
     * @param excludeKeysGlobal Wich keys to exclude
     */
    
export const _removeMetadata = (dataObj, excludeKeysGlobal = ['$namespaces', '$schemas', 'doc']) => {
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

/**
 * Make sure a potential relative path includes a full path
 * @param path relative path
 * @param html_url path to current repo
 * @returns a path with http
 */
export const getFullPath = (path: string, html_url: string): string => {
    if (path.includes('http')) return path;
    return html_url + resolve('/', path);
};

/**
 *
 * @param dataObj
 * @param basedir
 * @param latestCommit
 * @param visitedFiles
 */
export const expandEmbedded = async (
    dataObj: any,
    html_url: string,
    pathRoot: string,
    owner: string,
    repo: string,
    octoKit: Octokit,
    // toolService: ToolService,
): Promise<any> => {
    const helper = async (currObj: any, currPath: string) => {
        // null is an object so we need to check for it specifically here
        if (typeof currObj !== 'object' || currObj === null) {
            return currObj;
        }

        if (Array.isArray(currObj)) {
            const updated: any[] = [];
            for (const item of currObj) {
                const updatedItem = await helper(item, currPath);
                updated.push(updatedItem);
            }
            return updated;
        } else {
            const updated: { [key: string]: any } = {};
            for (const key of Object.keys(currObj)) {
                if (
                    !currObj[key] &&
                    typeof currObj[key] !== 'string' && // Check it isn't an empty string
                    typeof currObj[key] !== 'number' && // Check it isn't a negative number or 0
                    typeof currObj[key] !== 'boolean' && // Check it isn't false
                    currObj[key] !== null // Check it isn't null
                ) {
                    continue;
                }

                if (
                    currObj[key] === null ||
                    (key !== 'run' && !currObj[key]['$import']) ||
                    (key === 'run' && typeof currObj[key] !== 'string' && !currObj[key]['$import'])
                ) {
                    updated[key] = await helper(currObj[key], currPath);
                    continue;
                }
                if (!!currObj[key]['$import'] && typeof currObj[key]['$import'] !== 'string') {
                    Log.debug(`Key ${key} is not a string`);
                    continue;
                }

                let _path = '';
                if (!!currObj[key]['$import']) {
                    _path = currObj[key]['$import'];
                } else if (key === 'run') {
                    _path = currObj[key].split('/').slice(-2).join('/');
                }
                
                // if (false) {
                if (_path.includes('tools')) {
                    const newPath = resolve('/', currPath, dirname(_path));
                    const toolPath = getFullPath(_path, html_url);
                    //getting the tool from github
                    const {json,text,sha} = await getWorkflowJSON(octoKit,owner,repo,_path);
                    // // const tool = {};
                    if (!json) {
                        Log.info(`No Tool found in Collection for ${toolPath}`);
                    } else {
                        
                        updated[key] = await helper(json, newPath);
                        continue;
                    }
                }
                let absPath: string;
                try {
                    absPath = resolve('/', currPath, _path);
                    const file = (await octoKit.request(
                        'GET /repos/{owner}/{repo}/contents/{path}',
                        {
                            owner,
                            repo,
                            path: absPath,
                        },
                    )) as any;
                    const content = Buffer.from(file.data.content, 'base64').toString();
                    const json: any = safeLoad(content);
                    const result = await helper(json, currPath);
                    updated[key] = result;
                } catch (err) {
                    Log.error('Error finding: ', absPath);
                    Log.error(err.message);
                }
            }
            return updated;
        }
    };
    const results = await helper(dataObj, pathRoot);
    return results;
};
