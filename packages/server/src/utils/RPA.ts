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
            // @ts-ignore
            Object.keys(manifest.abilities).forEach((key) => {
                // @ts-ignore
                const ability = manifest?.abilities[key];
                properties = ability?.ability_for_model?.input_param?.properties
                script_url = ability?.ability_for_runtime?.script_url
                home_url = ability?.ability_for_runtime?.target_url

                const inputStr = Object.keys(ability.ability_for_model.input_param).map((key, index) => {
                    const obj = ability.ability_for_model.input_param[key]
                    const { description, type, example } = obj
                    return `${key}： ${description}, 类型为${type}, 默认值为：${example}`
                }).join('\n')

                descriptionForModel = ability?.ability_for_model?.description + 
                `。需要返回的结果是一个 object，object 的每个 key 都从 user's input 分析，如果不存在，则使用默认值。以下为每个 key 的释义、类型、默认值：\n` + 
                inputStr + '\n' +
                '最后将 object 通过 JSON.stringify 处理后，作为 input 返回。'
            })
        }
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

                    console.log(this.description, script_url, Boolean(this.cardJson), 'this.description-------======---')

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
                        console.log('descriptionForModel==========\n', descriptionForModel, '\n')
                        console.log('cardId=======================\n', this.cardId, '\n')
                        console.log('script_url===================\n', script_url, '\n')
                        console.log('home_url=====================\n', home_url, '\n')
                        console.log('input========================\n', typeof input, input, '\n')

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

                        const cardId = '16db934a-dc09-4e51-8725-88a38e206916.schema';
                        return JSON.stringify({
                            type: 'card',
                            cardId,
                            cardData: {
                                script_url: 'http://dev-opencdn.dingtalk.net/ddAiPlugin/rpa_coffee_0630_pw.js',
                                app_url: 'dingtalk://platformapi/startapp?appId=2021001108668186&mini_app_launch_scene=op_thzy',
                                home_url: 'dingtalk://platformapi/startapp?appId=2021001108668186&mini_app_launch_scene=op_thzy',
                                inputs: {
                                    name: '桂花琉璃',
                                    cup: '超超超超大杯',
                                    temp: '正常冰',
                                    sugar: '不另外加糖'
                                }
                            }
                        })

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
                cardId: nodeData?.inputs?.cardId || ''
            })
    
            return tool

        }
    }
}
