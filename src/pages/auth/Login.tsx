import React, { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Label, Input, Button, WindmillContext } from '@roketid/windmill-react-ui'
import { GithubIcon, TwitterIcon } from '@/icons'
import { useAuth } from '@/context/AuthContext'

function LoginPage() {
  const { mode } = useContext(WindmillContext)
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const imgSource = mode === 'dark' ? '/assets/img/login-office-dark.jpeg' : '/assets/img/login-office.jpeg'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted', { email })
    setError('')
    setLoading(true)

    try {
      console.log('Attempting sign in...')
      const { error } = await signIn(email, password)
      console.log('Sign in result', { error })

      if (error) {
        setError(error.message || 'Failed to sign in')
        setLoading(false)
      } else {
        console.log('Sign in successful, navigating...')
        // Navigation will happen automatically when auth state updates
        // But we can also navigate here as a fallback
        setTimeout(() => {
          navigate('/')
        }, 100)
      }
    } catch (err: any) {
      console.error('Sign in error', err)
      setError(err.message || 'An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center min-h-screen p-6 bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 h-full max-w-4xl mx-auto overflow-hidden bg-white rounded-lg shadow-xl dark:bg-gray-800">
        <div className="flex flex-col overflow-y-auto md:flex-row">
          <div className="relative h-32 md:h-auto md:w-1/2">
            <img
              aria-hidden="true"
              className="hidden object-cover w-full h-full md:block"
              src={imgSource}
              alt="Office"
            />
          </div>
          <main className="flex items-center justify-center p-6 sm:p-12 md:w-1/2">
            <div className="w-full">
              <h1 className="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">Login</h1>
              
              {error && (
                <div className="mb-4 p-3 text-sm text-red-600 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <Label>
                  <span>Email</span>
                  <Input
                    className="mt-1"
                    type="email"
                    placeholder="john@doe.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </Label>

                <Label className="mt-4">
                  <span>Password</span>
                  <Input
                    className="mt-1"
                    type="password"
                    placeholder="***************"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </Label>

                <Button 
                  className="mt-4" 
                  block 
                  disabled={loading} 
                  type="submit"
                  onClick={(e) => {
                    // Ensure form submission works even if Button doesn't handle type="submit"
                    if (!e.defaultPrevented) {
                      const form = (e.target as HTMLElement).closest('form')
                      if (form) {
                        form.requestSubmit()
                      }
                    }
                  }}
                >
                  {loading ? 'Logging in...' : 'Log in'}
                </Button>
              </form>

              <hr className="my-8" />

              <Button block layout="outline" disabled>
                <GithubIcon className="w-4 h-4 mr-2" aria-hidden="true" />
                Github
              </Button>
              <Button className="mt-4" block layout="outline" disabled>
                <TwitterIcon className="w-4 h-4 mr-2" aria-hidden="true" />
                Twitter
              </Button>

              <p className="mt-4">
                <Link to="/forgot-password">
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                    Forgot your password?
                  </span>
                </Link>
              </p>
              <p className="mt-1">
                <Link to="/signup">
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                    Create account
                  </span>
                </Link>
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

