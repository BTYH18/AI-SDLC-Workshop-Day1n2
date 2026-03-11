'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import * as SimpleWebAuthnBrowser from '@simplewebauthn/browser'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [isBypassing, setIsBypassing] = useState(false)
  const [isSupported, setIsSupported] = useState<boolean | null>(null)
  const [authenticatorAvailable, setAuthenticatorAvailable] = useState<boolean | null>(null)
  const router = useRouter()
  const isDev = process.env.NODE_ENV !== 'production'

  useEffect(() => {
    async function checkSupport() {
      try {
        const supported = await SimpleWebAuthnBrowser.browserSupportsWebAuthn()
        setIsSupported(Boolean(supported))
        if (supported) {
          const available = await SimpleWebAuthnBrowser.platformAuthenticatorIsAvailable()
          setAuthenticatorAvailable(Boolean(available))
        }
      } catch {
        setIsSupported(false)
        setAuthenticatorAvailable(false)
      }
    }

    checkSupport()
  }, [])

  const toFriendlyWebAuthnError = (err: unknown): string => {
    const message = err instanceof Error ? err.message : 'Unknown WebAuthn error'
    const name = err instanceof Error ? err.name : ''

    if (!window.isSecureContext) {
      return 'Passkeys require a secure context. Use https:// or http://localhost.'
    }

    if (name === 'NotAllowedError' || message.includes('timed out') || message.includes('not allowed')) {
      return 'Passkey request was cancelled or timed out. Click the button again and complete the biometric/security key prompt quickly.'
    }

    if (name === 'InvalidStateError') {
      return 'This passkey is already registered for this account. Try logging in instead.'
    }

    if (message.includes('privacy-considerations-client')) {
      return 'Browser blocked the passkey operation due to privacy rules. Stay on the same tab, ensure user interaction, and retry.'
    }

    return message
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!username.trim()) {
      setError('Username is required')
      return
    }

    if (!window.isSecureContext) {
      setError('Passkeys require a secure context. Open the app on http://localhost or HTTPS.')
      return
    }

    if (isSupported === false) {
      setError('This browser does not support WebAuthn passkeys.')
      return
    }

    const endpoint = mode === 'register' ? '/api/auth/register-options' : '/api/auth/login-options'
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (mode === 'register' && data?.error === 'Username already exists') {
          setMode('login')
          throw new Error('Username already exists. Switched to Login mode; use your existing passkey.')
        }
        throw new Error(data.error || 'Request failed')
      }

      // For registration we must complete browser step
      if (mode === 'register') {
        const opts = data.data
        const cred = await SimpleWebAuthnBrowser.startRegistration(opts)
        const verifyRes = await fetch('/api/auth/register-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), attestationResponse: cred }),
        })
        let verifyData: any = null
        try {
          verifyData = await verifyRes.json()
        } catch {}
        if (!verifyRes.ok) throw new Error((verifyData && verifyData.error) || 'Verification failed')
        router.push('/')
      } else {
        const opts = data.data
        const assertion = await SimpleWebAuthnBrowser.startAuthentication(opts)
        const verifyRes = await fetch('/api/auth/login-verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: username.trim(), assertionResponse: assertion }),
        })
        let verifyData: any = null
        try {
          verifyData = await verifyRes.json()
        } catch {}
        if (!verifyRes.ok) throw new Error((verifyData && verifyData.error) || 'Login failed')
        router.push('/')
      }
    } catch (err: unknown) {
      setError(toFriendlyWebAuthnError(err))
    }
  }

  const handleDevBypass = async () => {
    try {
      setIsBypassing(true)
      setError(null)
      const res = await fetch('/api/auth/dev-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Dev bypass failed')
      }
      router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Dev bypass failed')
    } finally {
      setIsBypassing(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="bg-slate-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-white mb-6">
          {mode === 'register' ? 'Register' : 'Login'}
        </h2>
        <p className="text-slate-300 text-sm mb-4">
          Existing users should use Login. Register is only for brand new usernames.
        </p>
        {isSupported === false && (
          <p className="text-amber-300 mb-4">
            WebAuthn is not supported in this browser.
          </p>
        )}
        {isSupported && authenticatorAvailable === false && (
          <p className="text-amber-300 mb-4">
            No platform authenticator detected. Use a browser/device with passkey support.
          </p>
        )}
        {error && <p className="text-red-400 mb-4">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-2 rounded bg-slate-700 text-white focus:outline-none"
          />
          <button
            type="submit"
            disabled={isSupported === false}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded"
          >
            {mode === 'register' ? 'Register' : 'Login'}
          </button>
          {isDev && (
            <button
              type="button"
              onClick={handleDevBypass}
              disabled={isBypassing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-900 text-white py-2 rounded"
            >
              {isBypassing ? 'Bypassing...' : 'Dev Bypass Login (test account)'}
            </button>
          )}
        </form>
        <div className="text-sm text-slate-400 mt-4">
          <button
            onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
            className="underline"
          >
            {mode === 'register' ? 'Already have an account? Log in' : "Don't have one? Register"}
          </button>
        </div>
      </div>
    </div>
  )
}