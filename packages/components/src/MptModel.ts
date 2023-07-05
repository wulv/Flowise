// @ts-nocheck
import { BaseChatModel } from "langchain/chat_models/base";
import axios from 'axios';
import { AIChatMessage } from 'langchain/schema';
import { OpenAIApi, Configuration } from "openai";

/**
 * Wrapper around Anthropic large language models.
 *
 * To use you should have the `@anthropic-ai/sdk` package installed, with the
 * `ANTHROPIC_API_KEY` environment variable set.
 *
 * @remarks
 * Any parameters that are valid to be passed to {@link
 * https://console.anthropic.com/docs/api/reference |
 * `anthropic.complete`} can be passed through {@link invocationKwargs},
 * even if not explicitly available on this class.
 *
 */
export class MptModel extends BaseChatModel {
    get callKeys() {
        return ["stop", "signal", "timeout", "options"];
    }
    constructor(fields) {
        super(fields ?? {});
        Object.defineProperty(this, "temperature", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0.1
        });
        Object.defineProperty(this, "maxTokensToSample", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 500
        });
        Object.defineProperty(this, "modelName", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "mpt-30b-chat"
        });
        Object.defineProperty(this, "stop", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        // 基础参数        
        this.inferenceUrl = fields?.inferenceUrl;
        this.modelName = fields?.modelName ?? this.modelName;
        this.temperature = fields?.temperature ?? this.temperature;
        this.maxTokens = fields?.maxTokens ?? this.maxTokensToSample;
        this.streaming = fields?.streaming ?? false;
        this.stop = fields?.stop;
    }
    /** @ignore */
    async _generate(messages, options, runManager) {
        console.log(this.inferenceUrl, 'inferenceUrl=================', messages[1]?.text)
        // const res = await axios.post(this.inferenceUrl, {
        //     "messages":[{"role":"system","content": messages[0]?.text.replace(/\\n/g, '')},{"content": messages[1]?.text.replace(/\\n/g, ''),"role":"user"}],
        //     "temperature":0.2,
        //     "model":"mpt-30b-chat",
        //     "top_p":0.9,
        //     "stream":false,
        //     "max_tokens":500
        // }, {
        //     headers: {
        //         "accept": "*/*",
        //         "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        //         "cache-control": "no-cache",
        //         "content-type": "application/json",
        //         "pragma": "no-cache",
        //         "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Google Chrome\";v=\"114\"",
        //         "sec-ch-ua-mobile": "?0",
        //         "sec-ch-ua-platform": "\"macOS\"",
        //         "sec-fetch-dest": "empty",
        //         "sec-fetch-mode": "cors",
        //         "sec-fetch-site": "cross-site",
        //         "Referer": "https://ding.aliwork.com/",
        //         "Referrer-Policy": "strict-origin-when-cross-origin"
        //     },
        //     timeout: 10000
        // }).catch(err => {
        //     // console.log('err   模型请求错误', err);
        // })
        // console.log('\nmpt-------success', res, res?.data?.choices?.[0]?.message, '\n');

        // await fetch("http://116.62.203.223:8090/v1/chat/completions", {
        //     "headers": {
        //         "accept": "*/*",
        //         "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
        //         "cache-control": "no-cache",
        //         "content-type": "application/json",
        //         "pragma": "no-cache",
        //         "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Google Chrome\";v=\"114\"",
        //         "sec-ch-ua-mobile": "?0",
        //         "sec-ch-ua-platform": "\"macOS\"",
        //         "sec-fetch-dest": "empty",
        //         "sec-fetch-mode": "cors",
        //         "sec-fetch-site": "cross-site",
        //         "Referer": "https://ding.aliwork.com/",
        //         "Referrer-Policy": "strict-origin-when-cross-origin"
        //     },
        //     "body": `{"messages":[{"role":"system","content": ${messages[0]?.text}},{"content":${messages[1]?.text},"role":"user"}],"temperature":0.2,"model":"mpt-30b-chat","top_p":0.9,"stream":false,"max_tokens":500}`,
        //     "method": "POST",
        //     "timeout": 1,
        //     }).then(res => res.json()).then(res => {
        //         console.log(res, res?.choices?.[0]?.message)
        //     }).catch(err => {
        //         console.log(err)
        //     });

        const clientConfig = new Configuration({
            basePath: 'http://116.62.203.223:8090/v1/chat/completions',
            baseOptions: {
                timeout: 5000,
            },
        });
        this.client = new OpenAIApi(clientConfig);
        const axiosOptions = {
            ...clientConfig.baseOptions,
        };
        await this.caller
            .call(this.client.createChatCompletion.bind(this.client), {
                messages: [{"role":"system","content": messages[0]?.text},{"content":messages[1]?.text,"role":"user"}],
                temperature: 0.2,
                model: "mpt-30b-chat",
                topP: 0.9,
                stream: false,
                maxTokens: 500,
            }, axiosOptions)
            .then((res) => {
                console.log('--------------------', res, res.data)
            }).catch((err) => {
                console.log('--------------------', err)
            });

        return {
            generations: [{
                text: '{\n' +
                '    "action": "瑞幸咖啡助手for钉钉",\n' +
                '    "action_input": "{\\"name\\":\\"标准美式\\",\\"cup\\":\\"大杯\\",\\"sugar\\":\\"半糖\\",\\"temp\\":\\"冰\\"}"\n' +
                '}',
                message: new AIChatMessage('{\n' +
                '    "action": "瑞幸咖啡助手for钉钉",\n' +
                '    "action_input": "{\\"name\\":\\"标准美式\\",\\"cup\\":\\"大杯\\",\\"sugar\\":\\"半糖\\",\\"temp\\":\\"冰\\"}"\n' +
                '}')
            }],
            llmOutput: { tokenUsage: {} } 
        };
    }
    /**
     * Get the parameters used to invoke the model
     */
       invocationParams() {
        return {
            model: this.modelName,
            temperature: this.temperature,
            stop: this.stop,
            maxTokens: this.maxTokens,
        };
    }
    /** @ignore */
    _identifyingParams() {
        return {
            model_name: this.modelName,
            ...this.invocationParams(),
        };
    }
    /**
     * Get the identifying parameters for the model
     */
    identifyingParams() {
        return {
            model_name: this.modelName,
            ...this.invocationParams(),
        };
    }
    _llmType() {
        return "mpt";
    }
    /** @ignore */
    _combineLLMOutput() {
        return [];
    }
}
