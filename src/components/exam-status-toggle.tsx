"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ExamStatusToggle({
  examId,
  currentStatus,
}: {
  examId: string;
  currentStatus: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const toggleStatus = async (newStatus: string) => {
    setLoading(true);
    const { error } = await supabase
      .from("exams")
      .update({ status: newStatus })
      .eq("id", examId);

    if (error) {
      toast.error("Failed to update status");
    } else {
      setStatus(newStatus);
      toast.success(
        newStatus === "active"
          ? "Exam is now active! Students can join."
          : newStatus === "closed"
          ? "Exam is now closed."
          : "Exam saved as draft."
      );
      router.refresh();
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      {status === "draft" && (
        <button
          onClick={() => toggleStatus("active")}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
        >
          Activate
        </button>
      )}
      {status === "active" && (
        <button
          onClick={() => toggleStatus("closed")}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 transition"
        >
          Close Exam
        </button>
      )}
      {status === "closed" && (
        <button
          onClick={() => toggleStatus("active")}
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 transition"
        >
          Reactivate
        </button>
      )}
      <span
        className={`px-2.5 py-1 text-xs font-medium rounded-full ${
          status === "active"
            ? "bg-green-100 text-green-700"
            : status === "draft"
            ? "bg-gray-100 text-gray-600"
            : "bg-red-100 text-red-700"
        }`}
      >
        {status}
      </span>
    </div>
  );
}
