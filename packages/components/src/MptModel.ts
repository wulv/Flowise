// @ts-nocheck
import { BaseChatModel } from "langchain/chat_models/base";
import axios from 'axios';

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
        return ["options"];
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
        // 基础参数        
        this.inferenceUrl = fields?.inferenceUrl;
        this.modelName = fields?.modelName ?? this.modelName;
        this.temperature = fields?.temperature ?? this.temperature;
        this.maxTokens = fields?.maxTokens ?? this.maxTokensToSample;
        this.streaming = fields?.streaming ?? false;
    }
    /** @ignore */
    async _generate(messages, options, runManager) {
        // const params = this.invocationParams();
        console.log('\nmpt-------params', messages, options, runManager, '\n');
        axios.post(this.inferenceUrl, {
            "messages":[{"role":"system","content":"你是一个ai助理，你可以完成用户的指令，并避免产生幻觉，请用中文回答。"},{"content":"当用户需要点咖啡时使用。\n根据用户指令提取一下字段并输出\nname：咖啡名称，如标准美式、拿铁、馥芮白,  默认值为标准美式，注意，如果用户输入咖啡名为美式，请转换为标准美式，如果用户输入为加浓美式，则为加浓美式\ncup：咖啡杯型，如大杯、中杯、小杯,   默认值为大杯\nsugar：咖啡甜度，如不另外加糖、半糖、单份糖、标准甜、少甜、少少甜, 默认不另外加糖\ntemp：咖啡温度，如冰、热、去冰,  默认为冰\n\n输入：点一杯中杯拿铁\n输出：{name: '拿铁', temp: '冰', sugar: '不加糖', cup: '大杯'}\n\n输入：我要大杯冰美式，三分糖\n输出：{name: '标准美式', temp: '冰', sugar: '三分糖', cup: '大杯'}\n\n输入：小羊美式，不加糖，中杯热\n输出：{name: '小羊美式', temp: '热', sugar: '不另外加糖', cup: '中杯'}\n\n输入：来一杯大杯加浓美式，三分糖\n\n","role":"user"}],
            "temperature":0.2,
            "model":"mpt-30b-chat",
            "top_p":0.9,
            "stream":false,
            "max_tokens":500
        }, {
            headers: {
                contentType: 'application/json',
                Host: 'pre-lippi-mpt-model-service.alibaba-inc.com',
                authority: 'pre-lippi-mpt-model-service.alibaba-inc.com',
                origin: 'https://ding.aliwork.com',
                referer: 'https://ding.aliwork.com/'
            }
        }).then((res) => {
            console.log('\nmpt-------success', res, '\n');
        }).catch((err) => {
            console.log('\nmpt-------fail', err, '\n');
        })

        return {
            generations: [{
                text: '{"name":"加浓美式","temp":"冰","sugar":"三分糖","cup":"大杯"}'
            }]
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
