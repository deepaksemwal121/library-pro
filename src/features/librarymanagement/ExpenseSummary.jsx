const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const ExpenseSummary = ({ categoryTotals }) => (
  <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-slate-900">Category Spend</h3>
      <p className="text-sm text-slate-500">Expense split across library operations.</p>
    </div>

    <div className="space-y-3">
      {categoryTotals.length === 0 && <p className="text-sm text-slate-500">No expenses added yet.</p>}

      {categoryTotals.map((item) => (
        <div key={item.category}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">{item.category}</span>
            <span className="font-semibold text-slate-900">{currency.format(item.total)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-blue-600" style={{ width: `${item.percentage}%` }} />
          </div>
        </div>
      ))}
    </div>
  </section>
);
