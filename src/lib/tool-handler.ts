import { Octokit } from '@octokit/core';
import { isEqual } from 'underscore';

import Log from './logger';
import { GitInfo, VersionChange } from '../interfaces';
import { getWorkflowJSON, checkParameters } from './utils';

interface ToolResponse {
    change: VersionChange;
    newJSON: any;
    newText: string;
}

/**
 * Checks if a tool is updated
 * @param gitInfo Information about the repo including the commits to compare
 * @param octoKit Instance of octokit
 * @returns Version Change and text and json
 */
export const toolUpdated = async (gitInfo: GitInfo, octoKit: Octokit): Promise<ToolResponse> => {
    const { path, repo, owner, before, after } = gitInfo;

    let newJSON: any;
    let newText: string;
    let change: VersionChange = 'minor';

    try {
        const { json, text } = await getWorkflowJSON(octoKit, owner, repo, path, after);
        newText = text;
        newJSON = json;
    } catch (err) {
        throw err;
    }

    let oldJSON: any;
    try {
        const { json } = await getWorkflowJSON(octoKit, owner, repo, path, before);
        oldJSON = json;
    } catch (err) {
        Log.debug(`Old ${path} doesn't contain anything`);
        change = 'major';
    }

    // Compare Inputs
    if (change !== 'major' && !checkParameters(oldJSON.inputs, newJSON.inputs)) {
        change = 'major';
    }

    // Compare Outputs
    if (change !== 'major' && !checkParameters(oldJSON.outputs, newJSON.outputs)) {
        change = 'major';
    }

    // Compare Docker
    if (change !== 'major') {
        try {
            const dockerVersionUpdated = newJSON.hints.some((hint, i) => hint.dockerPull !== oldJSON.hints[i].dockerPull);
            if (dockerVersionUpdated) {
                // if (change !== 'major' && oldJSON.hints[0].dockerPull !== newJSON.hints[0].dockerPull) {
                change = 'major';
            }
        } catch (err) {
            try {
                const dockerVersionUpdated = newJSON.requirements.some((hint, i) => hint.dockerPull !== oldJSON.requirements[i].dockerPull);
                if (dockerVersionUpdated) {
                    // if (change !== 'major' && oldJSON.hints[0].dockerPull !== newJSON.hints[0].dockerPull) {
                    change = 'major';
                }
            } catch (err) {
                Log.debug('failed to get docker pull requirements');
            }
        }
    }

    // Compare Base Command
    if (change !== 'major' && !isEqual(oldJSON.baseCommand, newJSON.baseCommand)) {
        change = 'major';
    }

    return { change, newJSON, newText };
};
