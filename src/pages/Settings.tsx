import React, { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Button, Card, Label, Select } from '@roketid/windmill-react-ui'
import PageTitle from '@/components/Typography/PageTitle'

function SettingsPage() {
  const { signOut } = useAuth()
  const { theme, toggleTheme } = useTheme()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div>
      <PageTitle>Settings</PageTitle>

      <Card className="mt-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Preferences</h2>

          <Label className="mt-4">
            <span>Theme</span>
            <Select
              className="mt-1"
              value={theme}
              onChange={(e) => {
                if (e.target.value !== theme) {
                  toggleTheme()
                }
              }}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </Select>
          </Label>
        </div>
      </Card>

      <Card className="mt-6">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">Danger Zone</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Sign out of your account. You will need to log in again to access the application.
          </p>
          <Button layout="outline" onClick={handleSignOut}>
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  )
}

export default SettingsPage

