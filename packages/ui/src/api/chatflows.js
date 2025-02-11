import client from './client'

const getAllChatflows = () => client.get('/chatflows')

const getSpecificChatflow = (id) => client.get(`/chatflows/${id}`)

const createNewChatflow = (body) => client.post(`/chatflows`, body)

const updateChatflow = (id, body) => client.put(`/chatflows/${id}`, body)

const deleteChatflow = (id) => client.delete(`/chatflows/${id}`)

const postChatflowOutgoingRobot = (id, body) => client.post(`/chatflows/outgoingrobot/${id}`, body)
const getIsChatflowStreaming = (id) => client.get(`/chatflows-streaming/${id}`)

export default {
    getAllChatflows,
    getSpecificChatflow,
    createNewChatflow,
    updateChatflow,
    deleteChatflow,
    postChatflowOutgoingRobot,
    getIsChatflowStreaming
}
