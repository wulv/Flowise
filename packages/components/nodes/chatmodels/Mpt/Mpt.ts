import { INode, INodeData, INodeParams } from '../../../src/Interface'
import { getBaseClasses } from '../../../src/utils'
import { ChatOpenAI, OpenAIChatInput } from 'langchain/chat_models/openai'
// @ts-ignore
import { MptModel } from './MptModel'

class Mpt_ChatModels implements INode {
    label: string
    name: string
    type: string
    icon: string
    category: string
    description: string
    baseClasses: string[]
    inputs: INodeParams[]

    constructor() {
        this.label = 'Mpt'
        this.name = 'Mpt'
        this.type = 'MptChatModel'
        this.icon = 'openai.png'
        this.category = 'Chat Models'
        this.description = 'Wrapper around OpenAI large language models that use the Chat endpoint'
        this.baseClasses = [this.type, ...getBaseClasses(ChatOpenAI)]
        this.inputs = [
            {
                label: 'Model Name',
                name: 'modelName',
                type: 'options',
                options: [
                    {
                        label: 'mpt-30b-chat',
                        name: 'mpt-30b-chat'
                    },
                ],
                default: 'mpt-30b-chat'
            },
            {
                label: 'Temperature',
                name: 'temperature',
                type: 'number',
                default: 0.2,
                optional: true
            },
            {
                label: 'Max Tokens',
                name: 'maxTokens',
                type: 'number',
                optional: true,
                default: 500
            },
            {
                label: 'Inference URL',
                name: 'inferenceUrl',
                type: 'string',
                optional: true,
                default: 'https://pre-lippi-mpt-model-service.alibaba-inc.com/v1/chat/completions',
                additionalParams: true
            },
        ]
    }

    async init(nodeData: INodeData): Promise<any> {
        const temperature = nodeData.inputs?.temperature as string
        const modelName = nodeData.inputs?.modelName as string
        const maxTokens = nodeData.inputs?.maxTokens as string
        const inferenceUrl = nodeData.inputs?.inferenceUrl as string

        console.log('\nmpt params-----------', temperature, modelName, maxTokens, inferenceUrl, '\n');

        const obj: Partial<OpenAIChatInput> & {inferenceUrl: string} = {
            temperature: parseInt(temperature, 10),
            modelName,
            inferenceUrl
        }

        if (maxTokens) obj.maxTokens = parseInt(maxTokens, 10)

        const model = new MptModel(obj)
        return model
    }
}

module.exports = { nodeClass: Mpt_ChatModels }
