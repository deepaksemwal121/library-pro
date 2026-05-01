import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const initialTodo = {
  title: "",
  dueDate: "",
  priority: "Medium",
};

const priorityClasses = {
  High: "border-red-200 bg-red-50 text-red-700",
  Medium: "border-yellow-200 bg-yellow-50 text-yellow-800",
  Low: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

export const TodoPanel = ({ todos, onAddTodo, onToggleTodo, onDeleteTodo }) => {
  const [todo, setTodo] = useState(initialTodo);

  const handleSubmit = (event) => {
    event.preventDefault();

    const didAdd = onAddTodo(todo);

    if (didAdd) {
      setTodo(initialTodo);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900">Library To-Do</h3>
        <p className="text-sm text-slate-500">Keep operational tasks in one place.</p>
      </div>

      <form className="space-y-3 border-b border-slate-100 pb-4" onSubmit={handleSubmit}>
        <input
          type="text"
          value={todo.title}
          onChange={(event) => setTodo((previous) => ({ ...previous, title: event.target.value }))}
          required
          className="w-full rounded-md border border-slate-200 bg-slate-50 p-2.5 text-sm outline-blue-500 focus:bg-white"
          placeholder="Add a task"
        />
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_44px]">
          <input
            type="date"
            value={todo.dueDate}
            onChange={(event) => setTodo((previous) => ({ ...previous, dueDate: event.target.value }))}
            className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-sm"
          />
          <select
            value={todo.priority}
            onChange={(event) => setTodo((previous) => ({ ...previous, priority: event.target.value }))}
            className="w-full rounded-md border border-slate-200 bg-white p-2.5 text-sm"
          >
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <button
            type="submit"
            aria-label="Add task"
            className="inline-flex h-11 items-center justify-center rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            <Plus size={18} />
          </button>
        </div>
      </form>

      <div className="mt-4 space-y-3">
        {todos.length === 0 && <p className="text-sm text-slate-500">No tasks yet.</p>}

        {todos.map((item) => (
          <div key={item.id} className="flex items-start gap-3 border border-slate-200 bg-slate-50 p-3">
            <button
              type="button"
              aria-label={item.completed ? "Mark task incomplete" : "Mark task complete"}
              onClick={() => onToggleTodo(item.id)}
              className={`mt-0.5 ${item.completed ? "text-emerald-600" : "text-slate-400"}`}
            >
              {item.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>
            <div className="min-w-0 flex-1">
              <div className={`text-sm font-medium ${item.completed ? "text-slate-400 line-through" : "text-slate-800"}`}>{item.title}</div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className={`border px-2 py-0.5 font-semibold ${priorityClasses[item.priority]}`}>{item.priority}</span>
                {item.dueDate && <span className="border border-slate-200 bg-white px-2 py-0.5 text-slate-500">Due {item.dueDate}</span>}
              </div>
            </div>
            <button
              type="button"
              aria-label={`Delete ${item.title}`}
              onClick={() => onDeleteTodo(item.id)}
              className="text-slate-400 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
