import { Body, Controller, Headers, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { Octokit } from '@octokit/core';

import Log from '../lib/logger';
import { HookManagerService } from './hook-manager.service';

@Controller('git-hub')
export class HookManagerController {
    constructor(
        private readonly _hookService: HookManagerService,
    ) {}

    @Post('hooks')
    async githubHooks(@Body() webHookBody, @Headers() headers, @Res() res: Response) {
        const event = headers['x-github-event'];
        Log.info('webhook body keys: ', Object.keys(webHookBody));
        if(event !== "pull_request"){
            if(event !== "push"){
                // if not pull or push, send "request not implemented" status code
                res.sendStatus(501);
                return;
            }
            // if event is push, then it is for a personal repo. handle like old githooks

            // send "request accepted" status so github knows we got
            res.sendStatus(202);

            try {
                // const response = await this._hookService.processWebHook(webHookBody);
            } catch (err) {
                Log.info('failed to process webhook. err: ', err);
            }

            // if(response === undefined || response === null){
            //     // if response is bad, processing hook failed. this is where a not yet implemented notification bus would convey the error
            //     return;
            // }
        }
        else{
            Log.info('pull_request body keys: ', Object.keys(webHookBody.pull_request));
            // do same logic for push but only on pr_merges
            let response: any = {};

            // any case not 'merged' is handled but requires no action. send 'good' status code

            switch(webHookBody.action){
                case "opened":
                    res.sendStatus(200);
                    Log.info('PR opened');
                    break;
                case "synchronize":
                    res.sendStatus(200);
                    Log.info('PR committed to');
                    break;
                case "closed":
                    if(webHookBody.pull_request.merged){
                        // send status saying we got hook
                        res.sendStatus(202);
                        Log.info('PR merged. begin processing webhook');
                        response = await this._hookService.pr_merged(webHookBody);
                    }
                    else{
                        res.sendStatus(200);
                        Log.info('PR closed');
                    }
                    break;
                default:
                    // should we send error code instead of success code? commenting on a PR would be an example action "not accounted for"
                    res.sendStatus(200);
                    Log.info('action not accounted for. action: ', webHookBody.action)
                    return;
            }

            if(response === undefined || response === null){
                // if issue processing hook, send error status through notification bus
                return;
            }
        }
    }
}
