import { INode, INodeData } from "flowise-components"
import { IManifest } from "../Interface"
import { Tool } from 'langchain/tools'
import mustache from 'mustache'

export const buildTool = (manifest: IManifest) => {
    // @ts-ignore
    let properties = manifest?.api_for_model?.input_param?.properties
                    // @ts-ignore
    let script_url = manifest?.api_for_framework?.script_url || ''

    let descriptionForModel = '';

    let home_url = '';

    try {
        // @ts-ignore
        if (manifest.abilities) {
          descriptionForModel += `你具备以下几个能力，请依据 user's input 的内容，判断应该使用哪个能力，请你注意，只能选择其中的一个能力，不能同时使用多个能力。`
          descriptionForModel += `下面是每个能力介绍及其使用方法。\n`
            // @ts-ignore
            Object.keys(manifest.abilities).forEach((key, index) => {
                // @ts-ignore
                const ability = manifest?.abilities[key];
                properties = ability?.ability_for_model?.input_param?.properties
                script_url = ability?.ability_for_runtime?.script_url
                home_url = ability?.ability_for_runtime?.target_url

                let inputStr = Object.keys(ability.ability_for_model.input_param).map((key, index) => {
                    const obj = ability.ability_for_model.input_param[key]
                    const { description, type, example } = obj
                    return `${key}：${description}, 类型为 ${type}, 值为${example}`
                }).join('\n')

                inputStr += `_index：能力编号，值为${index}。`

                const emptyStr = Object.keys(ability.ability_for_model.input_param).map((key, index) => {
                    const obj = ability.ability_for_model.input_param[key]
                    return `如果object中参数${key}的值是空字符串或空，则将object中参数${key}赋值为${obj.example}，`
                }).join('')

                descriptionForModel += `/////能力${index}，能力描述：` + ability?.ability_for_model?.description +
                `能力使用步骤：` +
                `\n步骤1：请你根据以下参数描述定义一个object：\n` + 
                inputStr + `\n` +
                `\n步骤2：如果可以从 user's input 内容中解析到object中参数所对应的内容，则将内容替换为 user's input 中的内容。` +
                `\n步骤3：请你检查object中的每个参数值，必须确保每个参数的值不是空字符串或空，且不能有多余的参数` + emptyStr +
                '\n步骤4：最后将object通过JSON.stringify处理后，作为 input 返回。/////'
            })
            descriptionForModel += `请你挑选出要使用的一个能力，并依据其说明，返回 input`
        }
        /**
         * 我具备以下几个能力，请你依据 user's input 的内容，判断我应该使用哪个能力，请你注意，你只能选择其中的一个能力，不能同时使用多个能力。
         * 现在我将分别介绍每个能力及其使用方法，你可以依据这些信息，选择其中一个能力。
         * ///
         * 能力1：{{ability1}}，{{description}}
         * ///
         * 能力2：{{ability2}}，{{description}}
         * ///
         * 能力3：{{ability2}}，{{description}}
         * ///
         * 请你挑选出要使用的能力，并依据其说明，将你得到的 object 通过 JSON.stringify 处理后输出。
         */
    } catch (err) {
        console.log(err, 'err----------')
    }
  
    const name = manifest?.name_for_human || ''
    const type = manifest?.name_for_model || ''
    const description = manifest?.description_for_human || ''
    // @ts-ignore
    let inputs: any[] = []

    if (properties) {
        inputs = Object.keys(properties).map((key) => {
            return {
                label: properties[key].description || '',
                name: key,
                type: properties[key].type || '',
                sample: properties[key].sample || '',
            }
        })
    }
    return {
        label: name,
        name: name,
        type: type,
        icon: 'https://bp0r55-node-js.oss.laf.dev/chaintool.svg',
        "category": "Tools",
        description: description,
        baseClasses: [type,],
        inputs: inputs,
        init: async (nodeData: INodeData, question: string) => {
            class RPATool extends Tool {
                name: string
            
                description: string
            
                webhook: string
            
                input: string
                cardId?: string
                cardJson?: any
                returnDirect: boolean
                url: string
            
                constructor(fields: any) {
                    super()
                    this.description = descriptionForModel || manifest.description_for_model
                    this.url =  manifest.api_for_framework?.url
                    this.name = name
                    this.cardId = this._getCardId(fields, manifest);
                    this.cardJson = this._getCardJson(fields, manifest);
                    // @ts-ignore
                    this.webhook = manifest.api_for_framework?.webhook_url as string
                    this.returnDirect = true
                }

                _getCardId(fields: any, manifest: any) {
                    if (fields?.cardId) {
                        return fields.cardId
                    }

                    if (manifest?.api_for_model?.input_param?.properties?.cardId) {
                        return manifest?.api_for_model?.input_param?.properties?.cardId?.sample
                    }

                    if (manifest?.abilities) {
                        return manifest?.abilities[Object.keys(manifest?.abilities)[0]]?.ability_for_runtime?.card_id
                    }
                }

                _getCardJson(fields: any,manifest: any) {
                    let cardJson = ''
                    if (manifest?.abilities) {
                        const abilities = manifest?.abilities;
                        try {
                            Object.keys(abilities).forEach((key) => {
                                if (abilities[key]?.ability_for_runtime?.card_json) {
                                    cardJson = abilities[key]?.ability_for_runtime?.card_json
                                }
                            })
                        } catch (err) {
                            console.log(err, 'err----------');
                        }
                    }
                    if (manifest?.api_for_framework?.card_json) {
                        cardJson = manifest?.api_for_framework?.card_json?.jsons?.[0] || '{}'
                    }
                    return cardJson
                }
            
                /** @ignore */
                async _call(input: string) {
                    try {
                        console.log('descriptionForModel====\n', descriptionForModel, '\ndescriptionForModel====\n')
                        console.log('cardId====', this.cardId, '\n')
                        console.log('script_url====', script_url, '\n')
                        console.log('home_url====', home_url, '\n')
                        console.log('input====', typeof input, input, '\n')

                        if (script_url && this.cardId) {
                            try {
                                const cardJson = {
                                    type: 'card',
                                    cardId: this.cardId,
                                    cardData: {
                                        script_url: script_url,
                                        app_url: home_url,
                                        home_url,
                                        inputs: JSON.parse(input)
                                    }
                                }
                                return JSON.stringify(cardJson)
                            } catch (err) {
                                console.log(input, 'input 解析错误------------------------')
                            }
                        }

                        if (script_url && this.cardId) {
                            // 场景1,cdn方式
                            const inputs = input.split('|')
                            return JSON.stringify({
                                type: 'card',
                                cardId: this.cardId,
                                cardData: {
                                    script_url: `${script_url}`,
                                    app_url: this.url,
                                    inputs: inputs
                                }
                            })
                        }

                        if (script_url && this.cardJson) {
                            const inputs = JSON.parse(input)
                            const params = []
                            // 读出参拼参数
                            inputs.users && params.push(inputs.users)
                            inputs.index && params.push(inputs.index)
                            Object.assign(inputs, {
                                url: `https://applink.dingtalk.com/copilot/run_script?script_url=${encodeURIComponent(
                                    script_url
                                )}&inputs=${encodeURIComponent(JSON.stringify(params))}`
                            })
                            let templateString = ''
                            try {
                                templateString = mustache.render(this.cardJson, inputs || {}, {})
                            } catch (error) {
                                console.error('render error', error)
                                return
                            }
                            const cardJson = JSON.parse(templateString)

                            // 使用 mustache 替换会encode
                            cardJson.contents[
                                cardJson.contents.length - 1
                            ].actions[0].url.all = `https://applink.dingtalk.com/copilot/run_script?script_url=${encodeURIComponent(
                                script_url
                            )}&inputs=${encodeURIComponent(JSON.stringify(params))}`
                            console.log(cardJson, '=============')
                            console.log(inputs, '-----------')

                            return JSON.stringify({
                                type: 'card',
                                input,
                                cardId: 'StandardCard',
                                cardData: {
                                    cardJson
                                }
                            })
                        }

                        // 场景2,webhook方式
                        if (this.webhook) {
                            const headers = { 'Content-Type': 'application/json' }
                            const body = JSON.stringify({ input: input })
                            // @ts-ignore
                            const response = await fetch(this.webhook, {
                                method: 'POST',
                                headers,
                                body
                            }).then((res: any) => res.json())
                            if (response.result === true) {
                                return '正在执行中...'
                            }
                            return JSON.stringify(response)
                        }

                        // 场景3,直接返回
                        throw new Error('RPA无法执行，script_url、webhook、cardId、cardJson都未配置');
                    } catch (error: any) {
                        console.log(error)
                        return error?.message || 'RPC脚本执行异常';
                    }
                }
            }
            const tool = new RPATool({
                // 搭建页面插件表单填写的参数
                cardId: nodeData?.inputs?.cardId || ''
            })
    
            return tool

        }
    }
}
