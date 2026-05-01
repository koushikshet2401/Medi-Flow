import axios from "axios";
import React, { useEffect } from "react"; // ✅ useEffect was missing
import { useLocation, useNavigate } from "react-router-dom";

const API_BASE = "https://medi-flow-backend.onrender.com";

function VerifyPaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const verifyPayment = async () => {
      const params = new URLSearchParams(location.search || "");
      const sessionId = params.get("session_id");

      if (location.pathname === "/appointment/cancel") {
        if (!cancelled)
          navigate("/appointments?payment_status=Cancelled", { replace: true });
        return;
      }

      if (!sessionId) {
        if (!cancelled)
          navigate("/appointments?payment_status=Failed", { replace: true });
        return;
      }

      try {
        const res = await axios.get(`${API_BASE}/api/appointments/confirm`, {
          params: { session_id: sessionId },
          timeout: 15000,
        });

        if (cancelled) return;

        if (res?.data?.success) {
          // ✅ Fixed: was "/appointment" (no s) → appointment never showed up
          navigate("/appointments?payment_status=Paid", { replace: true });
        } else {
          navigate("/appointments?payment_status=Failed", { replace: true });
        }
      } catch (error) {
        console.error("Payment verification failed:", error);
        if (!cancelled)
          navigate("/appointments?payment_status=Failed", { replace: true });
      }
    };

    verifyPayment();
    return () => {
      cancelled = true;
    };
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="text-center">
        <div className="text-4xl mb-4">⏳</div>
        <p className="text-gray-600 text-lg">Verifying your payment...</p>
      </div>
    </div>
  );
}

export default VerifyPaymentPage;
