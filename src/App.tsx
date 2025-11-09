import { BrowserRouter } from 'react-router-dom'
import { Windmill } from '@roketid/windmill-react-ui'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import ErrorBoundary from './components/ErrorBoundary'
import ToastContainer from './components/ToastContainer'
import AppRoutes from './routes/AppRoutes'

function App() {
  try {
    return (
      <ErrorBoundary>
        <Windmill usePreferences={true}>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <BrowserRouter>
                  <AppRoutes />
                  <ToastContainer />
                </BrowserRouter>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </Windmill>
      </ErrorBoundary>
    )
  } catch (error) {
    console.error('App render error:', error)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Application Error</h1>
          <p className="text-gray-600">Please check the console for details.</p>
        </div>
      </div>
    )
  }
}

export default App

