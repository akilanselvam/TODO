import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { TodoProvider } from './context/TodoContext'
import { ChatProvider } from './context/ChatContext'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <TodoProvider>
          <ChatProvider>
            <App />
          </ChatProvider>
        </TodoProvider>
      </AuthProvider>
    </ThemeProvider>
  </StrictMode>,
)
