import React, { useState, useContext } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Label, Input, Button, WindmillContext } from '@roketid/windmill-react-ui'
import { useAuth } from '@/context/AuthContext'

function SignUpPage() {
  const { mode } = useContext(WindmillContext)
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const imgSource = mode === 'dark' ? '/assets/img/create-account-office-dark.jpeg' : '/assets/img/create-account-office.jpeg'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Signup form submitted', { email, fullName })
    setError('')
    setLoading(true)

    try {
      console.log('Attempting sign up...')
      const { error, data } = await signUp(email, password, fullName)
      console.log('Sign up result', { error, data })

      if (error) {
        setError(error.message || 'Failed to sign up')
        setLoading(false)
      } else {
        console.log('Sign up successful')
        // Check if email confirmation is required
        if (data?.user && !data.session) {
          // Email confirmation required
          setSuccess(true)
          setError('Account created! Please check your email to confirm your account before logging in.')
          setTimeout(() => {
            navigate('/login')
          }, 3000)
        } else {
          // Auto-logged in (if email confirmation is disabled)
          setSuccess(true)
          setError('')
          setTimeout(() => {
            navigate('/')
          }, 500)
        }
        setLoading(false)
      }
    } catch (err: any) {
      console.error('Sign up error', err)
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
              <h1 className="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">Create account</h1>
              
              {error && (
                <div className={`mb-4 p-3 text-sm rounded ${
                  error.includes('Account created') || error.includes('check your email') || success
                    ? 'text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200'
                    : 'text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200'
                }`}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <Label>
                  <span>Full Name</span>
                  <Input
                    className="mt-1"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </Label>

                <Label className="mt-4">
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
                  {loading ? 'Creating account...' : 'Create account'}
                </Button>
              </form>

              <p className="mt-4">
                <Link to="/login">
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                    Already have an account? Login
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

export default SignUpPage

