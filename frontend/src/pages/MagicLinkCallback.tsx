import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Loader2, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authAPI } from '../lib/api'
import { WebGLShader } from '../components/WebGLShader'

export default function MagicLinkCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { login } = useAuth()
  
  const [status, setStatus] = useState<'LOADING' | 'ERROR'>('LOADING')
  const [errorMsg, setErrorMsg] = useState('')
  
  const token = searchParams.get('token')
  const verifiedRef = useRef(false)

  useEffect(() => {
    if (!token) {
      setStatus('ERROR')
      setErrorMsg('No authentication token found in the magic link.')
      return
    }

    if (verifiedRef.current) return // Prevent React strict mode double-firing
    verifiedRef.current = true

    authAPI.verifyLink(token)
      .then(res => {
        const { token: sessionToken, user } = res.data
        login({ ...user, token: sessionToken })
        toast.success(`Welcome back, ${user.name}!`)
        
        // Redirect based on role
        if (user.role === 'ADMIN') navigate('/admin')
        else if (user.role === 'INVIGILATOR') navigate('/invigilator')
        else navigate('/student')
      })
      .catch(err => {
        setStatus('ERROR')
        setErrorMsg(err.response?.data?.error || 'Invalid or expired magic link.')
      })
  }, [token, login, navigate])

  return (
    <div className="min-h-screen flex relative z-0 items-center justify-center bg-transparent">
      <WebGLShader />
      
      <div className="w-full max-w-sm absolute z-10 px-6">
        <div className="glass p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center space-y-4">
          {status === 'LOADING' ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-brand-600/20 flex flex-col items-center justify-center animate-pulse">
                <Loader2 size={32} className="text-brand-400 animate-spin" />
              </div>
              <h2 className="text-white font-bold text-xl mt-4">Verifying your link...</h2>
              <p className="text-slate-400 text-sm">Please wait while we log you in securely.</p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex flex-col items-center justify-center">
                <AlertCircle size={32} className="text-red-400" />
              </div>
              <h2 className="text-white font-bold text-xl mt-4">Authentication Failed</h2>
              <p className="text-slate-400 text-sm">{errorMsg}</p>
              <button 
                onClick={() => navigate('/login')}
                className="mt-6 btn-secondary w-full"
              >
                Return to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
