import React, { useState, useContext } from 'react'
import { Link } from 'react-router-dom'
import { Label, Input, Button, WindmillContext } from '@roketid/windmill-react-ui'
import { supabase } from '@/lib/supabase'

function ForgotPasswordPage() {
  const { mode } = useContext(WindmillContext)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const imgSource = mode === 'dark' ? '/assets/img/forgot-password-office-dark.jpeg' : '/assets/img/forgot-password-office.jpeg'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message || 'Failed to send reset email')
      setLoading(false)
    } else {
      setMessage('Check your email for a password reset link')
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
              <h1 className="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">Forgot password</h1>
              
              {error && (
                <div className="mb-4 p-3 text-sm text-red-600 bg-red-100 rounded dark:bg-red-900 dark:text-red-200">
                  {error}
                </div>
              )}

              {message && (
                <div className="mb-4 p-3 text-sm text-green-600 bg-green-100 rounded dark:bg-green-900 dark:text-green-200">
                  {message}
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

                <Button className="mt-4" block disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </Button>
              </form>

              <p className="mt-4">
                <Link to="/login">
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline">
                    Back to login
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

export default ForgotPasswordPage

