import express, { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import cors from 'cors'
import http from 'http'
import * as fs from 'fs'
import basicAuth from 'express-basic-auth'
import { Server } from 'socket.io'

import {
    IChatFlow,
    IncomingInput,
    IReactFlowNode,
    IReactFlowObject,
    INodeData,
    IDatabaseExport,
    IRunChatflowMessageValue,
    IChildProcessMessage
} from './Interface'
import {
    getNodeModulesPackagePath,
    getStartingNodes,
    buildLangchain,
    getEndingNode,
    constructGraphs,
    resolveVariables,
    isStartNodeDependOnInput,
    getAPIKeys,
    addAPIKey,
    updateAPIKey,
    deleteAPIKey,
    compareKeys,
    mapMimeTypeToInputField,
    findAvailableConfigs,
    isSameOverrideConfig,
    replaceAllAPIKeys,
    isFlowValidForStream
} from './utils'
import { cloneDeep } from 'lodash'
import { getDataSource } from './DataSource'
import { NodesPool } from './NodesPool'
import { ChatFlow } from './entity/ChatFlow'
import { OutgoingRobot } from './entity/OutgoingRobot'
import { ChatMessage } from './entity/ChatMessage'
import { ChatflowPool } from './ChatflowPool'
import { ICommonObject } from 'flowise-components'
import { IMessage, chatQuery, downloadPdf, getDownloadFileUrl, sendCard, sendMsg, sendOutgoingMsg } from './DingEvent'
import { fork } from 'child_process'
import { Node } from './entity/Node'
import { buildPreviewFlowData } from './utils/Preview'

export class App {
    cacheMap: Map<string, any> = new Map()
    app: express.Application
    nodesPool: NodesPool
    chatflowPool: ChatflowPool
    AppDataSource = getDataSource()

    constructor() {
        this.app = express()
    }

    async initDatabase() {
        // Initialize database
        this.AppDataSource.initialize()
            .then(async () => {
                console.info('📦[server]: Data Source start initialize!')

                // Initialize pools
                this.nodesPool = new NodesPool()
                // @ts-ignore
                await this.nodesPool.initialize(this.AppDataSource)
                this.chatflowPool = new ChatflowPool()

                // Initialize API keys
                await getAPIKeys()
                console.info('📦[server]: Data Source has been initialized!')
            })
            .catch((err) => {
                console.error('❌[server]: Error during Data Source initialization:', err)
            })
    }

    async config(socketIO?: Server) {
        // Limit is needed to allow sending/receiving base64 encoded string
        this.app.use(express.json({ limit: '50mb' }))
        this.app.use(express.urlencoded({ limit: '50mb', extended: true }))

        // Allow access from *
        this.app.use(cors())

        if (process.env.FLOWISE_USERNAME && process.env.FLOWISE_PASSWORD) {
            const username = process.env.FLOWISE_USERNAME
            const password = process.env.FLOWISE_PASSWORD
            const basicAuthMiddleware = basicAuth({
                users: { [username]: password }
            })
            const whitelistURLs = ['/api/v1/prediction/', '/api/v1/node-icon/']
            this.app.use((req, res, next) => {
                if (req.url.includes('/api/v1/')) {
                    whitelistURLs.some((url) => req.url.includes(url)) ? next() : basicAuthMiddleware(req, res, next)
                } else next()
            })
        }

        const upload = multer({ dest: `${path.join(__dirname, '..', 'uploads')}/` })

        // ----------------------------------------
        // Nodes
        // ----------------------------------------

        // Get all component nodes
        this.app.get('/api/v1/nodes', async (req: Request, res: Response) => {
            // const returnData = []
            // for (const nodeName in this.nodesPool.componentNodes) {
            //     const clonedNode = cloneDeep(this.nodesPool.componentNodes[nodeName])
            //     returnData.push(clonedNode)
            // }
            const nodes = await this.AppDataSource.getRepository(Node).find()
            const returnData = nodes.map((item) => ({
                ...item,
                inputs: JSON.parse(item.inputs),
                outputs: item.outputs ? JSON.parse(item.outputs) : undefined,
                baseClasses: JSON.parse(item.baseClasses)
            }))
            return res.json(returnData)
        })

        this.app.delete('/api/v1/nodes/all', async (req: Request, res: Response) => {
            await this.AppDataSource.getRepository(Node).clear()
            return res.json({ message: 'success' })
        })

        // 写入node数据库
        this.app.post('/api/v1/node', async (req: Request, res: Response) => {
            const body = req.body
            const node = new Node()
            Object.assign(node, body)

            const chatflow = this.AppDataSource.getRepository(Node).create(node)
            const results = await this.AppDataSource.getRepository(Node).save(chatflow)
            // 动态增加node，需要重新构造nodepool
            // @ts-ignore
            await this.nodesPool.initialize(this.AppDataSource)

            return res.json(results)
        })
        // 更新node数据库
        this.app.put('/api/v1/node/:name', async (req: Request, res: Response) => {
            const body = req.body
            const id = req.params.name
        })

        // Get specific component node via name
        this.app.get('/api/v1/nodes/:name', (req: Request, res: Response) => {
            if (Object.prototype.hasOwnProperty.call(this.nodesPool.componentNodes, req.params.name)) {
                return res.json(this.nodesPool.componentNodes[req.params.name])
            } else {
                throw new Error(`Node ${req.params.name} not found`)
            }
        })

        // Returns specific component node icon via name
        this.app.get('/api/v1/node-icon/:name', (req: Request, res: Response) => {
            if (Object.prototype.hasOwnProperty.call(this.nodesPool.componentNodes, req.params.name)) {
                const nodeInstance = this.nodesPool.componentNodes[req.params.name]
                if (nodeInstance.icon === undefined) {
                    throw new Error(`Node ${req.params.name} icon not found`)
                }

                if (nodeInstance.icon.endsWith('.svg') || nodeInstance.icon.endsWith('.png') || nodeInstance.icon.endsWith('.jpg')) {
                    const filepath = nodeInstance.icon
                    res.sendFile(filepath)
                } else {
                    throw new Error(`Node ${req.params.name} icon is missing icon`)
                }
            } else {
                throw new Error(`Node ${req.params.name} not found`)
            }
        })

        // ----------------------------------------
        // Chatflows
        // ----------------------------------------

        // Get all chatflows
        this.app.get('/api/v1/chatflows', async (req: Request, res: Response) => {
            const chatflows: IChatFlow[] = await this.AppDataSource.getRepository(ChatFlow).find()
            return res.json(chatflows.map((i) => ({ ...i, flowData: '[]' })))
        })

        // Get specific chatflow via id
        this.app.get('/api/v1/chatflows/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })

            const outgoingRobot = await this.AppDataSource.getRepository(OutgoingRobot).findBy({
                chatflowid: req.params.id
            })

            const result = { ...chatflow }
            Object.assign(result, {
                outgoingRobot
            })

            if (chatflow) return res.json(result)
            return res.status(404).send(`Chatflow ${req.params.id} not found`)
        })

        // Save chatflow
        this.app.post('/api/v1/chatflows', async (req: Request, res: Response) => {
            const body = req.body
            const newChatFlow = new ChatFlow()
            Object.assign(newChatFlow, body)

            const chatflow = this.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
            const results = await this.AppDataSource.getRepository(ChatFlow).save(chatflow)

            return res.json(results)
        })

        // Update chatflow
        this.app.put('/api/v1/chatflows/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })

            if (!chatflow) {
                res.status(404).send(`Chatflow ${req.params.id} not found`)
                return
            }

            const body = req.body
            const updateChatFlow = new ChatFlow()
            Object.assign(updateChatFlow, body)

            this.AppDataSource.getRepository(ChatFlow).merge(chatflow, updateChatFlow)
            const result = await this.AppDataSource.getRepository(ChatFlow).save(chatflow)

            // Update chatflowpool inSync to false, to build Langchain again because data has been changed
            this.chatflowPool.updateInSync(chatflow.id, false)

            return res.json(result)
        })

        // Delete chatflow via id
        this.app.delete('/api/v1/chatflows/:id', async (req: Request, res: Response) => {
            const results = await this.AppDataSource.getRepository(ChatFlow).delete({ id: req.params.id })
            return res.json(results)
        })

        // 创建预览数据 chatflow
        this.app.post('/api/v1/chatflows/preview', async (req: Request, res: Response) => {
            try {
                const ts = Date.now()
                console.log('preview chatflow')
                const apiKeys = await getAPIKeys()
                console.log('apiKeys cost', Date.now() - ts)
                const k = apiKeys.find((x) => x.keyName.startsWith('pq_'))
                const apiKey = `sk-${k?.keyName.split('_')[1]}`
                console.log('apiKey', apiKey)
                const toolMeta = req.body as {
                    baseClasses: string[]
                    category: string
                    description: string
                    inputs: string[]
                    label: string
                    name: string
                    type: string
                    icon: string
                    manifest: any
                }

                console.log(toolMeta)

                // TODO，接收一个插件，构建一个chatflow，存储起来，返回预期预览的连接。
                const body = {
                    name: `预览：${toolMeta.name}`,
                    flowData: JSON.stringify(buildPreviewFlowData(toolMeta, apiKey)),
                    apikeyid: null,
                    deployed: false,
                    robot: null,
                    outgoingRobot: []
                }
                console.log('body builded', Date.now() - ts, body)

                const newChatFlow = new ChatFlow()
                Object.assign(newChatFlow, body)

                const chatflow = this.AppDataSource.getRepository(ChatFlow).create(newChatFlow)
                const results = await this.AppDataSource.getRepository(ChatFlow).save(chatflow)

                console.log('results.id', Date.now() - ts, results.id)

                return res.json({
                    url: `https://pre-devtool-admin.dingtalk.com/p/${results.id}`
                })
            } catch (error: any) {
                console.log(error?.message)
                console.log(error)
                return res.json({
                    url: ''
                })
            }
        })

        // Save outgoingrobot info
        this.app.post('/api/v1/chatflows/outgoingrobot/:id', async (req: Request, res: Response) => {
            const body = req.body
            if (body.id) {
                const robotInfo = await this.AppDataSource.getRepository(OutgoingRobot).findOneBy({ id: body.id })
                if (robotInfo) {
                    Object.assign(robotInfo, body)
                    const result = await this.AppDataSource.getRepository(OutgoingRobot).save(robotInfo)
                    return res.json(result)
                }
            } else {
                delete body.id
                const newRobot = new OutgoingRobot()
                Object.assign(newRobot, body, { chatflowid: req.params.id })
                const result = await this.AppDataSource.getRepository(OutgoingRobot).create(newRobot)
                const results = await this.AppDataSource.getRepository(OutgoingRobot).save(result)

                return res.json(results)
            }
            return res.json({ code: 0 })
        })

        // Check if chatflow valid for streaming
        this.app.get('/api/v1/chatflows-streaming/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })
            if (!chatflow) return res.status(404).send(`Chatflow ${req.params.id} not found`)

            /*** Get Ending Node with Directed Graph  ***/
            const flowData = chatflow.flowData
            const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
            const nodes = parsedFlowData.nodes
            const edges = parsedFlowData.edges
            const { graph, nodeDependencies } = constructGraphs(nodes, edges)
            const endingNodeId = getEndingNode(nodeDependencies, graph)
            if (!endingNodeId) return res.status(500).send(`Ending node must be either a Chain or Agent`)
            const endingNodeData = nodes.find((nd) => nd.id === endingNodeId)?.data
            if (!endingNodeData) return res.status(500).send(`Ending node must be either a Chain or Agent`)

            const obj = {
                isStreaming: isFlowValidForStream(nodes, endingNodeData)
            }
            return res.json(obj)
        })

        // 跨域请求
        this.app.get('/api/v1/jsonp/sendCard.js', (req, res) => {
            const robotData = decodeURIComponent(req.query.robotData as string)
            const result = JSON.parse(robotData)
            console.log('res', result);
            
            const { cardId, cardData, chatFlowId, robotCode, conversationId } = result;
            sendCard(
                {
                    cardId,
                    cardData
                },
                { conversationType: '2', conversationId, robotCode },
                chatFlowId,
                robotCode
            )

            const data = {
              data: 'ok',
            };
            const jsonpData = `${req.query.callback}(${JSON.stringify(data)})`;
            res.setHeader('Content-Type', 'application/javascript');
            res.send(jsonpData);
        })

        // ----------------------------------------
        // ChatMessage
        // ----------------------------------------

        // Get all chatmessages from chatflowid
        this.app.get('/api/v1/chatmessage/:id', async (req: Request, res: Response) => {
            const chatmessages = await this.AppDataSource.getRepository(ChatMessage).findBy({
                chatflowid: req.params.id
            })
            return res.json(chatmessages)
        })

        // Add chatmessages for chatflowid
        this.app.post('/api/v1/chatmessage/:id', async (req: Request, res: Response) => {
            const body = req.body
            const newChatMessage = new ChatMessage()
            Object.assign(newChatMessage, body)

            const chatmessage = this.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
            const results = await this.AppDataSource.getRepository(ChatMessage).save(chatmessage)

            return res.json(results)
        })

        // Delete all chatmessages from chatflowid
        this.app.delete('/api/v1/chatmessage/:id', async (req: Request, res: Response) => {
            const results = await this.AppDataSource.getRepository(ChatMessage).delete({ chatflowid: req.params.id })
            return res.json(results)
        })

        // ----------------------------------------
        // Configuration
        // ----------------------------------------

        this.app.get('/api/v1/flow-config/:id', async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })
            if (!chatflow) return res.status(404).send(`Chatflow ${req.params.id} not found`)
            const flowData = chatflow.flowData
            const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
            const nodes = parsedFlowData.nodes
            const availableConfigs = findAvailableConfigs(nodes)
            return res.json(availableConfigs)
        })

        // 上传文件到服务器，返回地址
        this.app.post('/api/v1/upload', upload.single('file'), async (req: Request, res: Response) => {
            const file = req.file
            if (!file) return
            return res.json({
                mime: file.mimetype,
                path: file.path,
                filename: file.originalname
            })
        })

        this.app.post('/api/v1/flow-config/:id', upload.array('files'), async (req: Request, res: Response) => {
            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: req.params.id
            })
            if (!chatflow) return res.status(404).send(`Chatflow ${req.params.id} not found`)
            await this.validateKey(req, res, chatflow)

            const overrideConfig: ICommonObject = { ...req.body }
            const files = req.files as any[]
            if (!files || !files.length) return

            for (const file of files) {
                const fileData = fs.readFileSync(file.path, { encoding: 'base64' })
                const dataBase64String = `data:${file.mimetype};base64,${fileData},filename:${file.filename}`

                const fileInputField = mapMimeTypeToInputField(file.mimetype)
                if (overrideConfig[fileInputField]) {
                    overrideConfig[fileInputField] = JSON.stringify([...JSON.parse(overrideConfig[fileInputField]), dataBase64String])
                } else {
                    overrideConfig[fileInputField] = JSON.stringify([dataBase64String])
                }
            }
            return res.json(overrideConfig)
        })
        // ----------------------------------------
        // Export Load Chatflow & ChatMessage & Apikeys
        // ----------------------------------------

        this.app.get('/api/v1/database/export', async (req: Request, res: Response) => {
            const chatmessages = await this.AppDataSource.getRepository(ChatMessage).find()
            const chatflows = await this.AppDataSource.getRepository(ChatFlow).find()
            const apikeys = await getAPIKeys()
            const result: IDatabaseExport = {
                chatmessages,
                chatflows,
                apikeys
            }
            return res.json(result)
        })

        this.app.post('/api/v1/database/load', async (req: Request, res: Response) => {
            const databaseItems: IDatabaseExport = req.body

            await this.AppDataSource.getRepository(ChatFlow).delete({})
            await this.AppDataSource.getRepository(ChatMessage).delete({})

            let error = ''

            // Get a new query runner instance
            const queryRunner = this.AppDataSource.createQueryRunner()

            // Start a new transaction
            await queryRunner.startTransaction()

            try {
                const chatflows: IChatFlow[] = databaseItems.chatflows
                const chatmessages: ChatMessage[] = databaseItems.chatmessages

                await queryRunner.manager.insert(ChatFlow, chatflows)
                await queryRunner.manager.insert(ChatMessage, chatmessages)

                await queryRunner.commitTransaction()
            } catch (err: any) {
                error = err?.message ?? 'Error loading database'
                await queryRunner.rollbackTransaction()
            } finally {
                await queryRunner.release()
            }

            await replaceAllAPIKeys(databaseItems.apikeys)

            if (error) return res.status(500).send(error)
            return res.status(201).send('OK')
        })

        // ----------------------------------------
        // Prediction
        // ----------------------------------------

        // Send input message and get prediction result (External)
        this.app.post('/api/v1/prediction/:id', upload.array('files'), async (req: Request, res: Response) => {
            await this.processPrediction(req, res, socketIO)
        })

        // Send input message and get prediction result (Internal)
        this.app.post('/api/v1/internal-prediction/:id', async (req: Request, res: Response) => {
            await this.processPrediction(req, res, socketIO, true)
        })

        this.app.post('/api/v1/delete/message', async (req: Request, res: Response) => {
            // 删除所有消息
            const results = await this.AppDataSource.getRepository(ChatMessage).delete({})
            return res.json(results)
        })

        this.app.post('/api/v1/robot/dingtalk/:id', async (req: Request, res: Response) => {
            const data = req.body
            if (data?.text?.content === '清除历史消息') {
                await this.AppDataSource.getRepository(ChatMessage).delete({ chatflowid: data.conversationId })
                await sendMsg('历史消息已清除', data, req.params.id, data.robotCode)
                return res.json({ code: 0 })
            }
            if (this.cacheMap.get(data.conversationId)) {
                await sendMsg('别催我，正在处理上一条消息呢！', data, req.params.id, data.robotCode)
                return res.json({ code: 0 })
            }
            this.cacheMap.set(data.conversationId, true)

            const id = req.params.id
            console.log('data', data)
            // await sendMsg('res?.text || res', 'msg.senderStaffId', id)
            // const chatmessages = await this.AppDataSource.getRepository(ChatMessage).findBy({
            //     chatflowid: data.conversationId
            // })
            // const history = (chatmessages || []).map((item) => ({
            //     type: item.role,
            //     message: item.content
            // }))
            // // 取前20条历史记录
            // history.splice(0, history.length - 20)
            const msg: IMessage = data
            try {
                let content = ''
                let apiContent = ''
                if (msg.msgtype === 'text') {
                    const userMsg = msg.text.content
                    content = userMsg
                    // 先储存一下
                    const newChatMessage = [
                        Object.assign(new ChatMessage(), {
                            role: 'userMessage',
                            content: userMsg,
                            chatflowid: data.conversationId
                        })
                    ]
                    const chatmessage = this.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
                    await this.AppDataSource.getRepository(ChatMessage).save(chatmessage)
                    const res = await chatQuery({ question: userMsg, history: [], userId: msg.senderStaffId }, id)
                    apiContent = res
                    try {
                        const result = JSON.parse(apiContent)
                        if (result?.type === 'card') {
                            await sendCard(result, msg, id, msg.robotCode)
                        } else {
                            await sendMsg(apiContent, msg, id, msg.robotCode)
                        }
                    } catch (error) {
                        await sendMsg(apiContent, msg, id, msg.robotCode)
                        console.log(error)
                    }
                } else if (msg.msgtype === 'file') {
                    await sendMsg('文件已收到，正在处理', msg, id, msg.robotCode)
                    const { downloadCode } = msg.content
                    const pdfUrl = await getDownloadFileUrl(downloadCode, id, msg.robotCode)
                    const fileName = msg.content.fileId
                    const filePath = await downloadPdf(pdfUrl, fileName)
                    content = `请记住：用户上传了一个文件，文件路径是: '${filePath}'`
                    // 先储存一下
                    const newChatMessage = [
                        Object.assign(new ChatMessage(), {
                            role: 'userMessage',
                            content: content,
                            chatflowid: data.conversationId
                        })
                    ]
                    const chatmessage = this.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
                    await this.AppDataSource.getRepository(ChatMessage).save(chatmessage)
                    // 再处理
                    const res = await chatQuery(
                        {
                            question: content,
                            userId: msg.senderStaffId,
                            history: []
                        },
                        id
                    )
                    apiContent = res?.text || res
                    await sendMsg(res?.text || res, msg, id, msg.robotCode)
                }
                // 保存历史记录
                const newChatMessage = [
                    Object.assign(new ChatMessage(), {
                        role: 'apiMessage',
                        content: apiContent,
                        chatflowid: data.conversationId
                    })
                ]

                const chatmessage = this.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
                await this.AppDataSource.getRepository(ChatMessage).save(chatmessage)
            } catch (error) {
                console.log(error)
            }
            this.cacheMap.set(data.conversationId, false)
            return res.json({ code: 0 })
        })

        this.app.post('/api/v1/robot/dingtalk/outgoing/:id', async (req: Request, res: Response) => {
            const data = req.body
            const id = req.params.id
            if (data.text?.content === '清除历史消息') {
                await this.AppDataSource.getRepository(ChatMessage).delete({ chatflowid: data.conversationId })
                await sendMsg('历史消息已清除', data, id, data.robotCode)
                return res.json({ code: 0 })
            }
            const token = req.headers.token as string
            console.log('token', token)
            const robotData = await this.AppDataSource.getRepository(OutgoingRobot).findOneBy({
                token: token
            })
            const webhook = robotData?.webhook
            console.log('webhook', webhook)

            if (!token || !webhook) {
                return res.json({ code: 0 })
            }
            console.log('content', data.text.content)

            // const chatmessages = await this.AppDataSource.getRepository(ChatMessage).findBy({
            //     chatflowid: data.conversationId
            // })
            // const history = (chatmessages || []).map((item) => ({
            //     type: item.role,
            //     message: item.content
            // }))
            // // 取前10条历史记录
            // history.splice(0, history.length - 20)
            try {
                const msg: IMessage = data
                if (msg.msgtype === 'text') {
                    const userMsg = msg.text.content
                    // 向flow提问
                    const res = await chatQuery({ question: userMsg, history: [], userId: msg.senderId }, id)
                    // 向钉钉发送消息
                    await sendOutgoingMsg(res, webhook)
                    // 保存历史记录
                    const newChatMessage = [
                        Object.assign(new ChatMessage(), {
                            role: 'userMessage',
                            content: userMsg,
                            chatflowid: data.conversationId
                        }),
                        Object.assign(new ChatMessage(), {
                            role: 'apiMessage',
                            content: res?.text || res,
                            chatflowid: data.conversationId
                        })
                    ]

                    const chatmessage = this.AppDataSource.getRepository(ChatMessage).create(newChatMessage)
                    await this.AppDataSource.getRepository(ChatMessage).save(chatmessage)
                }
            } catch (error) {
                console.log(error)
            }
            return res.json({ code: 0 })
        })

        // ----------------------------------------
        // Marketplaces
        // ----------------------------------------

        // Get all chatflows for marketplaces
        this.app.get('/api/v1/marketplaces', async (req: Request, res: Response) => {
            const marketplaceDir = path.join(__dirname, '..', 'marketplaces')
            const jsonsInDir = fs.readdirSync(marketplaceDir).filter((file) => path.extname(file) === '.json')
            const templates: any[] = []
            jsonsInDir.forEach((file, index) => {
                const filePath = path.join(__dirname, '..', 'marketplaces', file)
                const fileData = fs.readFileSync(filePath)
                const fileDataObj = JSON.parse(fileData.toString())
                const template = {
                    id: index,
                    name: file.split('.json')[0],
                    flowData: fileData.toString(),
                    description: fileDataObj?.description || ''
                }
                templates.push(template)
            })
            return res.json(templates)
        })

        // ----------------------------------------
        // API Keys
        // ----------------------------------------

        // Get api keys
        this.app.get('/api/v1/apikey', async (req: Request, res: Response) => {
            const keys = await getAPIKeys()
            return res.json(keys)
        })

        // Add new api key
        this.app.post('/api/v1/apikey', async (req: Request, res: Response) => {
            const keys = await addAPIKey(req.body.keyName)
            return res.json(keys)
        })

        // Update api key
        this.app.put('/api/v1/apikey/:id', async (req: Request, res: Response) => {
            const keys = await updateAPIKey(req.params.id, req.body.keyName)
            return res.json(keys)
        })

        // Delete new api key
        this.app.delete('/api/v1/apikey/:id', async (req: Request, res: Response) => {
            const keys = await deleteAPIKey(req.params.id)
            return res.json(keys)
        })

        // ----------------------------------------
        // Serve UI static
        // ----------------------------------------

        const packagePath = getNodeModulesPackagePath('flowise-ui')
        const uiBuildPath = path.join(packagePath, 'build')
        const uiHtmlPath = path.join(packagePath, 'build', 'index.html')

        this.app.use('/', express.static(uiBuildPath))

        // All other requests not handled will return React app
        this.app.use((req, res) => {
            res.sendFile(uiHtmlPath)
        })
    }

    /**
     * Validate API Key
     * @param {Request} req
     * @param {Response} res
     * @param {ChatFlow} chatflow
     */
    async validateKey(req: Request, res: Response, chatflow: ChatFlow) {
        const chatFlowApiKeyId = chatflow.apikeyid
        const authorizationHeader = (req.headers['Authorization'] as string) ?? (req.headers['authorization'] as string) ?? ''

        if (chatFlowApiKeyId && !authorizationHeader) return res.status(401).send(`Unauthorized`)

        const suppliedKey = authorizationHeader.split(`Bearer `).pop()
        if (chatFlowApiKeyId && suppliedKey) {
            const keys = await getAPIKeys()
            const apiSecret = keys.find((key) => key.id === chatFlowApiKeyId)?.apiSecret
            if (!compareKeys(apiSecret, suppliedKey)) return res.status(401).send(`Unauthorized`)
        }
    }

    /**
     * Start child process
     * @param {ChatFlow} chatflow
     * @param {IncomingInput} incomingInput
     * @param {INodeData} endingNodeData
     */
    async startChildProcess(chatflow: ChatFlow, incomingInput: IncomingInput, endingNodeData?: INodeData) {
        try {
            const controller = new AbortController()
            const { signal } = controller

            let childpath = path.join(__dirname, '..', 'dist', 'ChildProcess.js')
            if (!fs.existsSync(childpath)) childpath = 'ChildProcess.ts'

            const childProcess = fork(childpath, [], { signal })

            const value = {
                chatflow,
                incomingInput,
                componentNodes: cloneDeep(this.nodesPool.componentNodes),
                endingNodeData
            } as IRunChatflowMessageValue
            childProcess.send({ key: 'start', value } as IChildProcessMessage)

            let childProcessTimeout: NodeJS.Timeout

            return new Promise((resolve, reject) => {
                childProcess.on('message', async (message: IChildProcessMessage) => {
                    if (message.key === 'finish') {
                        const { result, addToChatFlowPool } = message.value as ICommonObject
                        if (childProcessTimeout) {
                            clearTimeout(childProcessTimeout)
                        }
                        if (Object.keys(addToChatFlowPool).length) {
                            const { chatflowid, nodeToExecuteData, startingNodes, overrideConfig } = addToChatFlowPool
                            this.chatflowPool.add(chatflowid, nodeToExecuteData, startingNodes, overrideConfig)
                        }
                        resolve(result)
                    }
                    if (message.key === 'start') {
                        if (process.env.EXECUTION_TIMEOUT) {
                            childProcessTimeout = setTimeout(async () => {
                                childProcess.kill()
                                resolve(undefined)
                            }, parseInt(process.env.EXECUTION_TIMEOUT, 10))
                        }
                    }
                    if (message.key === 'error') {
                        let errMessage = message.value as string
                        if (childProcessTimeout) {
                            clearTimeout(childProcessTimeout)
                        }
                        reject(errMessage)
                    }
                })
            })
        } catch (err) {
            console.error(err)
        }
    }

    /**
     * Process Prediction
     * @param {Request} req
     * @param {Response} res
     * @param {Server} socketIO
     * @param {boolean} isInternal
     */
    async processPrediction(req: Request, res: Response, socketIO?: Server, isInternal = false) {
        try {
            // 每个人分配一个ID
            const chatflowid = req.params.id
            let incomingInput: IncomingInput = req.body

            let nodeToExecuteData: INodeData

            const chatflow = await this.AppDataSource.getRepository(ChatFlow).findOneBy({
                id: chatflowid
            })
            console.log('chatflow', req.body?.userId, chatflowid)
            if (!chatflow) return res.status(404).send(`Chatflow ${chatflowid} not found`)

            if (!isInternal) {
                await this.validateKey(req, res, chatflow)
            }

            let isStreamValid = false

            const files = (req.files as any[]) || []

            if (files.length) {
                const overrideConfig: ICommonObject = { ...req.body }
                for (const file of files) {
                    const fileData = fs.readFileSync(file.path, { encoding: 'base64' })
                    const dataBase64String = `data:${file.mimetype};base64,${fileData},filename:${file.filename}`

                    const fileInputField = mapMimeTypeToInputField(file.mimetype)
                    if (overrideConfig[fileInputField]) {
                        overrideConfig[fileInputField] = JSON.stringify([...JSON.parse(overrideConfig[fileInputField]), dataBase64String])
                    } else {
                        overrideConfig[fileInputField] = JSON.stringify([dataBase64String])
                    }
                }
                incomingInput = {
                    question: req.body.question ?? 'hello',
                    overrideConfig,
                    history: []
                }
            }

            /* Don't rebuild the flow (to avoid duplicated upsert, recomputation) when all these conditions met:
             * - Node Data already exists in pool
             * - Still in sync (i.e the flow has not been modified since)
             * - Existing overrideConfig and new overrideConfig are the same
             * - Flow doesn't start with nodes that depend on incomingInput.question
             ***/
            const isRebuildNeeded = () => {
                return (
                    Object.prototype.hasOwnProperty.call(this.chatflowPool.activeChatflows, chatflowid) &&
                    this.chatflowPool.activeChatflows[chatflowid].inSync &&
                    isSameOverrideConfig(
                        isInternal,
                        this.chatflowPool.activeChatflows[chatflowid].overrideConfig,
                        incomingInput.overrideConfig
                    ) &&
                    !isStartNodeDependOnInput(this.chatflowPool.activeChatflows[chatflowid].startingNodes)
                )
            }

            if (process.env.EXECUTION_MODE === 'child') {
                if (isRebuildNeeded()) {
                    nodeToExecuteData = this.chatflowPool.activeChatflows[chatflowid].endingNodeData
                    try {
                        const result = await this.startChildProcess(chatflow, incomingInput, nodeToExecuteData)

                        return res.json(result)
                    } catch (error) {
                        return res.status(500).send(error)
                    }
                } else {
                    try {
                        const result = await this.startChildProcess(chatflow, incomingInput)
                        return res.json(result)
                    } catch (error) {
                        return res.status(500).send(error)
                    }
                }
            } else {
                /*** Get chatflows and prepare data  ***/
                const flowData = chatflow.flowData
                const parsedFlowData: IReactFlowObject = JSON.parse(flowData)
                const nodes = parsedFlowData.nodes
                const edges = parsedFlowData.edges

                if (isRebuildNeeded()) {
                    nodeToExecuteData = this.chatflowPool.activeChatflows[chatflowid].endingNodeData
                    isStreamValid = isFlowValidForStream(nodes, nodeToExecuteData)
                } else {
                    /*** Get Ending Node with Directed Graph  ***/
                    const { graph, nodeDependencies } = constructGraphs(nodes, edges)
                    const directedGraph = graph
                    const endingNodeId = getEndingNode(nodeDependencies, directedGraph)
                    if (!endingNodeId) return res.status(500).send(`Ending node must be either a Chain or Agent`)

                    const endingNodeData = nodes.find((nd) => nd.id === endingNodeId)?.data
                    if (!endingNodeData) return res.status(500).send(`Ending node must be either a Chain or Agent`)

                    if (
                        endingNodeData.outputs &&
                        Object.keys(endingNodeData.outputs).length &&
                        !Object.values(endingNodeData.outputs).includes(endingNodeData.name)
                    ) {
                        return res
                            .status(500)
                            .send(
                                `Output of ${endingNodeData.label} (${endingNodeData.id}) must be ${endingNodeData.label}, can't be an Output Prediction`
                            )
                    }

                    isStreamValid = isFlowValidForStream(nodes, endingNodeData)

                    /*** Get Starting Nodes with Non-Directed Graph ***/
                    const constructedObj = constructGraphs(nodes, edges, true)
                    const nonDirectedGraph = constructedObj.graph
                    const { startingNodeIds, depthQueue } = getStartingNodes(nonDirectedGraph, endingNodeId)
                    console.log('start reactFlowNodes')
                    /*** BFS to traverse from Starting Nodes to Ending Node ***/
                    const reactFlowNodes = await buildLangchain(
                        startingNodeIds,
                        nodes,
                        graph,
                        depthQueue,
                        this.nodesPool.componentNodes,
                        incomingInput.question,
                        incomingInput?.overrideConfig
                    )

                    const nodeToExecute = reactFlowNodes.find((node: IReactFlowNode) => node.id === endingNodeId)
                    if (!nodeToExecute) return res.status(404).send(`Node ${endingNodeId} not found`)

                    const reactFlowNodeData: INodeData = resolveVariables(nodeToExecute.data, reactFlowNodes, incomingInput.question)
                    nodeToExecuteData = reactFlowNodeData

                    const startingNodes = nodes.filter((nd) => startingNodeIds.includes(nd.id))
                    this.chatflowPool.add(chatflowid, nodeToExecuteData, startingNodes, incomingInput?.overrideConfig)
                }

                let nodeInstanceFilePath
                if (this.nodesPool.componentNodes[nodeToExecuteData.name].filePath) {
                    nodeInstanceFilePath = this.nodesPool.componentNodes[nodeToExecuteData.name].filePath as string
                } else {
                    const dir = path.join(__dirname, '..', 'nodes')
                    nodeInstanceFilePath = path.join(dir, `${nodeToExecuteData.name}.js`)
                }
                // const nodeInstanceFilePath = this.nodesPool.componentNodes[nodeToExecuteData.name].filePath as string

                const nodeModule = await import(nodeInstanceFilePath)
                const nodeInstance = new nodeModule.nodeClass()

                const result = isStreamValid
                    ? await nodeInstance.run(nodeToExecuteData, incomingInput.question, {
                          chatHistory: incomingInput.history,
                          socketIO,
                          socketIOClientId: incomingInput.socketIOClientId
                      })
                    : await nodeInstance.run(nodeToExecuteData, incomingInput.question, { chatHistory: incomingInput.history })

                return res.json(result)
            }
        } catch (e: any) {
            console.log(444, e)
            return res.status(500).send(e.message)
        }
    }

    async stopApp() {
        try {
            const removePromises: any[] = []
            await Promise.all(removePromises)
        } catch (e) {
            console.error(`❌[server]: Flowise Server shut down error: ${e}`)
        }
    }
}

let serverApp: App | undefined

export async function start(): Promise<void> {
    serverApp = new App()

    const port = parseInt(process.env.PORT || '', 10) || 3000
    const server = http.createServer(serverApp.app)

    const io = new Server(server, {
        cors: {
            origin: '*'
        }
    })

    await serverApp.initDatabase()
    await serverApp.config(io)

    server.listen(port, () => {
        console.info(`⚡️[server]: Flowise Server is listening at ${port}`)
    })
}

export function getInstance(): App | undefined {
    return serverApp
}
