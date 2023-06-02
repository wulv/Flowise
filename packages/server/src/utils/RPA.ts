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
            
                constructor(fields: any) {
                    super()
                    this.description =  manifest.description_for_model
                    this.name = name
                    if (fields?.cardId) {
                        this.cardId = fields.cardId
                    }
                    // @ts-ignore
                    this.webhook = manifest.api_for_framework?.webhook_url as string
                    this.returnDirect = true
            
                }
            
                /** @ignore */
                async _call(input: string) {
                    if (script_url && this.cardId) {
                        return JSON.stringify(
                            {
                                type: 'card',
                                cardId: this.cardId,
                                cardData: {
                                    script_url: `${script_url}`,
                                    input: `${input}`
                                }
                            }
                        )
                    }
                    try {
                        const headers = { "Content-Type": "application/json" };
                        const body = JSON.stringify({ input: input });
                        // @ts-ignore
                        const response = await fetch(this.webhook, {
                            method: 'POST',
                            headers,
                            body,
                        }).then((res: any) => res.json());
                        return JSON.stringify(response);
                    } catch (error) {
                        console.log(error)
                        return '111'
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
