import axios from 'axios'

const useMock = import.meta.env.VITE_USE_MOCK === 'true'

const client = axios.create({
  baseURL: useMock ? '' : (import.meta.env.VITE_API_URL || 'http://localhost:8000'),
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.detail || err.message || 'Something went wrong'
    return Promise.reject(new Error(msg))
  }
)

export default client
export { useMock }
