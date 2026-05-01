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
