import { ClipboardList, IndianRupee, Layers, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseSummary } from "./ExpenseSummary";
import { ExpenseTable } from "./ExpenseTable";
import { ManagementStatCard } from "./ManagementStatCard";
import { TodoPanel } from "./TodoPanel";
import { createId, loadManagementData, saveManagementData } from "./libraryStorage";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const LibraryManagement = () => {
  const [managementData, setManagementData] = useState(loadManagementData);
  const { categories, expenses, todos } = managementData;

  useEffect(() => {
    saveManagementData(managementData);
  }, [managementData]);

  const totalExpense = useMemo(() => expenses.reduce((total, expense) => total + Number(expense.amount), 0), [expenses]);
  const pendingTodos = useMemo(() => todos.filter((todo) => !todo.completed).length, [todos]);
  const highestCategory = useMemo(() => {
    const totals = expenses.reduce((result, expense) => {
      result[expense.category] = (result[expense.category] || 0) + Number(expense.amount);
      return result;
    }, {});

    return Object.entries(totals).sort((first, second) => second[1] - first[1])[0]?.[0] || "None";
  }, [expenses]);

  const categoryTotals = useMemo(() => {
    const totals = expenses.reduce((result, expense) => {
      result[expense.category] = (result[expense.category] || 0) + Number(expense.amount);
      return result;
    }, {});

    return Object.entries(totals)
      .map(([category, total]) => ({
        category,
        total,
        percentage: totalExpense ? Math.max(6, Math.round((total / totalExpense) * 100)) : 0,
      }))
      .sort((first, second) => second.total - first.total);
  }, [expenses, totalExpense]);

  const addCategory = (categoryName) => {
    const normalizedCategory = categoryName.trim();

    if (!normalizedCategory || categories.some((category) => category.toLowerCase() === normalizedCategory.toLowerCase())) {
      return false;
    }

    setManagementData((previous) => ({
      ...previous,
      categories: [...previous.categories, normalizedCategory],
    }));
    return true;
  };

  const addExpense = (expense) => {
    if (!expense.title.trim() || !expense.category || !expense.amount || expense.amount <= 0) {
      return false;
    }

    setManagementData((previous) => ({
      ...previous,
      expenses: [
        {
          ...expense,
          id: createId(),
          title: expense.title.trim(),
          note: expense.note.trim(),
        },
        ...previous.expenses,
      ],
    }));
    return true;
  };

  const deleteExpense = (expenseId) => {
    setManagementData((previous) => ({
      ...previous,
      expenses: previous.expenses.filter((expense) => expense.id !== expenseId),
    }));
  };

  const addTodo = (todo) => {
    if (!todo.title.trim()) {
      return false;
    }

    setManagementData((previous) => ({
      ...previous,
      todos: [
        {
          ...todo,
          id: createId(),
          title: todo.title.trim(),
          completed: false,
        },
        ...previous.todos,
      ],
    }));
    return true;
  };

  const toggleTodo = (todoId) => {
    setManagementData((previous) => ({
      ...previous,
      todos: previous.todos.map((todo) => (todo.id === todoId ? { ...todo, completed: !todo.completed } : todo)),
    }));
  };

  const deleteTodo = (todoId) => {
    setManagementData((previous) => ({
      ...previous,
      todos: previous.todos.filter((todo) => todo.id !== todoId),
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Library Management</h2>
        <p className="mt-1 text-sm text-slate-500">Manage expenses, categories, and daily library tasks.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ManagementStatCard
          title="Total Expense"
          value={currency.format(totalExpense)}
          helper="All recorded costs"
          icon={<IndianRupee size={20} />}
          color="bg-blue-500"
        />
        <ManagementStatCard
          title="Categories"
          value={categories.length}
          helper="Active expense groups"
          icon={<Layers size={20} />}
          color="bg-emerald-500"
        />
        <ManagementStatCard
          title="Expense Entries"
          value={expenses.length}
          helper="Saved transactions"
          icon={<ReceiptText size={20} />}
          color="bg-amber-500"
        />
        <ManagementStatCard
          title="Pending Tasks"
          value={pendingTodos}
          helper="Open library todos"
          icon={<ClipboardList size={20} />}
          color="bg-rose-500"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <div className="space-y-6">
          <ExpenseForm categories={categories} onAddCategory={addCategory} onAddExpense={addExpense} />
          <ExpenseTable expenses={expenses} onDeleteExpense={deleteExpense} />
        </div>

        <div className="space-y-6">
          <ExpenseSummary categoryTotals={categoryTotals} />
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Highest Spend</h3>
            <p className="mt-2 text-2xl font-bold text-slate-900">{highestCategory}</p>
            <p className="mt-1 text-sm text-slate-500">Based on your current expense records.</p>
          </section>
          <TodoPanel todos={todos} onAddTodo={addTodo} onToggleTodo={toggleTodo} onDeleteTodo={deleteTodo} />
        </div>
      </div>
    </div>
  );
};
