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
        // console.log(this.inferenceUrl, 'inferenceUrl=================', messages[1]?.text)
        const res = await axios.post(this.inferenceUrl, {
            "messages":[{"role":"system","content": messages[0]?.text.replace(/\n/g, '')},{"content": messages[1]?.text.replace(/\n/g, ''),"role":"user"}],
            "temperature":0.2,
            "model":"mpt-30b-chat",
            "top_p":0.9,
            "stream":false,
            "max_tokens":500
        }, {
            headers: {
                "accept": "*/*",
                "accept-language": "zh-CN,zh;q=0.9,en;q=0.8",
                "cache-control": "no-cache",
                "content-type": "application/json",
                "pragma": "no-cache",
                "sec-ch-ua": "\"Not.A/Brand\";v=\"8\", \"Chromium\";v=\"114\", \"Google Chrome\";v=\"114\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-platform": "\"macOS\"",
                "sec-fetch-dest": "empty",
                "sec-fetch-mode": "cors",
                "sec-fetch-site": "cross-site",
                "Referer": "https://ding.aliwork.com/",
                "Referrer-Policy": "strict-origin-when-cross-origin"
            },
            timeout: 10000
        }).catch(err => {
            console.log('err   模型请求错误', err);
        })
        console.log('\nmpt-------success', res, res?.data?.choices?.[0]?.message, '\n');

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

        // console.log(messages[1]?.text.replace(/\\n/g, ''), '\n');
        // console.log('"TOOLS------Assistant can ask the user to use tools to look up information that may be helpful in answering the users original question. The tools the human can use are:瑞幸咖啡助手for钉钉: 需要下单咖啡时使用你需要做以下事情：第一件事：请你根据以下参数描述定义一个object：name：咖啡名称，如标准美式、拿铁、馥芮白, 类型为 string, 值为标准美式cup：咖啡杯型，如大杯、中杯、小杯, 类型为 string, 值为大杯sugar：咖啡甜度，如不另外加糖、半糖、单份糖, 类型为 string, 值为半糖temp：咖啡温度，如冰、热, 类型为 string, 值为冰第二件事：如果可以从 user\'s input 内容中解析到object中参数所对应的内容，则将内容替换为 user\'s input 中的内容。第三件事：请你检查object中的每个参数值，必须确保每个参数的值不是空字符串或空，如果object中参数name的值是空字符串或空，则将object中参数name赋值为标准美式，如果object中参数cup的值是空字符串或空，则将object中参数cup赋值为大杯，如果object中参数sugar的值是空字符串或空，则将object中参数sugar赋值为半糖，如果object中参数temp的值是空字符串或空，则将object中参数temp赋值为冰，最后将object通过JSON.stringify处理后，作为 input 返回。RESPONSE FORMAT INSTRUCTIONS----------------------------Output a JSON markdown code snippet containing a valid JSON object in one of two formats:**Option 1:**Use this if you want the human to use a tool.Markdown code snippet formatted in the following schema:```json{    \\"action\\": string, // The action to take. Must be one of [瑞幸咖啡助手for钉钉]    \\"action_input\\": string // The input to the action. May be a stringified object.}```**Option #2:**Use this if you want to respond directly and conversationally to the human. Markdown code snippet formatted in the following schema:```json{    \\"action\\": \\"Final Answer\\",    \\"action_input\\": string // You should put what you want to return to use here and make sure to use valid json newline characters.}```For both options, remember to always include the surrounding markdown code snippet delimiters (begin with \\"```json\\" and end with \\"```\\")!USER\'S INPUT--------------------Here is the user\'s input (remember to respond with a markdown code snippet of a json blob with a single action, and NOTHING else):冰美式"', '\n');
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
        //     "body": '{"messages":[{"role":"system","content":"Assistant is a large language model trained by OpenAI.Assistant is designed to be able to assist with a wide range of tasks, from answering simple questions to providing in-depth explanations and discussions on a wide range of topics. As a language model, Assistant is able to generate human-like text based on the input it receives, allowing it to engage in natural-sounding conversations and provide responses that are coherent and relevant to the topic at hand.Assistant is constantly learning and improving, and its capabilities are constantly evolving. It is able to process and understand large amounts of text, and can use this knowledge to provide accurate and informative responses to a wide range of questions. Additionally, Assistant is able to generate its own text based on the input it receives, allowing it to engage in discussions and provide explanations and descriptions on a wide range of topics.Overall, Assistant is a powerful system that can help with a wide range of tasks and provide valuable insights and information on a wide range of topics. Whether you need help with a specific question or just want to have a conversation about a particular topic, Assistant is here to assist. However, above all else, all responses must adhere to the format of RESPONSE FORMAT INSTRUCTIONS."},{"content":"TOOLS------Assistant can ask the user to use tools to look up information that may be helpful in answering the users original question. The tools the human can use are:瑞幸咖啡助手for钉钉: 需要下单咖啡时使用你需要做以下事情：第一件事：请你根据以下参数描述定义一个object：name：咖啡名称，如标准美式、拿铁、馥芮白, 类型为 string, 值为标准美式cup：咖啡杯型，如大杯、中杯、小杯, 类型为 string, 值为大杯sugar：咖啡甜度，如不另外加糖、半糖、单份糖, 类型为 string, 值为半糖temp：咖啡温度，如冰、热, 类型为 string, 值为冰第二件事：如果可以从 user\'s input 内容中解析到object中参数所对应的内容，则将内容替换为 user\'s input 中的内容。第三件事：请你检查object中的每个参数值，必须确保每个参数的值不是空字符串或空，如果object中参数name的值是空字符串或空，则将object中参数name赋值为标准美式，如果object中参数cup的值是空字符串或空，则将object中参数cup赋值为大杯，如果object中参数sugar的值是空字符串或空，则将object中参数sugar赋值为半糖，如果object中参数temp的值是空字符串或空，则将object中参数temp赋值为冰，最后将object通过JSON.stringify处理后，作为 input 返回。RESPONSE FORMAT INSTRUCTIONS----------------------------Output a JSON markdown code snippet containing a valid JSON object in one of two formats:**Option 1:**Use this if you want the human to use a tool.Markdown code snippet formatted in the following schema:```json{    \\"action\\": string, // The action to take. Must be one of [瑞幸咖啡助手for钉钉]    \\"action_input\\": string // The input to the action. May be a stringified object.}```**Option #2:**Use this if you want to respond directly and conversationally to the human. Markdown code snippet formatted in the following schema:```json{    \\"action\\": \\"Final Answer\\",    \\"action_input\\": string // You should put what you want to return to use here and make sure to use valid json newline characters.}```For both options, remember to always include the surrounding markdown code snippet delimiters (begin with \\"```json\\" and end with \\"```\\")!USER\'S INPUT--------------------Here is the user\'s input (remember to respond with a markdown code snippet of a json blob with a single action, and NOTHING else):冰美式","role":"user"}],"temperature":0.2,"model":"mpt-30b-chat","top_p":0.9,"stream":false,"max_tokens":500}',
        //     "method": "POST",
        //     "timeout": 1,
        //     }).then(res => res.json()).then(res => {
        //     console.log(res.choices[0].message)
        //     }).catch(err => {
        //     console.log(err)
        //     });

        // const clientConfig = new Configuration({
        //     basePath: 'http://116.62.203.223:8090/v1/chat/completions',
        //     baseOptions: {
        //         timeout: 5000,
        //     },
        // });
        // this.client = new OpenAIApi(clientConfig);
        // const axiosOptions = {
        //     ...clientConfig.baseOptions,
        // };
        // await this.caller
        //     .call(this.client.createChatCompletion.bind(this.client), {
        //         messages: [{"role":"system","content": messages[0]?.text},{"content":messages[1]?.text,"role":"user"}],
        //         temperature: 0.2,
        //         model: "mpt-30b-chat",
        //         topP: 0.9,
        //         stream: false,
        //         maxTokens: 500,
        //     }, axiosOptions)
        //     .then((res) => {
        //         console.log('--------------------', res, res.data)
        //     }).catch((err) => {
        //         console.log('--------------------', err)
        //     });

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
