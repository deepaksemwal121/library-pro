import supabase from "../../../helpers/supabase";

const STORAGE_KEY = "librarypro-management";

export const defaultCategories = ["Rent", "Electricity", "Internet", "Staff", "Maintenance", "Supplies"];

export const defaultTodos = [
  {
    id: "todo-renew-internet",
    title: "Renew internet plan",
    dueDate: "",
    priority: "Medium",
    completed: false,
  },
  {
    id: "todo-check-cleaning",
    title: "Check reading room cleaning supplies",
    dueDate: "",
    priority: "Low",
    completed: false,
  },
];

export const defaultManagementData = {
  categories: defaultCategories,
  expenses: [],
  todos: defaultTodos,
};

export const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

// Load expenses from Supabase
export const loadExpensesFromDb = async () => {
  try {
    const { data, error } = await supabase.from("expenses").select("*").order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading expenses:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error loading expenses:", error);
    return [];
  }
};

// Load todos from Supabase
export const loadTodosFromDb = async () => {
  try {
    const { data, error } = await supabase.from("todos").select("*").order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading todos:", error);
      return [];
    }

    return (data || []).map((todo) => ({
      ...todo,
      dueDate: todo.due_date || "",
    }));
  } catch (error) {
    console.error("Error loading todos:", error);
    return [];
  }
};

// Save expense to Supabase
export const saveExpenseToDb = async (expense) => {
  try {
    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          title: expense.title,
          category: expense.category,
          amount: expense.amount,
          note: expense.note,
          date: new Date().toISOString().split("T")[0],
        },
      ])
      .select();

    if (error) {
      console.error("Error saving expense:", error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error("Error saving expense:", error);
    return null;
  }
};

// Delete expense from Supabase
export const deleteExpenseFromDb = async (expenseId) => {
  try {
    const { error } = await supabase.from("expenses").delete().eq("id", expenseId);

    if (error) {
      console.error("Error deleting expense:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting expense:", error);
    return false;
  }
};

// Save todo to Supabase
export const saveTodoToDb = async (todo) => {
  try {
    const { data, error } = await supabase
      .from("todos")
      .insert([
        {
          title: todo.title,
          due_date: todo.dueDate || null,
          priority: todo.priority,
          completed: false,
        },
      ])
      .select();

    if (error) {
      console.error("Error saving todo:", error);
      return null;
    }

    return data?.[0] || null;
  } catch (error) {
    console.error("Error saving todo:", error);
    return null;
  }
};

// Update todo in Supabase
export const updateTodoInDb = async (todoId, updates) => {
  try {
    const { error } = await supabase.from("todos").update(updates).eq("id", todoId);

    if (error) {
      console.error("Error updating todo:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error updating todo:", error);
    return false;
  }
};

// Delete todo from Supabase
export const deleteTodoFromDb = async (todoId) => {
  try {
    const { error } = await supabase.from("todos").delete().eq("id", todoId);

    if (error) {
      console.error("Error deleting todo:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting todo:", error);
    return false;
  }
};

export const loadManagementData = () => {
  try {
    const savedData = localStorage.getItem(STORAGE_KEY);

    if (!savedData) {
      return defaultManagementData;
    }

    return {
      ...defaultManagementData,
      ...JSON.parse(savedData),
    };
  } catch {
    return defaultManagementData;
  }
};

export const saveManagementData = (data) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};
