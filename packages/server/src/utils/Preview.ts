export function buildPreviewFlowData(nodeData: any) {
    return {
        nodes: [
            {
                width: 300,
                height: 143,
                id: nodeData.id,
                position: {
                    x: 538.512695652174,
                    y: -77.39460869565215
                },
                type: 'customNode',
                data: {
                    ...nodeData
                },
                selected: false,
                positionAbsolute: {
                    x: 538.512695652174,
                    y: -77.39460869565215
                },
                dragging: false
            },
            {
                width: 300,
                height: 385,
                id: 'conversationalAgent_0',
                position: {
                    x: 1093.3238260869566,
                    y: 96.00939130434782
                },
                type: 'customNode',
                data: {
                    id: 'conversationalAgent_0',
                    name: 'conversationalAgent',
                    label: 'Conversational Agent',
                    type: 'AgentExecutor',
                    category: 'Agents',
                    description: 'Conversational agent for a chat model. It will utilize chat specific prompts',
                    baseClasses: ['AgentExecutor', 'BaseChain', 'BaseLangChain'],
                    filePath: 'https://bp0r55-node-js.oss.laf.dev/ConversationalAgent.js',
                    icon: 'https://bp0r55-node-js.oss.laf.dev/agent.svg',
                    inputs: {
                        tools: [`{{${nodeData.id}.data.instance}}`],
                        model: '{{openAI_0.data.instance}}',
                        memory: '{{bufferMemory_1.data.instance}}',
                        systemMessage: '',
                        humanMessage: ''
                    },
                    inputAnchors: [
                        {
                            label: '插件',
                            name: 'tools',
                            type: 'Tool',
                            list: true,
                            id: 'conversationalAgent_0-input-tools-Tool'
                        },
                        {
                            label: 'Language Model',
                            name: 'model',
                            type: 'BaseLanguageModel',
                            id: 'conversationalAgent_0-input-model-BaseLanguageModel'
                        },
                        {
                            label: 'Memory',
                            name: 'memory',
                            type: 'BaseChatMemory',
                            id: 'conversationalAgent_0-input-memory-BaseChatMemory'
                        }
                    ],
                    inputParams: [
                        {
                            label: 'System Message',
                            name: 'systemMessage',
                            type: 'string',
                            rows: 4,
                            optional: true,
                            additionalParams: true,
                            id: 'conversationalAgent_0-input-systemMessage-string'
                        },
                        {
                            label: 'Human Message',
                            name: 'humanMessage',
                            type: 'string',
                            rows: 4,
                            optional: true,
                            additionalParams: true,
                            id: 'conversationalAgent_0-input-humanMessage-string'
                        }
                    ],
                    outputs: {},
                    outputAnchors: [
                        {
                            id: 'conversationalAgent_0-output-conversationalAgent-AgentExecutor|BaseChain|BaseLangChain',
                            name: 'conversationalAgent',
                            label: 'AgentExecutor',
                            type: 'AgentExecutor | BaseChain | BaseLangChain'
                        }
                    ],
                    selected: false
                },
                selected: false,
                positionAbsolute: {
                    x: 1093.3238260869566,
                    y: 96.00939130434782
                },
                dragging: false
            },
            {
                width: 300,
                height: 526,
                id: 'openAI_0',
                position: {
                    x: 540.4410434782608,
                    y: 75.90904347826088
                },
                type: 'customNode',
                data: {
                    id: 'openAI_0',
                    name: 'openAI',
                    label: 'LLM',
                    type: 'OpenAI',
                    category: 'LLMs',
                    description: 'Wrapper around OpenAI large language models',
                    baseClasses: ['OpenAI', 'BaseLLM', 'BaseLanguageModel', 'BaseLangChain'],
                    filePath: 'https://bp0r55-node-js.oss.laf.dev/OpenAI.js',
                    icon: 'https://bp0r55-node-js.oss.laf.dev/openai.png',
                    inputs: {
                        openAIApiKey: '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',
                        modelName: 'gpt-3.5-turbo',
                        temperature: 0.7,
                        maxTokens: '',
                        topP: '',
                        bestOf: '',
                        frequencyPenalty: '',
                        presencePenalty: '',
                        batchSize: '',
                        timeout: ''
                    },
                    inputAnchors: [],
                    inputParams: [
                        {
                            label: 'OpenAI Api Key',
                            name: 'openAIApiKey',
                            type: 'password',
                            id: 'openAI_0-input-openAIApiKey-password'
                        },
                        {
                            label: 'Model Name',
                            name: 'modelName',
                            type: 'options',
                            options: [
                                {
                                    label: 'text-davinci-003',
                                    name: 'text-davinci-003'
                                },
                                {
                                    label: 'gpt-3.5-turbo',
                                    name: 'gpt-3.5-turbo'
                                },
                                {
                                    label: 'text-davinci-002',
                                    name: 'text-davinci-002'
                                },
                                {
                                    label: 'text-curie-001',
                                    name: 'text-curie-001'
                                },
                                {
                                    label: 'text-babbage-001',
                                    name: 'text-babbage-001'
                                }
                            ],
                            default: 'gpt-3.5-turbo',
                            optional: true,
                            id: 'openAI_0-input-modelName-options'
                        },
                        {
                            label: 'Temperature',
                            name: 'temperature',
                            type: 'number',
                            default: 0.7,
                            optional: true,
                            id: 'openAI_0-input-temperature-number'
                        },
                        {
                            label: 'Max Tokens',
                            name: 'maxTokens',
                            type: 'number',
                            optional: true,
                            additionalParams: true,
                            id: 'openAI_0-input-maxTokens-number'
                        },
                        {
                            label: 'Top Probability',
                            name: 'topP',
                            type: 'number',
                            optional: true,
                            additionalParams: true,
                            id: 'openAI_0-input-topP-number'
                        },
                        {
                            label: 'Best Of',
                            name: 'bestOf',
                            type: 'number',
                            optional: true,
                            additionalParams: true,
                            id: 'openAI_0-input-bestOf-number'
                        },
                        {
                            label: 'Frequency Penalty',
                            name: 'frequencyPenalty',
                            type: 'number',
                            optional: true,
                            additionalParams: true,
                            id: 'openAI_0-input-frequencyPenalty-number'
                        },
                        {
                            label: 'Presence Penalty',
                            name: 'presencePenalty',
                            type: 'number',
                            optional: true,
                            additionalParams: true,
                            id: 'openAI_0-input-presencePenalty-number'
                        },
                        {
                            label: 'Batch Size',
                            name: 'batchSize',
                            type: 'number',
                            optional: true,
                            additionalParams: true,
                            id: 'openAI_0-input-batchSize-number'
                        },
                        {
                            label: 'Timeout',
                            name: 'timeout',
                            type: 'number',
                            optional: true,
                            additionalParams: true,
                            id: 'openAI_0-input-timeout-number'
                        }
                    ],
                    outputs: {},
                    outputAnchors: [
                        {
                            id: 'openAI_0-output-openAI-OpenAI|BaseLLM|BaseLanguageModel|BaseLangChain',
                            name: 'openAI',
                            label: 'OpenAI',
                            type: 'OpenAI | BaseLLM | BaseLanguageModel | BaseLangChain'
                        }
                    ],
                    selected: true
                },
                selected: true,
                positionAbsolute: {
                    x: 540.4410434782608,
                    y: 75.90904347826088
                },
                dragging: false
            },
            {
                width: 300,
                height: 378,
                id: 'bufferMemory_1',
                position: {
                    x: 560.6886956521736,
                    y: 596.5629565217392
                },
                type: 'customNode',
                data: {
                    id: 'bufferMemory_1',
                    name: 'bufferMemory',
                    label: 'Buffer Memory',
                    type: 'BufferMemory',
                    category: 'Memory',
                    description: 'Remembers previous conversational back and forths directly',
                    baseClasses: ['BufferMemory', 'BaseChatMemory', 'BaseMemory'],
                    filePath: 'https://bp0r55-node-js.oss.laf.dev/BufferMemory.js',
                    icon: 'https://bp0r55-node-js.oss.laf.dev/memory.svg',
                    inputs: {
                        memoryKey: 'chat_history',
                        inputKey: 'input'
                    },
                    inputAnchors: [],
                    inputParams: [
                        {
                            label: 'Memory Key',
                            name: 'memoryKey',
                            type: 'string',
                            default: 'chat_history',
                            id: 'bufferMemory_1-input-memoryKey-string'
                        },
                        {
                            label: 'Input Key',
                            name: 'inputKey',
                            type: 'string',
                            default: 'input',
                            id: 'bufferMemory_1-input-inputKey-string'
                        }
                    ],
                    outputs: {},
                    outputAnchors: [
                        {
                            id: 'bufferMemory_1-output-bufferMemory-BufferMemory|BaseChatMemory|BaseMemory',
                            name: 'bufferMemory',
                            label: 'BufferMemory',
                            type: 'BufferMemory | BaseChatMemory | BaseMemory'
                        }
                    ],
                    selected: false
                },
                selected: false,
                positionAbsolute: {
                    x: 560.6886956521736,
                    y: 596.5629565217392
                },
                dragging: false
            }
        ],
        edges: [
            {
                source: nodeData.id,
                sourceHandle: nodeData.outputAnchors[0].id,
                target: 'conversationalAgent_0',
                targetHandle: 'conversationalAgent_0-input-tools-Tool',
                type: 'buttonedge',
                id: `${nodeData.outputAnchors[0].id}-conversationalAgent_0-conversationalAgent_0-input-tools-Tool`,
                data: {
                    label: ''
                }
            },
            {
                source: 'openAI_0',
                sourceHandle: 'openAI_0-output-openAI-OpenAI|BaseLLM|BaseLanguageModel|BaseLangChain',
                target: 'conversationalAgent_0',
                targetHandle: 'conversationalAgent_0-input-model-BaseLanguageModel',
                type: 'buttonedge',
                id: 'openAI_0-openAI_0-output-openAI-OpenAI|BaseLLM|BaseLanguageModel|BaseLangChain-conversationalAgent_0-conversationalAgent_0-input-model-BaseLanguageModel',
                data: {
                    label: ''
                }
            },
            {
                source: 'bufferMemory_1',
                sourceHandle: 'bufferMemory_1-output-bufferMemory-BufferMemory|BaseChatMemory|BaseMemory',
                target: 'conversationalAgent_0',
                targetHandle: 'conversationalAgent_0-input-memory-BaseChatMemory',
                type: 'buttonedge',
                id: 'bufferMemory_1-bufferMemory_1-output-bufferMemory-BufferMemory|BaseChatMemory|BaseMemory-conversationalAgent_0-conversationalAgent_0-input-memory-BaseChatMemory',
                data: {
                    label: ''
                }
            }
        ],
        viewport: {
            x: -418.5223665223666,
            y: 28.870382395382535,
            zoom: 1.0371572871572872
        }
    }
}