import { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider, isFirebaseConfigured } from '../services/firebase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(isFirebaseConfigured)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (!isFirebaseConfigured) return
    const unsub = onAuthStateChanged(auth, u => {
      setUser(u)
      setAuthLoading(false)
    })
    return unsub
  }, [])

  const signIn = async () => {
    setAuthError('')
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      setAuthError(e?.message || String(e))
    }
  }

  const signOutUser = async () => {
    try {
      await signOut(auth)
    } catch (e) {
      setAuthError(e?.message || String(e))
    }
  }

  return (
    <AuthContext.Provider value={{
      user,
      authLoading,
      authError,
      firebaseEnabled: isFirebaseConfigured,
      signIn,
      signOutUser,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
