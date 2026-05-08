import { ClipboardList, IndianRupee, Layers, ReceiptText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ExpenseForm } from "./ExpenseForm";
import { ExpenseSummary } from "./ExpenseSummary";
import { ExpenseTable } from "./ExpenseTable";
import { ManagementStatCard } from "./ManagementStatCard";
import { TodoPanel } from "./TodoPanel";
import {
  createId,
  loadManagementData,
  saveManagementData,
  loadExpensesFromDb,
  loadTodosFromDb,
  saveExpenseToDb,
  deleteExpenseFromDb,
  saveTodoToDb,
  updateTodoInDb,
  deleteTodoFromDb,
  defaultCategories,
} from "./libraryStorage";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export const LibraryManagement = () => {
  const [managementData, setManagementData] = useState(loadManagementData);
  const [expenses, setExpenses] = useState([]);
  const [todos, setTodos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { categories } = managementData;

  // Load data from database on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const [dbExpenses, dbTodos] = await Promise.all([loadExpensesFromDb(), loadTodosFromDb()]);
        setExpenses(dbExpenses);
        setTodos(dbTodos);
      } catch (error) {
        console.error("Error loading data:", error);
        // Fallback to localStorage
        setExpenses(managementData.expenses);
        setTodos(managementData.todos);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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

  const addExpense = async (expense) => {
    if (!expense.title.trim() || !expense.category || !expense.amount || expense.amount <= 0) {
      return false;
    }

    try {
      const savedExpense = await saveExpenseToDb(expense);

      if (savedExpense) {
        setExpenses((previous) => [savedExpense, ...previous]);
        return true;
      }
    } catch (error) {
      console.error("Error adding expense:", error);
    }

    return false;
  };

  const deleteExpense = async (expenseId) => {
    try {
      const deleted = await deleteExpenseFromDb(expenseId);

      if (deleted) {
        setExpenses((previous) => previous.filter((expense) => expense.id !== expenseId));
      }
    } catch (error) {
      console.error("Error deleting expense:", error);
    }
  };

  const addTodo = async (todo) => {
    if (!todo.title.trim()) {
      return false;
    }

    try {
      const savedTodo = await saveTodoToDb(todo);

      if (savedTodo) {
        setTodos((previous) => [
          {
            ...savedTodo,
            dueDate: savedTodo.due_date || "",
          },
          ...previous,
        ]);
        return true;
      }
    } catch (error) {
      console.error("Error adding todo:", error);
    }

    return false;
  };

  const toggleTodo = async (todoId) => {
    const todo = todos.find((t) => t.id === todoId);

    if (todo) {
      try {
        const updated = await updateTodoInDb(todoId, { completed: !todo.completed });

        if (updated) {
          setTodos((previous) => previous.map((t) => (t.id === todoId ? { ...t, completed: !t.completed } : t)));
        }
      } catch (error) {
        console.error("Error updating todo:", error);
      }
    }
  };

  const deleteTodo = async (todoId) => {
    try {
      const deleted = await deleteTodoFromDb(todoId);

      if (deleted) {
        setTodos((previous) => previous.filter((todo) => todo.id !== todoId));
      }
    } catch (error) {
      console.error("Error deleting todo:", error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Library Management</h2>
          <p className="mt-1 text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

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
