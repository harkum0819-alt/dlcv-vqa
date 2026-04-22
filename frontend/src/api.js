import axios from "axios";

const BASE = "http://localhost:8000/api";

function form(image, question, sessionId = "default") {
  const fd = new FormData();
  fd.append("image", image);
  fd.append("question", question);
  fd.append("session_id", sessionId);
  return fd;
}

export const api = {
  status: () => axios.get(`${BASE}/status`).then((r) => r.data),

  predict: (image, question, sessionId) =>
    axios.post(`${BASE}/predict`, form(image, question, sessionId)).then((r) => r.data),

  predictAdvanced: (image, question, sessionId) =>
    axios.post(`${BASE}/predict-advanced`, form(image, question, sessionId)).then((r) => r.data),

  compare: (image, question, sessionId) =>
    axios.post(`${BASE}/compare`, form(image, question, sessionId)).then((r) => r.data),

  history: (sessionId = "default") =>
    axios.get(`${BASE}/history/${sessionId}`).then((r) => r.data.history),

  clearHistory: (sessionId = "default") =>
    axios.delete(`${BASE}/history/${sessionId}`).then((r) => r.data),

  // Conversational chat
  chatFirst: (image, question) => {
    const fd = new FormData();
    fd.append("image", image);
    fd.append("question", question);
    fd.append("chat_id", "");
    return axios.post(`${BASE}/chat`, fd).then((r) => r.data);
  },

  chatFollowUp: (chatId, question) => {
    const fd = new FormData();
    fd.append("chat_id", chatId);
    fd.append("question", question);
    return axios.post(`${BASE}/chat`, fd).then((r) => r.data);
  },

  clearChat: (chatId) =>
    axios.delete(`${BASE}/chat/${chatId}`).then((r) => r.data),
};
