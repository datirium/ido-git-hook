import { Octokit } from '@octokit/core';

import Log from './logger';
import { checkParameters, getWorkflowJSON } from './utils';
import { GitInfo, VersionChange } from '../interfaces';

/**
 * Check if a workflow is updated, minor major or new
 * @param gitInfo Information about repo
 * @param toolsUpdated list of tools that have been updated
 * @param octoKit instance of octokit
 * @returns major, minor, new
 */
export const checkWorkflowVersion = async (
    gitInfo: GitInfo,
    toolsUpdated: string[],
    octoKit: Octokit,
): Promise<{ change: VersionChange; text: string; json: any }> => {
    const { path, repo, owner, before, after } = gitInfo;

    let newJSON: any;
    let newText: string;
    try {
        const { json, text } = await getWorkflowJSON(octoKit, owner, repo, path, after);
        newJSON = json;
        newText = text;
    } catch (err) {
        throw err;
    }

    const response: { change: VersionChange; text: string; json: any } = {
        text: newText,
        json: newJSON,
        change: 'minor',
    };

    const toolCheck = Object.keys(newJSON.steps).some((key) =>
        toolsUpdated.some((tool) => {
            try {
                const check = newJSON.steps[key].run.includes(tool);
                return check;
            } catch {
                return false;
            }
        }),
    );
    if (toolCheck) {
        response.change = 'major';
        return response;
    }

    let oldJSON: any;
    try {
        const { json } = await getWorkflowJSON(octoKit, owner, repo, path, before);
        oldJSON = json;
    } catch (err) {
        Log.debug(`Old ${path} doesn't contain anything`);
        response.change = 'new';
        return response;
    }

    if (!checkParameters(oldJSON.inputs, newJSON.inputs)) {
        response.change = 'major';
        return response;
    }

    if (!checkParameters(oldJSON.outputs, newJSON.outputs)) {
        response.change = 'major';
        return response;
    }

    if (!checkParameters(oldJSON.steps, newJSON.steps)) {
        response.change = 'major';
        return response;
    }

    return response;
};
