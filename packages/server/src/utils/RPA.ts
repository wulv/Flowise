import { INode, INodeData } from "flowise-components"
import { IManifest } from "../Interface"
import { Tool } from 'langchain/tools'

export const buildTool = (manifest: IManifest) => {
    // @ts-ignore
    const properties = manifest?.api_for_model?.input_param?.properties
    const name = manifest?.name_for_human || ''
    const type = manifest?.name_for_model || ''
    const description = manifest?.description_for_human || ''
    // @ts-ignore
    const script_url = manifest?.api_for_framework?.script_url || ''
    let inputs: any[] = []

    console.log(properties, 'properties')
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
        init: async (nodeData: INodeData) => {
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
                    this.description =  manifest.description_for_model
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
                }

                _getCardJson(fields: any,manifest: any) {
                    if (manifest?.api_for_framework?.card_json) {
                        return { ...manifest?.api_for_framework?.card_json?.jsons?.[0] || '{}' }
                    }
                }
            
                /** @ignore */
                async _call(input: string) {
                    console.log('input--------------111111', input, typeof this.cardJson)
                    if (script_url && this.cardJson) {
                        // 把 input 拼接到 cardJson 中的 link 字段中
                        const cardJson = JSON.parse(this.cardJson)
                        cardJson.contents[cardJson.contents.length - 1].actions[0].url.all = `https://applink.dingtalk.com/copilot/openLink?url=${encodeURIComponent(script_url)}&params=${encodeURIComponent(input)}`
                        console.log('input--------------222222', cardJson.length)
                        return JSON.stringify(
                            {
                                type: 'card',
                                cardId: 'StandardCard',
                                cardData: {
                                    cardJson
                                }
                            }
                        )
                    }
                    if (script_url && this.cardId) {
                        // 场景1,cdn方式
                        const inputs = input.split('|')
                        return JSON.stringify(
                            {
                                type: 'card',
                                cardId: this.cardId,
                                cardData: {
                                    script_url: `${script_url}`,
                                    app_url: this.url,
                                    inputs: inputs
                                }
                            }
                        )
                    }
                    // 场景2,webhook方式
                    if (this.webhook) {
                        try {
                            const headers = { "Content-Type": "application/json" };
                            const body = JSON.stringify({ input: input });
                            // @ts-ignore
                            const response = await fetch(this.webhook, {
                                method: 'POST',
                                headers,
                                body,
                            }).then((res: any) => res.json());
                            if (response.result === true) {
                                return '正在执行中...'
                            }
                            return JSON.stringify(response);
                        } catch (error: any) {
                            console.log(error)
                            return error?.message || 'RPC脚本执行异常';
                        }
                    }
             
                }
            }
            const tool = new RPATool({
                cardId: nodeData.inputs?.cardId
            })
    
            return tool

        }
    }
}
