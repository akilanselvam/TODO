import { createContext, useContext, useState, useEffect } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db, isFirebaseConfigured } from '../services/firebase'
import { useAuth } from './AuthContext'
import translations from '../i18n/translations.jsx'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
  const { user } = useAuth()
  const [lang, setLangState] = useState(() => localStorage.getItem('app-lang') || 'en')
  const [showLangPicker, setShowLangPicker] = useState(false)

  // On login: restore saved language from Firestore, or show picker for first-timers
  useEffect(() => {
    if (!user?.uid || !isFirebaseConfigured) return
    ;(async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid))
        if (snap.exists() && snap.data()?.preferredLang) {
          const saved = snap.data().preferredLang
          setLangState(saved)
          localStorage.setItem('app-lang', saved)
        } else {
          setShowLangPicker(true)
        }
      } catch {
        // silent — keep current lang
      }
    })()
  }, [user?.uid])

  async function switchLang(next) {
    setLangState(next)
    localStorage.setItem('app-lang', next)
    setShowLangPicker(false)
    if (user?.uid && isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', user.uid), { preferredLang: next }, { merge: true })
      } catch {
        // silent — applied locally anyway
      }
    }
  }

  function t(key) {
    return translations[lang]?.[key] ?? translations.en[key] ?? key
  }

  return (
    <LanguageContext.Provider value={{ lang, switchLang, t, showLangPicker, setShowLangPicker }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
