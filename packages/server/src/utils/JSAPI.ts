import { INode, INodeData } from "flowise-components"
import { IManifest } from "../Interface"
import { Tool } from 'langchain/tools'

// 拼接参数到描述
const buildDescriptionFromInputParam = (description: string, properties: any[]) => {
  if (!properties) {
    return ''
  }
    Object.keys(properties).forEach((key) => {
        // @ts-ignore
        const property = properties[key]
        if (property.type === 'object') {
          description += buildDescriptionFromInputParam(description, property.properties)
        } else {
          description += `\n属性${[key]}：类型为(${property.type})，${property.description}。`
        }
    })
    return description
}

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
            class JSAPITool extends Tool {
                name: string
            
                description: string
            
                input: string
                cardId?: string
            
                constructor(fields: any) {
                    super()
                    const demo = `API 调用示例代码为：` + manifest.api_for_model.demo_for_AIs
                    const param = `API 调用参数信息为：` + buildDescriptionFromInputParam('', manifest.api_for_model?.input_param?.properties)

                    console.log('==========', demo)
                    console.log('==========', param)
                    this.description =  manifest.description_for_model + '\n ' + demo + '\n ' + param
                    this.name = name
                    if (fields?.cardId) {
                        this.cardId = fields.cardId
                    }
                    this.returnDirect = true
            
                }
            
                /** @ignore */
                async _call(input: any) {
                  console.log(input, this.description, 'JSAPI======input======')
                  return JSON.stringify({
                      type: 'card',
                      cardId: '846e8cd9-6aa9-4bf3-a139-e5b5625ca841.schema',
                      cardData: {
                        pluginName: '测试',
                        params: '{"a":123}'
                      }
                  })
                  return JSON.stringify(input)
                    // if (script_url && this.cardId) {
                    //     const inputs = input.split('|')
                    //     return JSON.stringify(
                    //         {
                    //             type: 'card',
                    //             cardId: this.cardId,
                    //             cardData: {
                    //                 script_url: `${script_url}`,
                    //                 inputs: inputs
                    //             }
                    //         }
                    //     )
                    // }
                    // try {
                    //     const headers = { "Content-Type": "application/json" };
                    //     const body = JSON.stringify({ input: input });
                    //     // @ts-ignore
                    //     const response = await fetch(this.webhook, {
                    //         method: 'POST',
                    //         headers,
                    //         body,
                    //     }).then((res: any) => res.json());
                    //     if (response.result === true) {
                    //         return '正在执行中...'
                    //     }
                    //     return JSON.stringify(response);
                    // } catch (error) {
                    //     console.log(error)
                    //     return '111'
                    // }
                }
            }
            const tool = new JSAPITool({
                cardId: nodeData.inputs?.cardId
            })
    
            return tool

        }
    }
}
