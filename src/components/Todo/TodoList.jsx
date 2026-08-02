import { useTodo } from '../../context/TodoContext'
import TodoItem from './TodoItem'

export default function TodoList() {
  const { filteredTodos, state, backlogTodos } = useTodo()

  if (filteredTodos.length === 0) {
    const hasAnyTodos = state.todos.length > 0
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <p className="text-slate-600 dark:text-slate-300 font-medium">
          {hasAnyTodos ? 'No tasks match your filters' : 'No tasks yet'}
        </p>
        <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
          {hasAnyTodos ? 'Try adjusting your search or filters' : 'Add your first task to get started'}
        </p>
      </div>
    )
  }

  const active = filteredTodos.filter(t => !t.completed)
  const completed = filteredTodos.filter(t => t.completed)
  const showBacklog = state.filter.view === 'today' && backlogTodos && backlogTodos.length > 0

  return (
    <div className="space-y-2">
      {active.map(todo => <TodoItem key={todo.id} todo={todo} />)}
      {showBacklog && (
        <>
          <p className="text-xs font-medium text-amber-300 dark:text-amber-300 pt-2 pb-1">Backlog</p>
          {backlogTodos.map(todo => (
            <TodoItem key={todo.id} todo={todo} />
          ))}
        </>
      )}
      {completed.length > 0 && (
        <>
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500 pt-2 pb-1">
            Completed ({completed.length})
          </p>
          {completed.map(todo => <TodoItem key={todo.id} todo={todo} />)}
        </>
      )}
    </div>
  )
}
