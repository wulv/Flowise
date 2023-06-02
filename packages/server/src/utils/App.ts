import { INode, INodeData } from 'flowise-components'
import { IManifest } from '../Interface'
import { Tool } from 'langchain/tools'

export const buildTool = (manifest: IManifest) => {
    // @ts-ignore
    const properties = manifest?.api_for_model?.input_param?.properties
    const name = manifest?.name_for_human || ''
    const type = manifest?.name_for_model || ''
    const description = manifest?.description_for_human || ''

    let inputs: any[] = []

    console.log(properties, 'properties')
    if (properties) {
        inputs = Object.keys(properties).map((key) => {
            return {
                label: properties[key].description || '',
                name: key,
                type: properties[key].type || '',
                sample: properties[key].sample || ''
            }
        })
    }
    return {
        label: name,
        name: name,
        type: type,
        icon: 'https://bp0r55-node-js.oss.laf.dev/chaintool.svg',
        category: 'Tools',
        description: description,
        baseClasses: [type],
        inputs: inputs,
        init: async (nodeData: INodeData) => {
            class RPATool extends Tool {
                name: string

                description: string

                webhook: string

                input: string

                constructor(fields: any) {
                    super()
                    this.description = manifest.description_for_model
                    this.name = name
                    this.webhook = manifest.api_for_framework?.url
                }

                /** @ignore */
                async _call(input: string) {
                    try {
                        return JSON.stringify({
                            type: 'card',
                            cardId: '3299d47e-d140-4866-809c-c03806edd741.schema',
                            cardData: { url: manifest.api_for_framework?.url}
                        })
                    } catch (error) {
                        console.log(error)
                        return '111'
                    }
                }
            }
            const tool = new RPATool({})

            return tool
        }
    }
}
