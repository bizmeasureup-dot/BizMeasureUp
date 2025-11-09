import React, { useState, useContext } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Label, Input, Button, WindmillContext } from '@roketid/windmill-react-ui'
import { supabase } from '@/lib/supabase'
import { useNavigate } from 'react-router-dom'

function ResetPasswordPage() {
  const { mode } = useContext(WindmillContext)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const imgSource = mode === 'dark' ? '/assets/img/forgot-password-office-dark.jpeg' : '/assets/img/forgot-password-office.jpeg'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    })

    if (updateError) {
      setError(updateError.message || 'Failed to reset password')
      setLoading(false)
    } else {
      setMessage('Password reset successfully! Redirecting to login...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
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
              <h1 className="mb-4 text-xl font-semibold text-gray-700 dark:text-gray-200">Reset password</h1>
              
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
                  <span>New Password</span>
                  <Input
                    className="mt-1"
                    type="password"
                    placeholder="Enter new password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </Label>

                <Label className="mt-4">
                  <span>Confirm Password</span>
                  <Input
                    className="mt-1"
                    type="password"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </Label>

                <Button className="mt-4" block disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset Password'}
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

export default ResetPasswordPage

