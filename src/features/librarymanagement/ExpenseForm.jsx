import { Plus } from "lucide-react";
import { useMemo, useState } from "react";

const initialExpense = {
  title: "",
  category: "",
  amount: "",
  date: new Date().toISOString().slice(0, 10),
  paymentMode: "Cash",
  note: "",
};

export const ExpenseForm = ({ categories, onAddCategory, onAddExpense }) => {
  const [expense, setExpense] = useState(initialExpense);
  const [newCategory, setNewCategory] = useState("");
  const selectedCategory = useMemo(() => expense.category || categories[0] || "", [categories, expense.category]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setExpense((previous) => ({ ...previous, [name]: value }));
  };

  const handleAddCategory = () => {
    const didAdd = onAddCategory(newCategory);

    if (didAdd) {
      setExpense((previous) => ({ ...previous, category: newCategory.trim() }));
      setNewCategory("");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const didAdd = onAddExpense({
      ...expense,
      category: selectedCategory,
      amount: Number(expense.amount),
    });

    if (didAdd) {
      setExpense({ ...initialExpense, category: selectedCategory });
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Add Expense</h3>
        <p className="text-sm text-slate-500">Track daily operating costs by category.</p>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Expense Name</label>
            <input
              type="text"
              name="title"
              value={expense.title}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm outline-blue-500 focus:bg-white"
              placeholder="Electricity bill"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Amount (Rs.)</label>
            <input
              type="number"
              name="amount"
              min="1"
              value={expense.amount}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm outline-blue-500 focus:bg-white"
              placeholder="0"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select
              name="category"
              value={selectedCategory}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-sm"
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              name="date"
              value={expense.date}
              onChange={handleChange}
              required
              className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Payment</label>
            <select
              name="paymentMode"
              value={expense.paymentMode}
              onChange={handleChange}
              className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-sm"
            >
              <option>Cash</option>
              <option>Online</option>
              <option>UPI</option>
              <option>Bank Transfer</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
          <input
            type="text"
            name="note"
            value={expense.note}
            onChange={handleChange}
            className="w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm outline-blue-500 focus:bg-white"
            placeholder="Optional details"
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="min-w-0 flex-1 sm:min-w-56">
            <label className="mb-1 block text-sm font-medium text-slate-700">New Category</label>
            <input
              type="text"
              value={newCategory}
              onChange={(event) => setNewCategory(event.target.value)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm outline-blue-500 focus:bg-white"
              placeholder="Water"
            />
          </div>
          <button
            type="button"
            onClick={handleAddCategory}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
          >
            <Plus size={16} />
            Category
          </button>
          <button type="submit" className="rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            Save Expense
          </button>
        </div>
      </form>
    </section>
  );
};
