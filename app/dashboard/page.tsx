'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Todo {
  id: number;
  title: string;
  description?: string;
  completed: number;
  priority: 'high' | 'medium' | 'low';
  due_date?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [username, setUsername] = useState('');
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [dueDate, setDueDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('data');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/api/auth/check');
        if (response.ok) {
          const session = await response.json();
          setUsername(session.username);
        } else {
          router.push('/');
          return;
        }

        const todosResponse = await fetch('/api/todos');
        if (todosResponse.ok) {
          const data = await todosResponse.json();
          setTodos(data);
        }
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  const handleAddTodo = async () => {
    if (!newTodoTitle.trim()) return;

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTodoTitle,
          priority,
          description: '',
          due_date: dueDate || null,
        }),
      });

      if (response.ok) {
        const newTodo = await response.json();
        setTodos([newTodo, ...todos]);
        setNewTodoTitle('');
        setPriority('medium');
        setDueDate('');
      }
    } catch (error) {
      console.error('Failed to create todo:', error);
    }
  };

  const toggleTodo = async (id: number, completed: number) => {
    try {
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: completed === 1 ? 0 : 1 }),
      });

      if (response.ok) {
        setTodos(todos.map(t => t.id === id ? { ...t, completed: completed === 1 ? 0 : 1 } : t));
      }
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/');
  };

  const filteredTodos = todos.filter(todo => {
    const matchesSearch = todo.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || todo.priority === priorityFilter;
    return matchesSearch && matchesPriority;
  });

  const getPriorityColor = (p: string) => {
    switch (p) {
      case 'high': return 'bg-red-500/20 text-red-300 border border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
      case 'low': return 'bg-green-500/20 text-green-300 border border-green-500/30';
      default: return '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Todo App</h1>
            <p className="text-sm text-slate-400">Welcome, {username}</p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('data')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'data'
                  ? 'bg-slate-700 text-white'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              ⋮ Data
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'calendar'
                  ? 'bg-purple-600 text-white'
                  : 'bg-purple-600/50 text-purple-200 hover:bg-purple-600'
              }`}
            >
              📅 Calendar
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                activeTab === 'templates'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600/50 text-blue-200 hover:bg-blue-600'
              }`}
            >
              📋 Templates
            </button>
            <button className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-medium transition">
              🔔
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-medium transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Add Todo Form */}
        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-6 mb-8">
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
            placeholder="Add a new todo..."
            className="w-full bg-slate-700/30 border border-slate-600/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 mb-4 transition"
          />

          <div className="flex gap-3 mb-4">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="bg-slate-700/50 border border-slate-600/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-slate-500 transition"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="bg-slate-700/50 border border-slate-600/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-slate-500 transition"
            />

            <button
              onClick={handleAddTodo}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-2 rounded-lg transition ml-auto"
            >
              Add
            </button>
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium transition"
          >
            {showAdvanced ? '▼' : '▶'} Show Advanced Options
          </button>

          {showAdvanced && (
            <div className="mt-4 pt-4 border-t border-slate-600/30">
              <p className="text-slate-400 text-sm">Advanced options coming soon...</p>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 Search todos and subtasks..."
              className="w-full bg-slate-700/30 border border-slate-600/30 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-slate-500 transition"
            />
          </div>

          <div className="flex gap-3">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-700/50 border border-slate-600/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-slate-500 transition"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <button className="bg-slate-700/50 hover:bg-slate-700 border border-slate-600/30 text-white px-4 py-2 rounded-lg font-medium transition">
              ▶ Advanced
            </button>
          </div>
        </div>

        {/* Todos List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center text-slate-400 py-12">Loading todos...</div>
          ) : filteredTodos.length === 0 ? (
            <div className="text-center text-slate-400 py-12 bg-slate-800/30 rounded-lg border border-slate-700/30">
              <p className="text-lg">No todos yet. Add one above!</p>
            </div>
          ) : (
            filteredTodos.map((todo) => (
              <div
                key={todo.id}
                className="bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-lg p-4 hover:border-slate-600/50 transition hover:bg-slate-800/70 group"
              >
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={todo.completed === 1}
                    onChange={() => toggleTodo(todo.id, todo.completed)}
                    className="w-5 h-5 rounded cursor-pointer accent-blue-500"
                  />
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        todo.completed === 1
                          ? 'line-through text-slate-500'
                          : 'text-white'
                      }`}
                    >
                      {todo.title}
                    </p>
                    {todo.description && (
                      <p className="text-sm text-slate-400 mt-1">{todo.description}</p>
                    )}
                    {todo.due_date && (
                      <p className="text-xs text-slate-500 mt-2">Due: {todo.due_date}</p>
                    )}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${getPriorityColor(todo.priority)}`}>
                    {todo.priority.charAt(0).toUpperCase() + todo.priority.slice(1)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
