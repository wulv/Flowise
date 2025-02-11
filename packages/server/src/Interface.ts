import { ICommonObject, INode, INodeData as INodeDataFromComponent, INodeParams } from 'flowise-components'

export type MessageType = 'apiMessage' | 'userMessage'

/**
 * Databases
 */
export interface IChatFlow {
    id: string
    name: string
    flowData: string
    apikeyid: string
    deployed: boolean
    updatedDate: Date
    createdDate: Date
    robot?: string
}


export interface INodeColumn {
    id: string
    baseClasses: string;
    inputs: string;
    outputs: string;
    label: string;
    name: string;
    type: string;
    icon: string;
    category: string;
    description?: string;
    filePath?: string;
}
export interface IRobot {
    id: string
    chatflowid: string
    webhook?: string
    token?: string
}

export interface IChatMessage {
    id: string
    role: MessageType
    content: string
    chatflowid: string
    createdDate: Date
    sourceDocuments: string
}

export interface IComponentNodes {
    [key: string]: INode
}

export interface IVariableDict {
    [key: string]: string
}

export interface INodeDependencies {
    [key: string]: number
}

export interface INodeDirectedGraph {
    [key: string]: string[]
}

export interface INodeData extends INodeDataFromComponent {
    inputAnchors: INodeParams[]
    inputParams: INodeParams[]
    outputAnchors: INodeParams[]
    manifest?: IManifest
}
export interface IManifest {
  schema_version: string;
  name_for_human: string;
  name_for_model: string;
  description_for_model: string;
  description_for_human: string;
  type: number;
  api_for_model: Apiformodel;
  api_for_framework: Apiforframework;
  abilities: any;
}

interface Apiforframework {
  type: string;
  url: string;
  is_user_authenticated: boolean;
  method: string;
  params: Inputparam;
}

interface Apiformodel {
  input_param: Inputparam;
  demo_for_AIs: string;
}

interface Inputparam {
}
export interface IReactFlowNode {
    id: string
    position: {
        x: number
        y: number
    }
    type: string
    data: INodeData
    positionAbsolute: {
        x: number
        y: number
    }
    z: number
    handleBounds: {
        source: any
        target: any
    }
    width: number
    height: number
    selected: boolean
    dragging: boolean
}

export interface IReactFlowEdge {
    source: string
    sourceHandle: string
    target: string
    targetHandle: string
    type: string
    id: string
    data: {
        label: string
    }
}

export interface IReactFlowObject {
    nodes: IReactFlowNode[]
    edges: IReactFlowEdge[]
    viewport: {
        x: number
        y: number
        zoom: number
    }
}

export interface IExploredNode {
    [key: string]: {
        remainingLoop: number
        lastSeenDepth: number
    }
}

export interface INodeQueue {
    nodeId: string
    depth: number
}

export interface IDepthQueue {
    [key: string]: number
}

export interface IMessage {
    message: string
    type: MessageType
}

export interface IncomingInput {
    question: string
    history: IMessage[]
    overrideConfig?: ICommonObject
    socketIOClientId?: string
}

export interface IActiveChatflows {
    [key: string]: {
        startingNodes: IReactFlowNode[]
        endingNodeData: INodeData
        inSync: boolean
        overrideConfig?: ICommonObject
    }
}

export interface IOverrideConfig {
    node: string
    label: string
    name: string
    type: string
}

export interface IDatabaseExport {
    chatmessages: IChatMessage[]
    chatflows: IChatFlow[]
    apikeys: ICommonObject[]
}

export interface IRunChatflowMessageValue {
    chatflow: IChatFlow
    chatId: string
    incomingInput: IncomingInput
    componentNodes: IComponentNodes
    endingNodeData?: INodeData
}

export interface IChildProcessMessage {
    key: string
    value?: any
}
