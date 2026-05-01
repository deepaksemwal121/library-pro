import { Search, X } from "lucide-react";
import { useState } from "react";

export const SearchBar = ({ placeholder, value, onChange }) => {
  const [localQuery, setLocalQuery] = useState("");
  const query = value ?? localQuery;

  const updateQuery = (nextQuery) => {
    if (onChange) {
      onChange(nextQuery);
      return;
    }

    setLocalQuery(nextQuery);
  };

  return (
    <div className="relative w-full max-w-md group">
      {/* Search Icon */}
      <Search
        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors"
        size={18}
      />

      <input
        type="text"
        value={query}
        onChange={(e) => updateQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 "
      />

      {/* Clear Button */}
      {query && (
        <button
          type="button"
          onClick={() => updateQuery("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
};
