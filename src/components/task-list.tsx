"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addTask, setTaskStatus } from "@/app/actions/tasks";

export type TaskItem = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
};

export function TaskList({
  applicationId,
  tasks,
  locked,
}: {
  applicationId: string;
  tasks: TaskItem[];
  locked: boolean;
}) {
  const [localTasks, setLocalTasks] = useState(tasks);
  const [prevTasks, setPrevTasks] = useState(tasks);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  if (tasks !== prevTasks) {
    setPrevTasks(tasks);
    setLocalTasks(tasks);
  }

  function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);

    startTransition(async () => {
      const result = await addTask(applicationId, formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  function toggle(taskId: string, currentStatus: string) {
    const nextStatus = currentStatus === "done" ? "open" : "done";

    setLocalTasks((t) => t.map((task) => (task.id === taskId ? { ...task, status: nextStatus } : task)));
    setError(null);

    setTaskStatus(taskId, applicationId, nextStatus).then((result) => {
      if (result.error) {
        setLocalTasks((t) =>
          t.map((task) => (task.id === taskId ? { ...task, status: currentStatus } : task)),
        );
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4">
      {localTasks.length > 0 ? (
        <ul className="space-y-1 text-sm">
          {localTasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between gap-2 text-zinc-700 dark:text-zinc-300">
              <label className="flex flex-1 items-center gap-2">
                <input
                  type="checkbox"
                  checked={task.status === "done"}
                  disabled={locked}
                  onChange={() => toggle(task.id, task.status)}
                  className="accent-brand"
                />
                <span
                  className={`transition-colors ${task.status === "done" ? "text-zinc-400 dark:text-zinc-500 line-through" : ""}`}
                >
                  {task.title}
                </span>
              </label>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">{task.due_date ?? "no due date"}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">No tasks yet.</p>
      )}

      {!locked && (
        <form ref={formRef} onSubmit={handleAdd} className="mt-3 flex gap-2 border-t border-zinc-100 dark:border-zinc-700 pt-3">
          <input
            name="title"
            placeholder="New task"
            required
            className="flex-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 dark:text-zinc-400 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <input
            name="dueDate"
            type="date"
            className="rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 py-1 text-sm text-zinc-900 dark:text-zinc-100 outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-brand-dark px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-brand-dark/90 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}
      {error && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
