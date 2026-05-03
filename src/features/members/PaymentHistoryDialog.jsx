import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Plus, Trash2 } from "lucide-react";
import supabase from "../../../helpers/supabase";

export const PaymentHistoryDialog = ({ member, open, onOpenChange, onPaymentAdded = () => {} }) => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [notice, setNotice] = useState({ tone: "", message: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    paymentForMonth: "",
    paymentMethod: "Cash",
    paymentType: "Monthly Fee",
    transactionNotes: "",
    paidUntil: "", // Admin can set/extend paid until
  });

  const refreshPaymentHistory = async () => {
    if (!member) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("payment_history")
      .select("*")
      .eq("member_id", member.id)
      .order("created_at", { ascending: false });

    if (error) {
      setNotice({ tone: "error", message: error.message });
      setPayments([]);
    } else {
      setPayments(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!open || !member) return;

    let isMounted = true;

    const fetchPaymentHistory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .eq("member_id", member.id)
        .order("created_at", { ascending: false });

      if (isMounted) {
        if (error) {
          setNotice({ tone: "error", message: error.message });
          setPayments([]);
        } else {
          setPayments(data || []);
        }
        setLoading(false);
      }
    };

    fetchPaymentHistory();

    return () => {
      isMounted = false;
    };
  }, [open, member]);

  const handleAddPayment = async (e) => {
    e.preventDefault();
    setNotice({ tone: "", message: "" });

    if (!formData.amount || !formData.paymentForMonth) {
      setNotice({ tone: "error", message: "Please fill in all required fields." });
      return;
    }

    if (Number(formData.amount) <= 0) {
      setNotice({ tone: "error", message: "Payment amount must be greater than 0." });
      return;
    }

    setIsSubmitting(true);

    // Insert payment record
    const { error } = await supabase.from("payment_history").insert({
      member_id: member.id,
      amount: Number(formData.amount),
      payment_for_month: formData.paymentForMonth,
      payment_method: formData.paymentMethod,
      payment_type: formData.paymentType,
      transaction_notes: formData.transactionNotes || null,
    });

    // Update member's paid_until if needed, always fetch latest
    if (!error) {
      try {
        const paymentDate = new Date(`${formData.paymentForMonth}T00:00:00`);
        const endOfMonth = new Date(paymentDate.getFullYear(), paymentDate.getMonth() + 1, 0);
        const requestedPaidUntil = formData.paidUntil || endOfMonth.toISOString().slice(0, 10);
        const requestedPaidUntilDate = new Date(`${requestedPaidUntil}T00:00:00`);

        // Fetch latest member paid_until
        const { data: latestMember, error: fetchError } = await supabase
          .from("library_members")
          .select("paid_until")
          .eq("id", member.id)
          .single();
        if (fetchError) throw fetchError;
        const currentPaidUntil = latestMember?.paid_until;
        let shouldUpdate = false;
        if (!currentPaidUntil) {
          shouldUpdate = true;
        } else {
          const paidUntilDate = new Date(`${currentPaidUntil}T00:00:00`);
          if (requestedPaidUntilDate > paidUntilDate) {
            shouldUpdate = true;
          }
        }
        if (shouldUpdate) {
          await supabase.from("library_members").update({ paid_until: requestedPaidUntil }).eq("id", member.id);
        }
      } catch (err) {
        // Ignore update errors, just log
        console.error("Failed to update paid_until", err);
      }
    }

    setIsSubmitting(false);

    if (error) {
      setNotice({ tone: "error", message: error.message });
      return;
    }

    setNotice({ tone: "success", message: "Payment recorded successfully." });
    setFormData({
      amount: "",
      paymentForMonth: "",
      paymentMethod: "Cash",
      paymentType: "Monthly Fee",
      transactionNotes: "",
      paidUntil: "",
    });
    setShowAddForm(false);
    await refreshPaymentHistory();
    onPaymentAdded();
  };

  const handleDeletePayment = async (paymentId) => {
    if (!confirm("Are you sure you want to delete this payment record?")) {
      return;
    }

    const { error } = await supabase.from("payment_history").delete().eq("id", paymentId);

    if (error) {
      setNotice({ tone: "error", message: error.message });
      return;
    }

    setNotice({ tone: "success", message: "Payment deleted successfully." });
    await refreshPaymentHistory();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatMonthYear = (dateString) => {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
    });
  };

  const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);

  if (!member) return null;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
        <Dialog.Content className="fixed top-0 right-0 h-full w-full max-w-2xl overflow-y-auto bg-white p-4 shadow-xl sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-3">
            <div>
              <Dialog.Title className="text-xl font-bold text-slate-900">Payment History</Dialog.Title>
              <Dialog.Description className="text-sm text-slate-500">
                {member.fullName} - Member ID: {member.id.slice(0, 8)}
              </Dialog.Description>
              <div className="mt-2 text-xs text-slate-700">
                <span className="font-semibold">Paid Until: </span>
                {member.paidUntil || member.paid_until || <span className="text-red-600">Not set</span>}
              </div>
            </div>
            <Dialog.Close asChild>
              <button type="button" className="p-1 hover:bg-slate-100 rounded" aria-label="Close payment history">
                <X size={20} />
              </button>
            </Dialog.Close>
          </div>

          {notice.message && (
            <div
              className={`mb-4 border p-3 text-sm rounded ${
                notice.tone === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : notice.tone === "success"
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-yellow-200 bg-yellow-50 text-yellow-800"
              }`}
            >
              {notice.message}
            </div>
          )}

          {/* Summary */}
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Total Paid</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">Rs.{totalPaid.toFixed(2)}</div>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Payments</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{payments.length}</div>
            </div>
          </div>

          {/* Add Payment Form */}
          {!showAddForm && (
            <button
              type="button"
              onClick={() => setShowAddForm(true)}
              className="mb-6 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={18} />
              Record Payment
            </button>
          )}

          {showAddForm && (
            <form className="mb-6 space-y-4 rounded-md border border-blue-200 bg-blue-50 p-4" onSubmit={handleAddPayment}>
              <h3 className="font-semibold text-slate-900">Add Payment Record</h3>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Amount <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData((prev) => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.00"
                    required
                    className="w-full rounded-md border border-slate-300 p-2 outline-blue-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Payment For Month <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.paymentForMonth}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentForMonth: e.target.value }))}
                    required
                    className="w-full rounded-md border border-slate-300 p-2"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Payment Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.paymentType}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentType: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 bg-white p-2"
                  >
                    <option value="Registration Fee">Registration Fee</option>
                    <option value="Monthly Fee">Monthly Fee</option>
                    <option value="Locker Security">Locker Security Deposit</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 bg-white p-2"
                  >
                    <option>Cash</option>
                    <option>Online</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Extend Paid Until (optional)</label>
                  <input
                    type="date"
                    value={formData.paidUntil}
                    onChange={(e) => setFormData((prev) => ({ ...prev, paidUntil: e.target.value }))}
                    className="w-full rounded-md border border-slate-300 p-2"
                  />
                  <span className="text-xs text-slate-500">Set a new paid until date if extending membership.</span>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Transaction Notes</label>
                <input
                  type="text"
                  value={formData.transactionNotes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, transactionNotes: e.target.value }))}
                  placeholder="Optional notes"
                  className="w-full rounded-md border border-slate-300 p-2 outline-blue-500"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {isSubmitting ? "Saving..." : "Save Payment"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="rounded-md border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Payment History List */}
          <div>
            <h3 className="mb-3 font-semibold text-slate-900">Payment Records</h3>

            {loading && <div className="py-6 text-center text-sm text-slate-500">Loading payment history...</div>}

            {!loading && payments.length === 0 && (
              <div className="rounded-md border border-slate-200 bg-slate-50 py-6 text-center text-sm text-slate-500">
                No payment records yet.
              </div>
            )}

            {!loading && payments.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-start justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 hover:bg-slate-50"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">Rs.{parseFloat(payment.amount).toFixed(2)}</span>
                        <span className="text-xs bg-blue-100 px-2 py-1 rounded text-blue-700 font-medium">
                          {payment.payment_type || "Monthly Fee"}
                        </span>
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">{payment.payment_method}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-600">
                        <div>For: {formatMonthYear(payment.payment_for_month)}</div>
                        <div className="text-xs text-slate-500">Recorded: {formatDate(payment.transaction_date)}</div>
                        {payment.transaction_notes && (
                          <div className="mt-1 text-xs text-slate-500 italic">Note: {payment.transaction_notes}</div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeletePayment(payment.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Delete payment"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
