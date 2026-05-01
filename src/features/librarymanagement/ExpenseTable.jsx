import { Trash2 } from "lucide-react";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const ExpenseTable = ({ expenses, onDeleteExpense }) => (
  <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Expense History</h3>
        <p className="text-sm text-slate-500">Latest entries appear first.</p>
      </div>
    </div>

    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-100">
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-700">Expense</th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-700">Category</th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-700">Date</th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-700">Payment</th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-700">Amount</th>
            <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-700">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {expenses.length === 0 && (
            <tr>
              <td colSpan="6" className="px-4 py-8 text-center text-sm text-slate-500">
                No expenses recorded yet.
              </td>
            </tr>
          )}

          {expenses.map((expense, index) => (
            <tr key={expense.id} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
              <td className="px-4 py-3 text-sm text-slate-800">
                <div className="font-medium">{expense.title}</div>
                {expense.note && <div className="mt-1 text-xs text-slate-500">{expense.note}</div>}
              </td>
              <td className="px-4 py-3 text-sm text-slate-600">{expense.category}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{expense.date}</td>
              <td className="px-4 py-3 text-sm text-slate-600">{expense.paymentMode}</td>
              <td className="px-4 py-3 text-sm font-semibold text-slate-900">{currency.format(expense.amount)}</td>
              <td className="px-4 py-3 text-sm">
                <button
                  type="button"
                  aria-label={`Delete ${expense.title}`}
                  onClick={() => onDeleteExpense(expense.id)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                >
                  <Trash2 size={15} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);
