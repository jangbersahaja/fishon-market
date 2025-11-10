import { AlertTriangle } from "lucide-react";

interface PaymentConfigurationErrorProps {
  errors: string[];
}

export function PaymentConfigurationError({
  errors,
}: PaymentConfigurationErrorProps) {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl px-4 py-12 mx-auto">
        <div className="p-8 bg-white border border-red-200 rounded-lg shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <div className="flex-1">
              <h1 className="mb-2 text-2xl font-bold text-red-900">
                Payment Gateway Not Configured
              </h1>
              <p className="mb-4 text-red-700">
                The payment gateway is not properly configured. Please contact
                support to complete your booking.
              </p>

              {errors.length > 0 && (
                <div className="p-4 mt-4 rounded-lg bg-red-50">
                  <p className="mb-2 text-sm font-semibold text-red-800">
                    Configuration Issues:
                  </p>
                  <ul className="space-y-1 text-sm text-red-700 list-disc list-inside">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <a
                  href="/contact"
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  Contact Support
                </a>
                <a
                  href="/"
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Return Home
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Admin/Developer Info */}
        {process.env.NODE_ENV === "development" && (
          <div className="p-4 mt-4 border border-yellow-200 rounded-lg bg-yellow-50">
            <p className="mb-2 text-sm font-semibold text-yellow-800">
              💡 Developer Info
            </p>
            <p className="text-xs text-yellow-700">
              Set <code>SENANGPAY_FORCE_MOCK=true</code> in your{" "}
              <code>.env.local</code> file to test payments in development mode
              without configuring the gateway.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
