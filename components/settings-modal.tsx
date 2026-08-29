"use client"

import { useState, useEffect } from "react"
import { X, Plus, CreditCard, Globe, Users, LogOut, Monitor, KeyRound, Eye, EyeOff } from "lucide-react"
import { 
  getSettings, 
  addBlockedCardBin, 
  removeBlockedCardBin, 
  addAllowedCountry, 
  removeAllowedCountry,
  type Settings 
} from "@/lib/firebase/settings"
import {
  subscribeToAllSessions,
  revokeSession,
  revokeOtherSessions,
  type AdminSession,
} from "@/lib/firebase/sessions"
import { useAuth } from "@/lib/auth-context"
import { getPasswordChangeErrorMessage, validatePasswordChangeInput } from "@/lib/account-security"
import { toast } from "sonner"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

const COUNTRIES = [
  { code: "SAU", name: "السعودية", flag: "🇸🇦" },
  { code: "ARE", name: "الإمارات", flag: "🇦🇪" },
  { code: "KWT", name: "الكويت", flag: "🇰🇼" },
  { code: "BHR", name: "البحرين", flag: "🇧🇭" },
  { code: "OMN", name: "عمان", flag: "🇴🇲" },
  { code: "QAT", name: "قطر", flag: "🇶🇦" },
  { code: "JOR", name: "الأردن", flag: "🇯🇴" },
  { code: "EGY", name: "مصر", flag: "🇪🇬" },
  { code: "LBN", name: "لبنان", flag: "🇱🇧" },
  { code: "IRQ", name: "العراق", flag: "🇮🇶" },
  { code: "SYR", name: "سوريا", flag: "🇸🇾" },
  { code: "YEM", name: "اليمن", flag: "🇾🇪" },
  { code: "PSE", name: "فلسطين", flag: "🇵🇸" },
  { code: "MAR", name: "المغرب", flag: "🇲🇦" },
  { code: "DZA", name: "الجزائر", flag: "🇩🇿" },
  { code: "TUN", name: "تونس", flag: "🇹🇳" },
  { code: "LBY", name: "ليبيا", flag: "🇱🇾" },
  { code: "SDN", name: "السودان", flag: "🇸🇩" },
]

function formatLastActive(value: any): string {
  if (!value) return "غير معروف"
  let date: Date
  if (typeof value?.toDate === "function") {
    date = value.toDate()
  } else {
    date = new Date(value)
  }
  if (isNaN(date.getTime())) return "غير معروف"
  const diffMs = Date.now() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return "الآن"
  if (diffMins < 60) return `منذ ${diffMins} دقيقة`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `منذ ${diffHours} ساعة`
  return `منذ ${Math.floor(diffHours / 24)} يوم`
}

function getBrowserName(userAgent: string): string {
  if (!userAgent) return "متصفح غير معروف"
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) return "Chrome"
  if (userAgent.includes("Firefox")) return "Firefox"
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari"
  if (userAgent.includes("Edg")) return "Edge"
  if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera"
  return "متصفح غير معروف"
}

function getDeviceName(userAgent: string): string {
  if (!userAgent) return "جهاز غير معروف"
  if (/iPhone|iPad|iPod/.test(userAgent)) return "iOS"
  if (/Android/.test(userAgent)) return "Android"
  if (/Windows/.test(userAgent)) return "Windows"
  if (/Macintosh|Mac OS X/.test(userAgent)) return "Mac"
  if (/Linux/.test(userAgent)) return "Linux"
  return "جهاز غير معروف"
}

interface PasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  visible: boolean
  onToggle: () => void
  disabled: boolean
  autoComplete?: string
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
  disabled,
  autoComplete = "current-password",
}: PasswordFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          disabled={disabled}
          dir="ltr"
          className="w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-3 pe-12 text-base text-gray-900 outline-none transition-colors focus:border-amber-500 disabled:bg-gray-100"
        />
        <button
          type="button"
          onClick={onToggle}
          disabled={disabled}
          aria-label={visible ? `إخفاء ${label}` : `إظهار ${label}`}
          className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-gray-500 hover:text-gray-800 disabled:opacity-50"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { sessionId, user, logout, changePassword } = useAuth()
  const [settings, setSettings] = useState<Settings>({
    blockedCardBins: [],
    allowedCountries: []
  })
  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newBinsInput, setNewBinsInput] = useState("")
  const [selectedCountry, setSelectedCountry] = useState("")
  const [loading, setLoading] = useState(false)
  const [revokingId, setRevokingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"cards" | "countries" | "password" | "sessions">("cards")

  const loadSettings = async () => {
    try {
      const data = await getSettings()
      setSettings(data)
    } catch (error) {
      console.error("Error loading settings:", error)
      toast.error("فشل تحميل الإعدادات")
    }
  }

  useEffect(() => {
    if (isOpen) {
      loadSettings()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const unsub = subscribeToAllSessions((all) => {
      setSessions(all)
    })
    return () => unsub()
  }, [isOpen])

  const handleAddBins = async () => {
    const bins = newBinsInput
      .split(/[\s,\n]+/)
      .map(bin => bin.trim())
      .filter(bin => bin.length === 4 && /^\d+$/.test(bin))

    if (bins.length === 0) {
      toast.error("يجب إدخال أرقام صحيحة (4 أرقام لكل بطاقة)")
      return
    }

    setLoading(true)
    try {
      for (const bin of bins) {
        await addBlockedCardBin(bin)
      }
      await loadSettings()
      setNewBinsInput("")
      toast.success(`تم إضافة ${bins.length} بطاقة محظورة`)
    } catch (error) {
      console.error("Error adding blocked BINs:", error)
      toast.error("فشل إضافة البطاقات")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveBin = async (bin: string) => {
    setLoading(true)
    try {
      await removeBlockedCardBin(bin)
      await loadSettings()
      toast.success("تم إزالة البطاقة المحظورة")
    } catch (error) {
      console.error("Error removing blocked BIN:", error)
      toast.error("فشل إزالة البطاقة")
    } finally {
      setLoading(false)
    }
  }

  const handleAddCountry = async () => {
    if (!selectedCountry) {
      toast.error("يرجى اختيار دولة")
      return
    }

    setLoading(true)
    try {
      await addAllowedCountry(selectedCountry)
      await loadSettings()
      setSelectedCountry("")
      toast.success("تم إضافة الدولة المسموحة")
    } catch (error) {
      console.error("Error adding allowed country:", error)
      toast.error("فشل إضافة الدولة")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveCountry = async (country: string) => {
    setLoading(true)
    try {
      await removeAllowedCountry(country)
      await loadSettings()
      toast.success("تم إزالة الدولة المسموحة")
    } catch (error) {
      console.error("Error removing allowed country:", error)
      toast.error("فشل إزالة الدولة")
    } finally {
      setLoading(false)
    }
  }

  const handleChangePassword = async () => {
    const validationError = validatePasswordChangeInput(
      currentPassword,
      newPassword,
      confirmPassword
    )

    if (validationError === "missing-current-password") {
      toast.error("أدخل كلمة المرور الحالية")
      return
    }
    if (validationError === "weak-password") {
      toast.error("كلمة المرور الجديدة يجب أن تحتوي على 8 أحرف على الأقل")
      return
    }
    if (validationError === "password-mismatch") {
      toast.error("تأكيد كلمة المرور غير متطابق")
      return
    }

    if (!sessionId) {
      toast.error("انتهت جلسة الدخول. يرجى تسجيل الدخول من جديد")
      return
    }

    setIsChangingPassword(true)
    let passwordChanged = false
    try {
      await changePassword(currentPassword, newPassword)
      passwordChanged = true
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")

      const revokedCount = await revokeOtherSessions(sessionId)
      toast.success(
        revokedCount > 0
          ? `تم تغيير كلمة المرور وإنهاء ${revokedCount} جلسة أخرى`
          : "تم تغيير كلمة المرور ولا توجد جلسات أخرى"
      )
    } catch (error) {
      if (passwordChanged) {
        toast.error("تم تغيير كلمة المرور، لكن تعذر إنهاء الجلسات الأخرى. افتح الإعدادات وأعد المحاولة")
      } else {
        toast.error(getPasswordChangeErrorMessage(error))
      }
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleRevokeSession = async (targetSessionId: string) => {
    const isCurrent = targetSessionId === sessionId
    if (isCurrent) {
      await logout()
      onClose()
      return
    }
    setRevokingId(targetSessionId)
    try {
      await revokeSession(targetSessionId)
      toast.success("تم تسجيل الخروج من الجلسة")
    } catch (error) {
      console.error("Error revoking session:", error)
      toast.error("فشل إنهاء الجلسة")
    } finally {
      setRevokingId(null)
    }
  }

  const handleRevokeAllOther = async () => {
    const others = sessions.filter((s) => s.sessionId !== sessionId)
    if (others.length === 0) return
    setLoading(true)
    try {
      await Promise.all(others.map((s) => revokeSession(s.sessionId)))
      toast.success("تم تسجيل الخروج من جميع الجلسات الأخرى")
    } catch (error) {
      console.error("Error revoking all sessions:", error)
      toast.error("فشل إنهاء الجلسات")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  const otherSessions = sessions.filter((s) => s.sessionId !== sessionId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 backdrop-blur-sm sm:p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold sm:text-2xl">⚙️ إعدادات النظام</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-2 border-b border-gray-200 sm:grid-cols-4">
          <button
            onClick={() => setActiveTab("cards")}
            className={`px-2 py-3 text-xs font-semibold transition-colors sm:px-4 sm:py-4 sm:text-sm ${
              activeTab === "cards"
                ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <CreditCard className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              <span>حجب البطاقات</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("countries")}
            className={`px-2 py-3 text-xs font-semibold transition-colors sm:px-4 sm:py-4 sm:text-sm ${
              activeTab === "countries"
                ? "text-purple-600 border-b-2 border-purple-600 bg-purple-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <Globe className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              <span>تقييد الدول</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("password")}
            className={`px-2 py-3 text-xs font-semibold transition-colors sm:px-4 sm:py-4 sm:text-sm ${
              activeTab === "password"
                ? "text-amber-600 border-b-2 border-amber-600 bg-amber-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <KeyRound className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              <span>كلمة المرور</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("sessions")}
            className={`px-2 py-3 text-xs font-semibold transition-colors sm:px-4 sm:py-4 sm:text-sm ${
              activeTab === "sessions"
                ? "text-green-600 border-b-2 border-green-600 bg-green-50"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <div className="flex items-center justify-center gap-1 sm:gap-2">
              <Users className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
              <span>الجلسات النشطة</span>
              {sessions.length > 0 && (
                <span className="bg-green-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                  {sessions.length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4 sm:p-6">
          {activeTab === "cards" && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="mb-2 text-lg font-bold text-gray-800 sm:text-xl">قائمة حجب بطاقات الدفع</h3>
                <p className="text-sm text-gray-600">
                  أضف البيانات الخاصة بأرقام البطاقات التي لا تريده. يمكنك إضافة مجموعة من البيانات
                  <br className="hidden sm:block" />
                  مفصولة بفاصلة أو فاصلة أو سطر جديد. اضغط Enter لإضافة كل بلوك.
                </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <textarea
                  value={newBinsInput}
                  onChange={(e) => setNewBinsInput(e.target.value)}
                  placeholder="مثال: 4890, 4458, 4909&#10;أو كل رقم في سطر منفصل"
                  rows={4}
                  dir="ltr"
                  className="w-full resize-none rounded-lg border-2 border-gray-300 px-4 py-3 text-base font-mono focus:border-blue-500 focus:outline-none sm:text-lg"
                />
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    onClick={handleAddBins}
                    disabled={loading || !newBinsInput.trim()}
                    className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-gray-400"
                  >
                    <Plus className="w-5 h-5" />
                    حفظ
                  </button>
                  <button
                    onClick={() => setNewBinsInput("")}
                    className="text-gray-600 hover:text-gray-800 px-4 py-2 rounded-lg font-semibold transition-colors"
                  >
                    إلغاء
                  </button>
                </div>
              </div>

              <div>
                {settings.blockedCardBins.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>لا توجد بطاقات محظورة</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {settings.blockedCardBins.map((bin) => (
                      <div
                        key={bin}
                        className="bg-gray-100 border border-gray-300 rounded-full px-4 py-2 flex items-center gap-2"
                      >
                        <span className="font-mono text-sm font-semibold text-gray-700">
                          {bin}
                        </span>
                        <button
                          onClick={() => handleRemoveBin(bin)}
                          disabled={loading}
                          className="text-gray-500 hover:text-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "countries" && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="mb-2 text-lg font-bold text-gray-800 sm:text-xl">تقييد الوصول حسب الدولة</h3>
                <p className="text-sm text-gray-600">
                  تحكم في الدول التي تسمح لها بالوصول إلى موقعك الإلكتروني للتعزيز الأمان.
                  <br className="hidden sm:block" />
                  يمكنك إضافة أكثر من دولة. وسيمنع الوصول من أي دولة غير موجودة في القائمة.
                </p>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  - الدول المسموح لها بالوصول -
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <select
                    value={selectedCountry}
                    onChange={(e) => setSelectedCountry(e.target.value)}
                    className="flex-1 rounded-lg border-2 border-gray-300 px-4 py-3 text-base focus:border-purple-500 focus:outline-none"
                    dir="rtl"
                  >
                    <option value="">اختر دولة...</option>
                    {COUNTRIES.filter(c => !settings.allowedCountries.includes(c.code)).map((country) => (
                      <option key={country.code} value={country.code}>
                        {country.flag} {country.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={handleAddCountry}
                    disabled={loading || !selectedCountry}
                    className="rounded-lg bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700 disabled:bg-gray-400"
                  >
                    حفظ
                  </button>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  يمكنك إضافة أكثر من دولة غير موجودة في القائمة.
                </p>
              </div>

              <div>
                {settings.allowedCountries.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Globe className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>جميع الدول مسموحة (لم يتم تحديد قيود)</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {settings.allowedCountries.map((countryCode) => {
                      const country = COUNTRIES.find(c => c.code === countryCode)
                      return (
                        <div
                          key={countryCode}
                          className="bg-green-50 border border-green-300 rounded-full px-4 py-2 flex items-center gap-2"
                        >
                          <span className="text-lg">{country?.flag || "🌍"}</span>
                          <span className="text-sm font-semibold text-gray-700">
                            {country?.name || countryCode}
                          </span>
                          <button
                            onClick={() => handleRemoveCountry(countryCode)}
                            disabled={loading}
                            className="text-gray-500 hover:text-red-600 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "password" && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-lg font-bold text-gray-800 sm:text-xl">تغيير كلمة المرور</h3>
                <p className="text-sm text-gray-600">
                  سيتم اعتماد كلمة المرور الجديدة فورًا ومنع استخدام الكلمة القديمة في تسجيل الدخول.
                </p>
                {user?.email && (
                  <p className="mt-1 text-xs text-gray-400" dir="ltr">{user.email}</p>
                )}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 sm:p-5">
                <div className="space-y-4">
                  <PasswordField
                    id="current-password"
                    label="كلمة المرور الحالية"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    visible={showCurrentPassword}
                    onToggle={() => setShowCurrentPassword((visible) => !visible)}
                    disabled={isChangingPassword}
                  />
                  <PasswordField
                    id="new-password"
                    label="كلمة المرور الجديدة"
                    value={newPassword}
                    onChange={setNewPassword}
                    visible={showNewPassword}
                    onToggle={() => setShowNewPassword((visible) => !visible)}
                    disabled={isChangingPassword}
                    autoComplete="new-password"
                  />
                  <PasswordField
                    id="confirm-password"
                    label="تأكيد كلمة المرور الجديدة"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((visible) => !visible)}
                    disabled={isChangingPassword}
                    autoComplete="new-password"
                  />
                </div>
                <div className="mt-4 rounded-lg border border-amber-200 bg-white/70 p-3 text-xs leading-6 text-gray-600">
                  يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل. بعد التغيير سيتم إنهاء جلسات الأجهزة الأخرى.
                </div>
                <button
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                >
                  {isChangingPassword ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      جارٍ الحفظ...
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      حفظ كلمة المرور الجديدة
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === "sessions" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">الجلسات النشطة</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    جميع أجهزة تسجيل الدخول النشطة لهذا الحساب
                  </p>
                </div>
                {otherSessions.length > 0 && (
                  <button
                    onClick={handleRevokeAllOther}
                    disabled={loading}
                    className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors font-semibold disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    تسجيل الخروج من الكل
                  </button>
                )}
              </div>

              {sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p>لا توجد جلسات نشطة</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => {
                    const isCurrent = session.sessionId === sessionId
                    const browser = getBrowserName(session.userAgent)
                    const device = getDeviceName(session.userAgent)
                    const isRevoking = revokingId === session.sessionId

                    return (
                      <div
                        key={session.sessionId}
                        className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all ${
                          isCurrent
                            ? "border-green-300 bg-green-50"
                            : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                        }`}
                      >
                        <div className={`p-2 rounded-lg flex-shrink-0 ${isCurrent ? "bg-green-100" : "bg-white border border-gray-200"}`}>
                          <Monitor className={`w-5 h-5 ${isCurrent ? "text-green-600" : "text-gray-500"}`} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">
                              {browser} — {device}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">
                                الجلسة الحالية
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            {session.email}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${isCurrent ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                            آخر نشاط: {formatLastActive(session.lastActive)}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRevokeSession(session.sessionId)}
                          disabled={isRevoking || loading}
                          title={isCurrent ? "تسجيل الخروج" : "إنهاء الجلسة"}
                          className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${
                            isCurrent
                              ? "bg-red-100 text-red-600 hover:bg-red-200 border border-red-200"
                              : "bg-white text-gray-600 hover:bg-red-50 hover:text-red-600 border border-gray-200 hover:border-red-200"
                          }`}
                        >
                          {isRevoking ? (
                            <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <LogOut className="w-3.5 h-3.5" />
                          )}
                          {isCurrent ? "خروج" : "إنهاء"}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-gray-200 bg-gray-50 p-4">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-3 rounded-lg font-semibold transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  )
}
